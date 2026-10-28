
import { Router } from 'express';
import mongoose from 'mongoose';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';

import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

import {
  protect,
  requireRole,
} from '../middleware/authMiddleware.js';

const router = Router();

// Configure image uploads: maximum 5 images, 5 MB each.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPG, PNG, and WebP images are allowed.')
      );
    }

    callback(null, true);
  },
});

// Return a clear error when an uploaded file is invalid.
function handleReportUploads(req, res, next) {
  upload.array('images', 5)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next();
  });
}

// Upload one image to Cloudinary and return its URL.
function uploadImageToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'locallens/reports',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
}

// Create a notification without breaking a successful report operation, and push via socket.io if available.
async function createUserNotification(notificationData, io = null) {
  try {
    const notification = await Notification.create(notificationData);
    if (io && notificationData.recipient) {
      io.to(`user:${notificationData.recipient.toString()}`).emit(
        'notification',
        notification
      );
    }
    return notification;
  } catch (error) {
    console.error('Create notification error:', error.message);
  }
}

// Validate express-validator results.
function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  next();
}

// Notification details for each supported report status.
function getStatusNotification(status, title) {
  const notifications = {
    verified: {
      type: 'report-verified',
      title: 'Report verified',
      message: `Your report "${title}" has been verified.`,
    },
    'in-progress': {
      type: 'report-in-progress',
      title: 'Work in progress',
      message: `Work has started on your report "${title}".`,
    },
    resolved: {
      type: 'report-resolved',
      title: 'Report resolved',
      message: `Your report "${title}" has been resolved.`,
    },
    rejected: {
      type: 'report-rejected',
      title: 'Report rejected',
      message: `Your report "${title}" has been rejected.`,
    },
  };

  return notifications[status];
}

// 1. Create a community problem report, optionally with images.
router.post(
  '/',
  protect,
  handleReportUploads,
  [
    body('title')
      .trim()
      .isLength({ min: 5, max: 120 })
      .withMessage('Title must be between 5 and 120 characters.'),

    body('description')
      .trim()
      .isLength({ min: 10, max: 3000 })
      .withMessage('Description must be between 10 and 3000 characters.'),

    body('category')
      .isIn([
        'garbage',
        'roads',
        'water',
        'electricity',
        'streetlight',
        'drainage',
        'public-safety',
        'other',
      ])
      .withMessage('Please select a valid category.'),

    body().custom((_, { req }) => {
      const coordinates = req.body.location?.coordinates;

      const latitude =
        req.body.latitude !== undefined
          ? Number(req.body.latitude)
          : Number(coordinates?.[1]);

      const longitude =
        req.body.longitude !== undefined
          ? Number(req.body.longitude)
          : Number(coordinates?.[0]);

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error('Valid latitude and longitude are required.');
      }

      return true;
    }),

    body('address')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Address cannot exceed 300 characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array(),
      });
    }

    try {
      // Accept either multipart latitude/longitude fields
      // or the existing JSON location.coordinates format.
      const coordinates = req.body.location?.coordinates;

      const latitude =
        req.body.latitude !== undefined
          ? Number(req.body.latitude)
          : Number(coordinates?.[1]);

      const longitude =
        req.body.longitude !== undefined
          ? Number(req.body.longitude)
          : Number(coordinates?.[0]);

      // Upload selected images to Cloudinary.
      const images = await Promise.all(
        (req.files || []).map(uploadImageToCloudinary)
      );

      const rawTeamSize = Number(req.body.requiredTeamSize);
      const requiredTeamSize =
        Number.isInteger(rawTeamSize) && rawTeamSize >= 1 && rawTeamSize <= 50
          ? rawTeamSize
          : 1;
      const assignmentType =
        req.body.assignmentType === 'team' || requiredTeamSize > 1
          ? 'team'
          : 'single';

      const report = await Report.create({
        reporter: req.user._id,
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        category: req.body.category,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        address: req.body.address?.trim() || '',
        images,
        status: 'pending',
        requiredTeamSize,
        assignmentType,
        statusHistory: [
          {
            status: 'pending',
            changedBy: req.user._id,
            note: 'Report submitted.',
          },
        ],
      });

      const io = req.app.get('io');

      await createUserNotification({
        recipient: req.user._id,
        type: 'report-submitted',
        title: 'Report submitted',
        message: `Your report "${report.title}" has been submitted.`,
        report: report._id,
      }, io);

      if (io) {
        io.emit('report:created', {
          reportId: report._id,
          title: report.title,
          category: report.category,
          priority: report.priority,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Report submitted successfully.',
        report,
      });
    } catch (error) {
      console.error('Create report error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to create report right now.',
      });
    }
  }
);

