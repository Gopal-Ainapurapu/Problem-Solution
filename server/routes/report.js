
import { Router } from 'express';
import mongoose from 'mongoose';
import { body, query, validationResult } from 'express-validator';

import Report from '../models/Report.js';
import {
  protect,
  requireRole
} from '../middleware/authMiddleware.js';

const router = Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  next();
}

// 1. Create a community problem report
router.post(
  '/',
  protect,
  [
    body('title')
      .trim()
      .isLength({ min: 5, max: 120 })
      .withMessage('Title must contain 5–120 characters.'),

    body('description')
      .trim()
      .isLength({ min: 10, max: 3000 })
      .withMessage('Description must contain 10–3000 characters.'),

    body('category')
      .isIn([
        'garbage',
        'roads',
        'water',
        'electricity',
        'streetlight',
        'drainage',
        'public-safety',
        'other'
      ])
      .withMessage('Invalid report category.'),

    body('location.coordinates')
      .isArray({ min: 2, max: 2 })
      .withMessage('Location must contain longitude and latitude.'),

    body('location.coordinates.*')
      .isFloat()
      .withMessage('Coordinates must be numbers.'),

    body('address')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Address cannot exceed 300 characters.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { title, description, category, location, address } = req.body;

      const [longitude, latitude] = location.coordinates;

      if (
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid longitude or latitude.'
        });
      }

      const report = await Report.create({
        reporter: req.user._id,
        title,
        description,
        category,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        address
      });

      return res.status(201).json({
        success: true,
        message: 'Community report created successfully.',
        report
      });
    } catch (error) {
      console.error('Create report error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to create report right now.'
      });
    }
  }
);

// 2. Get reports with optional filters and pagination
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
        'other'
      ]),

    query('status')
      .optional()
      .isIn([
        'pending',
        'verified',
        'assigned',
        'in-progress',
        'resolved',
        'rejected'
      ]),

    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
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

        Report.countDocuments(filters)
      ]);

      return res.json({
        success: true,
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get reports error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to fetch reports right now.'
      });
    }
  }
);

// 3. Get reports created by the logged-in user
router.get('/mine', protect, async (req, res) => {
  try {
    const reports = await Report.find({
      reporter: req.user._id
    }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get my reports error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch your reports right now.'
    });
  }
});

// 4. Get a single report by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID.'
      });
    }

    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name role')
      .populate('assignedVolunteer', 'name profileImage')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Get report error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch report right now.'
    });
  }
});


/* Assign a volunteer to a verified report */
router.patch(
  '/:id/assign',
  protect,
  requireRole('admin'),
  [
    body('volunteerId')
      .isMongoId()
      .withMessage('A valid volunteer ID is required.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { volunteerId } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report ID.'
        });
      }

      const report = await Report.findById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found.'
        });
      }

      if (report.status !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Only verified reports can be assigned.'
        });
      }

      const User = (await import('../models/User.js')).default;

      const volunteer = await User.findOne({
        _id: volunteerId,
        role: 'volunteer',
        isActive: true
      });

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message: 'Active volunteer not found.'
        });
      }

      report.assignedVolunteer = volunteer._id;
      report.status = 'assigned';

      report.statusHistory.push({
        status: 'assigned',
        changedBy: req.user._id,
        note: 'Volunteer assigned by administrator.'
      });

      await report.save();

      return res.json({
        success: true,
        message: 'Volunteer assigned successfully.',
        report
      });
    } catch (error) {
      console.error('Assign volunteer error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to assign volunteer right now.'
      });
    }
  }
);

/* Update a report's status */
console.log('Report status PATCH route registered');
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
      .withMessage('The note cannot exceed 500 characters.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note = '' } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report ID.'
        });
      }

      const report = await Report.findById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found.'
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
          message: 'You cannot update this report.'
        });
      }

      const allowedTransitions = {
        pending: ['verified', 'rejected'],
        verified: ['rejected'],
        assigned: ['in-progress', 'rejected'],
        'in-progress': ['resolved', 'rejected'],
        resolved: [],
        rejected: []
      };

      if (isAssignedVolunteer &&
          !['in-progress', 'resolved'].includes(status)) {
        return res.status(403).json({
          success: false,
          message: 'Volunteers can only mark assigned reports in progress or resolved.'
        });
      }

      if (!allowedTransitions[report.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${report.status} to ${status}.`
        });
      }

      if (status === 'resolved' && !note.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Provide a resolution note before resolving the report.'
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
        note: note.trim()
      });

      await report.save();

      return res.json({
        success: true,
        message: 'Report status updated successfully.',
        report
      });
    } catch (error) {
      console.error('Update report status error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to update report status right now.'
      });
    }
  }
);


export default router;