// 2. Get reports with optional filters and pagination.
router.get(
  '/',
  [
    query('category')
      .optional()
      .isIn([
        'garbage',
        'roads',
        'water',
        'electricity',
        'streetlight',
        'drainage',
        'public-safety',
        'other',
      ]),

    query('status')
      .optional()
      .isIn([
        'pending',
        'verified',
        'assigned',
        'in-progress',
        'resolved',
        'rejected',
      ]),

    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const filters = {};

      if (req.query.category) {
        filters.category = req.query.category;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      const [reports, total] = await Promise.all([
        Report.find(filters)
          .populate('reporter', 'name role')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Report.countDocuments(filters),
      ]);

      return res.json({
        success: true,
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get reports error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to fetch reports right now.',
      });
    }
  }
);

// 3. Get reports created by the logged-in user.
router.get('/mine', protect, async (req, res) => {
  try {
    const reports = await Report.find({
      reporter: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Get my reports error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch your reports right now.',
    });
  }
});

// 4. Get reports assigned to the logged-in volunteer.
router.get(
  '/assigned',
  protect,
  requireRole('volunteer'),
  async (req, res) => {
    try {
      const reports = await Report.find({
        assignedVolunteer: req.user._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        count: reports.length,
        reports,
      });
    } catch (error) {
      console.error('Get assigned reports error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to fetch assigned reports right now.',
      });
    }
  }
);

/* GET /api/reports/analytics
   Admin-only statistics calculated from the entire reports collection.
*/
router.get(
  '/analytics',
  protect,
  requireRole('admin'),
  async (req, res) => {
    try {
      const now = new Date();
      const currentMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );

      // Include the current month and previous five months.
      const firstMonth = new Date(
        Date.UTC(
          currentMonth.getUTCFullYear(),
          currentMonth.getUTCMonth() - 5,
          1
        )
      );

      const [
        totalReports,
        statusCounts,
        categoryCounts,
        priorityCounts,
        monthlyResults,
        monthlyResolvedResults,
        resolutionResults,
        teamStats,
      ] = await Promise.all([
        Report.countDocuments(),

        Report.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        Report.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        Report.aggregate([
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 },
            },
          },
        ]),

        Report.aggregate([
          {
            $match: {
              createdAt: { $gte: firstMonth },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),

        Report.aggregate([
          {
            $match: {
              status: 'resolved',
              resolvedAt: { $gte: firstMonth },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$resolvedAt' },
                month: { $month: '$resolvedAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),

        Report.aggregate([
          {
            $match: {
              status: 'resolved',
              resolvedAt: { $ne: null },
              createdAt: { $ne: null },
            },
          },
          {
            $project: {
              resolutionHours: {
                $divide: [
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  1000 * 60 * 60,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageHours: { $avg: '$resolutionHours' },
              resolvedCount: { $sum: 1 },
            },
          },
        ]),

        Report.aggregate([
          {
            $group: {
              _id: '$assignmentType',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const statuses = [
        'pending',
        'verified',
        'assigned',
        'in-progress',
        'resolved',
        'rejected',
      ];

      const statusMap = Object.fromEntries(
        statusCounts.map((item) => [item._id, item.count])
      );

      const priorityMap = Object.fromEntries(
        priorityCounts.map((item) => [item._id || 'medium', item.count])
      );

      const monthlyMap = new Map(
        monthlyResults.map((item) => [
          `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          item.count,
        ])
      );

      const monthlyResolvedMap = new Map(
        monthlyResolvedResults.map((item) => [
          `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          item.count,
        ])
      );

      const monthlyReports = [];

      for (let offset = 0; offset < 6; offset += 1) {
        const date = new Date(
          Date.UTC(
            firstMonth.getUTCFullYear(),
            firstMonth.getUTCMonth() + offset,
            1
          )
        );

        const key = `${date.getUTCFullYear()}-${String(
          date.getUTCMonth() + 1
        ).padStart(2, '0')}`;

        monthlyReports.push({
          month: key,
          reports: monthlyMap.get(key) || 0,
          resolved: monthlyResolvedMap.get(key) || 0,
        });
      }

      const resolution = resolutionResults[0] || {
        averageHours: null,
        resolvedCount: 0,
      };

      const teamMap = Object.fromEntries(
        teamStats.map((item) => [item._id || 'single', item.count])
      );

      return res.json({
        success: true,
        analytics: {
          totalReports,
          statusCounts: Object.fromEntries(
            statuses.map((status) => [
              status,
              statusMap[status] || 0,
            ])
          ),
          categoryCounts: categoryCounts.map((item) => ({
            category: item._id,
            count: item.count,
          })),
          priorityCounts: {
            urgent: priorityMap.urgent || 0,
            high: priorityMap.high || 0,
            medium: priorityMap.medium || 0,
            low: priorityMap.low || 0,
          },
          monthlyReports,
          resolution: {
            resolvedCount: resolution.resolvedCount,
            averageHours:
              resolution.averageHours === null
                ? null
                : Math.round(resolution.averageHours * 100) / 100,
          },
          teamDeployments: {
            single: teamMap.single || 0,
            team: teamMap.team || 0,
          },
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Report analytics error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load report analytics.',
      });
    }
  }
);

// 5. Get a single report by ID, including status-history user names.
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID.',
      });
    }

    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name role')
      .populate('assignedVolunteer', 'name profileImage')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Get report error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch report right now.',
    });
  }
});

// 6. Assign a volunteer or team of volunteers to a verified report.
router.patch(
  '/:id/assign',
  protect,
  requireRole('admin'),
  [
    body('volunteerId')
      .optional()
      .isMongoId()
      .withMessage('A valid volunteer ID is required.'),
    body('volunteerIds')
      .optional()
      .isArray()
      .withMessage('volunteerIds must be an array of IDs.'),
    body('requiredTeamSize')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('requiredTeamSize must be between 1 and 50.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { volunteerId, volunteerIds, requiredTeamSize: rawTeamSize } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report ID.',
        });
      }

      const report = await Report.findById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found.',
        });
      }

      if (report.status !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Only verified reports can be assigned.',
        });
      }

      // Collect target volunteer IDs
      let targetIds = [];
      if (Array.isArray(volunteerIds) && volunteerIds.length > 0) {
        targetIds = volunteerIds.filter((vId) => mongoose.isValidObjectId(vId));
      } else if (volunteerId && mongoose.isValidObjectId(volunteerId)) {
        targetIds = [volunteerId];
      }

      if (targetIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least one valid volunteer ID to assign.',
        });
      }

      const volunteers = await User.find({
        _id: { $in: targetIds },
        role: 'volunteer',
        isActive: true,
      });

      if (!volunteers || volunteers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active volunteers found with the provided IDs.',
        });
      }

      const targetTeamSize = rawTeamSize
        ? Math.max(1, Math.min(50, Number(rawTeamSize)))
        : Math.max(report.requiredTeamSize || 1, volunteers.length);

      const leadVolunteer = volunteers[0];
      report.assignedVolunteer = leadVolunteer._id;
      report.teamCoordinator = leadVolunteer._id;
      report.requiredTeamSize = targetTeamSize;
      report.assignmentType =
        targetTeamSize > 1 || volunteers.length > 1 ? 'team' : 'single';
      report.status = 'assigned';

      // Build team members
      report.teamMembers = volunteers.map((vol, index) => ({
        user: vol._id,
        role: index === 0 ? 'lead' : 'member',
        joinedAt: new Date(),
      }));

      report.recruitmentStatus =
        report.teamMembers.length >= targetTeamSize
          ? 'full'
          : targetTeamSize > 1
            ? 'open'
            : 'none';

      const volunteerNames = volunteers.map((v) => v.name).join(', ');
      report.statusHistory.push({
        status: 'assigned',
        changedBy: req.user._id,
        note: `Assigned ${volunteers.length} volunteer(s) [${volunteerNames}] with required team size of ${targetTeamSize} by administrator.`,
      });

      await report.save();

      const io = req.app.get('io');

      // Send notifications to each assigned volunteer
      for (const vol of volunteers) {
        await createUserNotification(
          {
            recipient: vol._id,
            report: report._id,
            type: 'report-assigned',
            title: 'New report assigned',
            message: `You have been assigned to the report "${report.title}".`,
          },
          io
        );
      }

      // Notify citizen reporter
      await createUserNotification(
        {
          recipient: report.reporter,
          report: report._id,
          type: 'report-assigned',
          title: 'Volunteer team assigned',
          message: `${
            volunteers.length > 1
              ? `${volunteers.length} volunteers have`
              : 'A volunteer has'
          } been assigned to your report "${report.title}".`,
        },
        io
      );

      if (io) {
        io.emit('report:updated', {
          reportId: report._id,
          status: report.status,
          assignedVolunteer: leadVolunteer._id,
          teamMembersCount: volunteers.length,
          requiredTeamSize: targetTeamSize,
        });
      }

      return res.json({
        success: true,
        message: `${volunteers.length} volunteer(s) assigned successfully.`,
        report,
      });
    } catch (error) {
      console.error('Assign volunteer error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to assign volunteer right now.',
      });
    }
  }
);

// 7. Update a report's status.
router.patch(
  '/:id/status',
  protect,
  [
    body('status')
      .isIn(['verified', 'in-progress', 'resolved', 'rejected'])
      .withMessage('Invalid report status.'),

    body('note')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('The note cannot exceed 500 characters.'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note = '' } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report ID.',
        });
      }

      const report = await Report.findById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found.',
        });
      }

      const isAdmin = req.user.role === 'admin';

      const isAssignedVolunteer =
        req.user.role === 'volunteer' &&
        report.assignedVolunteer?.toString() ===
          req.user._id.toString();

      if (!isAdmin && !isAssignedVolunteer) {
        return res.status(403).json({
          success: false,
          message: 'You cannot update this report.',
        });
      }

      const allowedTransitions = {
        pending: ['verified', 'rejected'],
        verified: ['rejected'],
        assigned: ['in-progress', 'rejected'],
        'in-progress': ['resolved', 'rejected'],
        resolved: [],
        rejected: [],
      };

      if (
        isAssignedVolunteer &&
        !['in-progress', 'resolved'].includes(status)
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Volunteers can only mark assigned reports in progress or resolved.',
        });
      }

      if (!allowedTransitions[report.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${report.status} to ${status}.`,
        });
      }

      if (status === 'resolved' && !note.trim()) {
        return res.status(400).json({
          success: false,
          message:
            'Provide a resolution note before resolving the report.',
        });
      }

      report.status = status;

      if (status === 'resolved') {
        report.resolutionNote = note.trim();
        report.resolvedAt = new Date();
      }

      report.statusHistory.push({
        status,
        changedBy: req.user._id,
        note: note.trim(),
      });

      await report.save();

      const io = req.app.get('io');
      const notification = getStatusNotification(
        status,
        report.title
      );

      if (notification) {
        await createUserNotification({
          recipient: report.reporter,
          report: report._id,
          ...notification,
        }, io);
      }

      if (io) {
        io.emit('report:updated', {
          reportId: report._id,
          status: report.status,
          resolutionNote: report.resolutionNote,
        });
      }

      return res.json({
        success: true,
        message: 'Report status updated successfully.',
        report,
      });
    } catch (error) {
      console.error('Update report status error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to update report status right now.',
      });
    }
  }
);

export default router;
