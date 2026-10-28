import { Router } from 'express';
import mongoose from 'mongoose';
import { body, query, validationResult } from 'express-validator';

import Report from '../models/Report.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import VolunteerRequest from '../models/VolunteerRequest.js';
import TeamInvitation from '../models/TeamInvitation.js';
import TeamMessage from '../models/TeamMessage.js';

import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Distance helper (Haversine formula in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Notification & Socket helper
async function notifyUser(io, { recipient, report, type, title, message }) {
  try {
    const notif = await Notification.create({
      recipient,
      report,
      type,
      title,
      message,
    });
    if (io) {
      io.to(`user:${recipient.toString()}`).emit('notification', notif);
    }
    return notif;
  } catch (err) {
    console.error('Team notification error:', err.message);
  }
}

// Check if user is authorized to access a private team workspace
function isTeamAuthorized(report, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (
    report.teamCoordinator &&
    report.teamCoordinator.toString() === user._id.toString()
  ) {
    return true;
  }
  return report.teamMembers.some(
    (m) =>
      m.user?.toString() === user._id.toString() ||
      m.user?._id?.toString() === user._id.toString()
  );
}

// Validation handler
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

// -------------------------------------------------------------
// 1. Available Community Tasks (for Volunteers & Admins)
// -------------------------------------------------------------
router.get('/available-tasks', protect, async (req, res, next) => {
  try {
    const { category, priority, search, limit = 50, lat, lng } = req.query;

    const queryFilter = {
      status: { $in: ['pending', 'verified', 'assigned', 'in-progress'] },
    };

    if (category && category !== 'all') {
      queryFilter.category = category;
    }
    if (priority && priority !== 'all') {
      queryFilter.priority = priority;
    }
    if (search) {
      queryFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const reports = await Report.find(queryFilter)
      .populate('reporter', 'name')
      .populate('assignedVolunteer', 'name')
      .populate('teamCoordinator', 'name')
      .populate('teamMembers.user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Get current volunteer requests & invitations for quick frontend tagging
    const myRequests = await VolunteerRequest.find({
      volunteer: req.user._id,
    }).lean();

    const myInvitations = await TeamInvitation.find({
      volunteer: req.user._id,
    }).lean();

    const requestMap = new Map(
      myRequests.map((r) => [r.report.toString(), r.status])
    );
    const inviteMap = new Map(
      myInvitations.map((i) => [i.report.toString(), i.status])
    );

    const userLat = lat ? Number(lat) : req.user.location?.coordinates?.[1];
    const userLng = lng ? Number(lng) : req.user.location?.coordinates?.[0];

    const results = reports.map((r) => {
      let distanceKm = null;
      if (
        userLat != null &&
        userLng != null &&
        r.location?.coordinates?.length === 2
      ) {
        distanceKm = calculateDistance(
          userLat,
          userLng,
          r.location.coordinates[1],
          r.location.coordinates[0]
        );
      }

      const isMember = (r.teamMembers || []).some(
        (m) => m.user?._id?.toString() === req.user._id.toString()
      );
      const isAssigned =
        r.assignedVolunteer?._id?.toString() === req.user._id.toString();

      return {
        ...r,
        distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
        myRequestStatus: requestMap.get(r._id.toString()) || null,
        myInviteStatus: inviteMap.get(r._id.toString()) || null,
        isMember,
        isAssigned,
      };
    });

    res.json({ success: true, tasks: results });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. Volunteer Requests Assignment on a Report
// -------------------------------------------------------------
router.post(
  '/request/:reportId',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('note')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Note must be less than 500 characters.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { note = '' } = req.body;

      if (!mongoose.isValidObjectId(reportId)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid report ID.' });
      }

      const user = await User.findById(req.user._id);
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account is inactive. Please contact support.',
        });
      }
      if (!user.isAvailable) {
        return res.status(403).json({
          success: false,
          message:
            'You must mark yourself available in your profile to request tasks.',
        });
      }

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      if (['resolved', 'rejected'].includes(report.status)) {
        return res.status(400).json({
          success: false,
          message: 'This report has already been closed or rejected.',
        });
      }

      // Check if volunteer is already assigned or already a confirmed member
      if (
        report.assignedVolunteer &&
        report.assignedVolunteer.toString() === user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: 'You are already assigned to this report.',
        });
      }

      const alreadyInTeam = report.teamMembers.some(
        (m) => m.user.toString() === user._id.toString()
      );
      if (alreadyInTeam) {
        return res.status(400).json({
          success: false,
          message: 'You are already a confirmed member of this task team.',
        });
      }

      // Check existing pending request
      const existingRequest = await VolunteerRequest.findOne({
        report: report._id,
        volunteer: user._id,
        status: 'pending',
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending request for this report.',
        });
      }

      // Calculate distance if coordinates available
      let distanceKm = null;
      if (
        user.location?.coordinates?.length === 2 &&
        report.location?.coordinates?.length === 2
      ) {
        distanceKm = calculateDistance(
          user.location.coordinates[1],
          user.location.coordinates[0],
          report.location.coordinates[1],
          report.location.coordinates[0]
        );
      }

      const newRequest = await VolunteerRequest.create({
        report: report._id,
        volunteer: user._id,
        note,
        distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
        status: 'pending',
      });

      const io = req.app.get('io');

      // Notify report coordinator or admins
      const targetRecipient = report.teamCoordinator || report.reporter;
      if (targetRecipient) {
        await notifyUser(io, {
          recipient: targetRecipient,
          report: report._id,
          type: 'volunteer-request',
          title: 'New Volunteer Request',
          message: `${user.name} requested assignment on "${report.title}".`,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Your assignment request has been submitted for review.',
        request: newRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 3. Cancel a Pending Volunteer Request
// -------------------------------------------------------------
router.patch('/request/:requestId/cancel', protect, async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await VolunteerRequest.findOne({
      _id: requestId,
      volunteer: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Active pending request not found.',
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.json({
      success: true,
      message: 'Assignment request cancelled successfully.',
      request,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. View Logged-in Volunteer's Requests
// -------------------------------------------------------------
router.get('/my-requests', protect, async (req, res, next) => {
  try {
    const requests = await VolunteerRequest.find({ volunteer: req.user._id })
      .populate('report', 'title category priority status address location')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 5. View Logged-in Volunteer's Invitations
// -------------------------------------------------------------
router.get('/my-invitations', protect, async (req, res, next) => {
  try {
    const invitations = await TeamInvitation.find({ volunteer: req.user._id })
      .populate(
        'report',
        'title category priority status address location requiredTeamSize teamMembers'
      )
      .populate('invitedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, invitations });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 6. Respond to Team Invitation (Accept or Decline)
// -------------------------------------------------------------
router.post(
  '/invitation/:invitationId/respond',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('action')
      .isIn(['accept', 'decline'])
      .withMessage('Action must be either accept or decline.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { invitationId } = req.params;
      const { action } = req.body;

      const invitation = await TeamInvitation.findOne({
        _id: invitationId,
        volunteer: req.user._id,
        status: 'pending',
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Active pending invitation not found.',
        });
      }

      const report = await Report.findById(invitation.report);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Associated report not found.' });
      }

      if (action === 'decline') {
        invitation.status = 'declined';
        invitation.respondedAt = new Date();
        await invitation.save();

        return res.json({
          success: true,
          message: 'You have declined the team invitation.',
        });
      }

      // ACTION: ACCEPT
      // Enforce team capacity atomically
      const currentCount = report.teamMembers.length;
      const maxCount = report.requiredTeamSize || 1;

      if (currentCount >= maxCount) {
        invitation.status = 'expired';
        await invitation.save();
        return res.status(400).json({
          success: false,
          message: 'Team is already at full capacity.',
        });
      }

      const alreadyIn = report.teamMembers.some(
        (m) => m.user.toString() === req.user._id.toString()
      );
      if (alreadyIn) {
        invitation.status = 'accepted';
        invitation.respondedAt = new Date();
        await invitation.save();
        return res.json({
          success: true,
          message: 'You are already a confirmed member of this team.',
        });
      }

      const isLeadCandidate =
        report.teamMembers.length === 0 &&
        (!report.assignedVolunteer ||
          report.assignedVolunteer.toString() === req.user._id.toString());

      report.teamMembers.push({
        user: req.user._id,
        role: isLeadCandidate ? 'lead' : 'member',
        joinedAt: new Date(),
      });

      // Update recruitment status if now full
      if (report.teamMembers.length >= maxCount) {
        report.recruitmentStatus = 'full';
        if (report.status === 'pending' || report.status === 'verified') {
          report.status = 'assigned';
        }
      }

      await report.save();

      invitation.status = 'accepted';
      invitation.respondedAt = new Date();
      await invitation.save();

      const io = req.app.get('io');

      // Post system announcement into team chat
      await TeamMessage.create({
        report: report._id,
        sender: req.user._id,
        senderName: req.user.name,
        senderRole: 'member',
        content: `${req.user.name} accepted invitation and joined the team!`,
        isSystem: true,
      });

      if (io) {
        io.to(`team:${report._id}`).emit('team_member_joined', {
          user: { _id: req.user._id, name: req.user.name },
          reportId: report._id,
        });
      }

      // Notify coordinator
      if (report.teamCoordinator) {
        await notifyUser(io, {
          recipient: report.teamCoordinator,
          report: report._id,
          type: 'invitation-accepted',
          title: 'Invitation Accepted',
          message: `${req.user.name} joined the team for "${report.title}".`,
        });
      }

      res.json({
        success: true,
        message: 'Invitation accepted! You are now a confirmed team member.',
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 7. Configure Report Recruitment & Team Requirements
// -------------------------------------------------------------
router.post(
  '/configure/:reportId',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('assignmentType')
      .optional()
      .isIn(['single', 'team'])
      .withMessage('Assignment type must be single or team.'),
    body('requiredTeamSize')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Team size must be between 1 and 50.'),
    body('recruitmentRadiusKm')
      .optional()
      .isFloat({ min: 1, max: 100 })
      .withMessage('Radius must be between 1 and 100 km.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const {
        assignmentType = 'team',
        requiredTeamSize = 5,
        recruitmentRadiusKm = 10,
        recruitmentDeadline,
        requiredSkills = [],
        meetingDetails,
      } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      // Allow admin or existing coordinator to configure
      if (
        req.user.role !== 'admin' &&
        report.teamCoordinator &&
        report.teamCoordinator.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Only the assigned coordinator or an administrator can configure recruitment.',
        });
      }

      report.assignmentType = assignmentType;
      report.requiredTeamSize = requiredTeamSize;
      report.recruitmentRadiusKm = recruitmentRadiusKm;
      report.recruitmentStatus = 'open';

      if (!report.teamCoordinator) {
        report.teamCoordinator = req.user._id;
      }

      if (recruitmentDeadline) {
        report.recruitmentDeadline = new Date(recruitmentDeadline);
      }

      if (Array.isArray(requiredSkills)) {
        report.requiredSkills = requiredSkills.map((s) =>
          String(s).trim().toLowerCase()
        );
      }

      if (meetingDetails) {
        report.meetingDetails = {
          location: meetingDetails.location || '',
          scheduledDate: meetingDetails.scheduledDate
            ? new Date(meetingDetails.scheduledDate)
            : null,
          instructions: meetingDetails.instructions || '',
        };
      }

      await report.save();

      res.json({
        success: true,
        message: 'Team recruitment configured and opened successfully.',
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 7b. Field Assessment & Volunteer Reinforcement Request
// Allows the assigned volunteer to assess the situation on-site,
// request additional team members, and recruit nearby volunteers
// without losing ownership of the report.
// -------------------------------------------------------------
router.post(
  '/request-reinforcements/:reportId',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('assessmentNote')
      .isString()
      .trim()
      .isLength({ min: 5, max: 1000 })
      .withMessage(
        'Please provide an assessment note describing the on-site situation and why reinforcements are required.'
      ),
    body('additionalMembersNeeded')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Additional members must be between 1 and 20.'),
    body('newRequiredTeamSize')
      .optional()
      .isInt({ min: 2, max: 50 })
      .withMessage('New required team size must be between 2 and 50.'),
    body('volunteerIds')
      .optional()
      .isArray()
      .withMessage('volunteerIds must be an array of volunteer IDs.'),
    body('recruitmentRadiusKm')
      .optional()
      .isFloat({ min: 1, max: 100 })
      .withMessage('Recruitment radius must be between 1 and 100 km.'),
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const {
        assessmentNote,
        additionalMembersNeeded = 2,
        newRequiredTeamSize,
        volunteerIds = [],
        recruitmentRadiusKm,
      } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      // Check authorization: must be admin OR the assigned volunteer / coordinator
      const isLead =
        (report.assignedVolunteer &&
          report.assignedVolunteer.toString() === req.user._id.toString()) ||
        (report.teamCoordinator &&
          report.teamCoordinator.toString() === req.user._id.toString()) ||
        req.user.role === 'admin';

      if (!isLead) {
        return res.status(403).json({
          success: false,
          message:
            'Only the assigned lead volunteer or an administrator can request reinforcements.',
        });
      }

      // 1. STRICT OWNERSHIP PRESERVATION:
      // The current assigned volunteer is kept as the primary owner and lead coordinator!
      const currentLeadId =
        report.assignedVolunteer || report.teamCoordinator || req.user._id;
      report.assignedVolunteer = currentLeadId;
      report.teamCoordinator = currentLeadId;

      // Ensure current lead is in teamMembers with role: 'lead'
      const leadIndex = report.teamMembers.findIndex(
        (m) => m.user.toString() === currentLeadId.toString()
      );
      if (leadIndex === -1) {
        report.teamMembers.unshift({
          user: currentLeadId,
          role: 'lead',
          joinedAt: new Date(),
        });
      } else {
        report.teamMembers[leadIndex].role = 'lead';
      }

      // 2. Expand team requirements
      const currentConfirmed = report.teamMembers.length;
      const targetSize = newRequiredTeamSize
        ? Math.max(currentConfirmed + 1, Number(newRequiredTeamSize))
        : currentConfirmed + Number(additionalMembersNeeded);

      report.requiredTeamSize = Math.min(50, Math.max(2, targetSize));
      report.assignmentType = 'team';
      report.recruitmentStatus =
        report.teamMembers.length >= report.requiredTeamSize ? 'full' : 'open';

      if (recruitmentRadiusKm) {
        report.recruitmentRadiusKm = Number(recruitmentRadiusKm);
      }

      // Add status history note for transparent audit trail
      report.statusHistory.push({
        status: report.status,
        changedBy: req.user._id,
        note: `Lead volunteer assessment: "${assessmentNote}". Team size expanded to ${report.requiredTeamSize} members.`,
      });

      await report.save();

      const io = req.app.get('io');
      const invitationsCreated = [];

      // 3. Dispatch invitations to selected nearby volunteers
      if (Array.isArray(volunteerIds) && volunteerIds.length > 0) {
        for (const volId of volunteerIds) {
          if (!mongoose.isValidObjectId(volId)) continue;
          if (volId.toString() === currentLeadId.toString()) continue;

          // Skip if already in team
          const isMember = report.teamMembers.some(
            (m) => m.user.toString() === volId.toString()
          );
          if (isMember) continue;

          // Check if already invited
          let invite = await TeamInvitation.findOne({
            report: report._id,
            volunteer: volId,
          });

          if (!invite) {
            invite = await TeamInvitation.create({
              report: report._id,
              volunteer: volId,
              invitedBy: req.user._id,
              message: `Reinforcement requested by lead coordinator ${req.user.name}: "${assessmentNote}"`,
              status: 'pending',
            });
            invitationsCreated.push(invite);

            await notifyUser(io, {
              recipient: volId,
              report: report._id,
              type: 'team-invite',
              title: 'Urgent Task Reinforcement Request',
              message: `${req.user.name} requested on-site reinforcements for "${report.title}": ${assessmentNote}`,
            });
          }
        }
      }

      // 4. Post announcement into Team Workspace Chat
      await TeamMessage.create({
        report: report._id,
        sender: req.user._id,
        senderName: req.user.name,
        senderRole: 'lead',
        content: `🚨 [Field Assessment & Team Expansion] ${assessmentNote} (Recruiting up to ${report.requiredTeamSize} total members)`,
        isSystem: true,
      });

      if (io) {
        io.to(`team:${report._id}`).emit('team_message', {
          reportId: report._id,
          system: true,
          content: `Field assessment logged by lead volunteer: ${assessmentNote}`,
        });
        io.emit('report:updated', {
          reportId: report._id,
          status: report.status,
          assignmentType: 'team',
          requiredTeamSize: report.requiredTeamSize,
          teamCoordinator: report.teamCoordinator,
          assignedVolunteer: report.assignedVolunteer,
        });
      }

      return res.json({
        success: true,
        message: `Field assessment logged. Required team size increased to ${report.requiredTeamSize} with ${invitationsCreated.length} invitations dispatched. You retain lead ownership.`,
        report,
        invitationsCount: invitationsCreated.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 8. Find Eligible Volunteers Near Report Coordinates
// -------------------------------------------------------------
router.get(
  '/eligible-volunteers/:reportId',
  protect,
  requireRole('volunteer', 'admin'),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      const [reportLng, reportLat] = report.location?.coordinates || [];

      // Query available volunteers
      const volunteers = await User.find({
        role: 'volunteer',
        isActive: true,
      })
        .select(
          'name email phone profileImage location isAvailable skills categories activeTasks completedTasks rating'
        )
        .lean();

      // Check existing invitations and requests
      const invitations = await TeamInvitation.find({
        report: report._id,
      }).lean();
      const requests = await VolunteerRequest.find({
        report: report._id,
      }).lean();

      const inviteStatusMap = new Map(
        invitations.map((i) => [i.volunteer.toString(), i.status])
      );
      const requestStatusMap = new Map(
        requests.map((r) => [r.volunteer.toString(), r.status])
      );
      const confirmedMembersSet = new Set(
        report.teamMembers.map((m) => m.user.toString())
      );

      const radiusKm = report.recruitmentRadiusKm || 15;

      const scoredVolunteers = volunteers.map((vol) => {
        let distanceKm = null;
        if (
          reportLat != null &&
          reportLng != null &&
          vol.location?.coordinates?.length === 2
        ) {
          distanceKm = calculateDistance(
            reportLat,
            reportLng,
            vol.location.coordinates[1],
            vol.location.coordinates[0]
          );
        }

        const isConfirmed = confirmedMembersSet.has(vol._id.toString());
        const invitationStatus =
          inviteStatusMap.get(vol._id.toString()) || null;
        const requestStatus = requestStatusMap.get(vol._id.toString()) || null;

        // Skill match calculation
        const requiredSkills = report.requiredSkills || [];
        const volSkills = [
          ...(vol.skills || []),
          ...(vol.categories || []),
        ].map((s) => s.toLowerCase());
        const matchedSkills = requiredSkills.filter((rs) =>
          volSkills.includes(rs)
        );

        return {
          ...vol,
          distanceKm:
            distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
          withinRadius: distanceKm !== null ? distanceKm <= radiusKm : true,
          matchedSkills,
          isConfirmed,
          invitationStatus,
          requestStatus,
          isEligible: !isConfirmed && vol.isAvailable,
        };
      });

      // Sort by eligibility, distance, rating
      scoredVolunteers.sort((a, b) => {
        if (a.isEligible !== b.isEligible) return b.isEligible ? 1 : -1;
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      res.json({
        success: true,
        reportCoordinates: { latitude: reportLat, longitude: reportLng },
        radiusKm,
        volunteers: scoredVolunteers,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 9. Send Invitations to Eligible Nearby Volunteers
// -------------------------------------------------------------
router.post(
  '/invite-volunteers/:reportId',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('volunteerIds')
      .isArray({ min: 1 })
      .withMessage('Provide an array of volunteer IDs to invite.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { volunteerIds } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      const io = req.app.get('io');
      const createdInvitations = [];

      for (const volId of volunteerIds) {
        if (!mongoose.isValidObjectId(volId)) continue;

        // Skip if already confirmed
        const isMember = report.teamMembers.some(
          (m) => m.user.toString() === volId.toString()
        );
        if (isMember) continue;

        // Avoid duplicate active invite
        const existing = await TeamInvitation.findOne({
          report: report._id,
          volunteer: volId,
          status: 'pending',
        });
        if (existing) continue;

        const volUser = await User.findById(volId);
        if (!volUser || !volUser.isActive) continue;

        let distanceKm = null;
        if (
          report.location?.coordinates?.length === 2 &&
          volUser.location?.coordinates?.length === 2
        ) {
          distanceKm = calculateDistance(
            report.location.coordinates[1],
            report.location.coordinates[0],
            volUser.location.coordinates[1],
            volUser.location.coordinates[0]
          );
        }

        const invite = await TeamInvitation.findOneAndUpdate(
          { report: report._id, volunteer: volId },
          {
            $set: {
              invitedBy: req.user._id,
              status: 'pending',
              distanceKm:
                distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
              respondedAt: null,
            },
          },
          { upsert: true, new: true }
        );

        createdInvitations.push(invite);

        // Push real-time notification
        await notifyUser(io, {
          recipient: volUser._id,
          report: report._id,
          type: 'team-invitation',
          title: 'New Team Invitation',
          message: `You were invited to join the volunteer response team for "${report.title}".`,
        });
      }

      res.json({
        success: true,
        message: `Sent ${createdInvitations.length} invitation(s) successfully.`,
        invitations: createdInvitations,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 10. Access Dedicated Private Team Workspace
// -------------------------------------------------------------
router.get('/workspace/:reportId', protect, async (req, res, next) => {
  try {
    const { reportId } = req.params;

    if (!mongoose.isValidObjectId(reportId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid report ID.' });
    }

    const report = await Report.findById(reportId)
      .populate('reporter', 'name email phone')
      .populate('assignedVolunteer', 'name email phone profileImage')
      .populate('teamCoordinator', 'name email phone profileImage')
      .populate('teamMembers.user', 'name email phone profileImage role')
      .populate('completionReport.submittedBy', 'name')
      .populate('completionReport.reviewedBy', 'name')
      .lean();

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: 'Report not found.' });
    }

    if (!isTeamAuthorized(report, req.user)) {
      return res.status(403).json({
        success: false,
        message:
          'Access Denied: This is a private workspace exclusively reserved for confirmed team members and coordinators.',
      });
    }

    const isCoordinator =
      req.user.role === 'admin' ||
      report.teamCoordinator?._id?.toString() === req.user._id.toString();

    res.json({
      success: true,
      report,
      isCoordinator,
      myRole: isCoordinator ? 'coordinator' : 'member',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 11. Private Team Messages (History & Pagination)
// -------------------------------------------------------------
router.get(
  '/workspace/:reportId/messages',
  protect,
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { limit = 50, before } = req.query;

      const report = await Report.findById(reportId).lean();
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      if (!isTeamAuthorized(report, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Private team communication space.',
        });
      }

      const msgQuery = { report: report._id };
      if (before) {
        msgQuery.createdAt = { $lt: new Date(before) };
      }

      const messages = await TeamMessage.find(msgQuery)
        .sort({ createdAt: 1 })
        .limit(Number(limit))
        .lean();

      res.json({ success: true, messages });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 12. Send a Private Message to Team Workspace
// -------------------------------------------------------------
router.post(
  '/workspace/:reportId/messages',
  protect,
  [
    body('content')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { content, attachments = [] } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      if (!isTeamAuthorized(report, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Private team communication space.',
        });
      }

      const isCoordinator =
        req.user.role === 'admin' ||
        report.teamCoordinator?.toString() === req.user._id.toString();

      const message = await TeamMessage.create({
        report: report._id,
        sender: req.user._id,
        senderName: req.user.name,
        senderRole: isCoordinator ? 'coordinator' : 'member',
        senderAvatar: req.user.profileImage || '',
        content,
        attachments: Array.isArray(attachments) ? attachments : [],
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${report._id}`).emit('new_team_message', message);
      }

      res.status(201).json({ success: true, message });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 13. Task Coordination Checklist (Add, Toggle, Delete)
// -------------------------------------------------------------
router.patch(
  '/workspace/:reportId/tasks',
  protect,
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { action, taskId, title, completed } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      if (!isTeamAuthorized(report, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Private team workspace.',
        });
      }

      if (action === 'add') {
        if (!title || !title.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Task title is required.',
          });
        }
        report.teamTasks.push({
          title: title.trim(),
          completed: false,
          completedBy: null,
          completedAt: null,
        });
      } else if (action === 'toggle') {
        const item = report.teamTasks.id(taskId);
        if (!item) {
          return res.status(404).json({
            success: false,
            message: 'Task checklist item not found.',
          });
        }
        item.completed = completed !== undefined ? completed : !item.completed;
        item.completedBy = item.completed ? req.user._id : null;
        item.completedAt = item.completed ? new Date() : null;
      } else if (action === 'delete') {
        report.teamTasks.pull({ _id: taskId });
      }

      await report.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${report._id}`).emit('team_tasks_updated', {
          teamTasks: report.teamTasks,
        });
      }

      res.json({
        success: true,
        message: 'Team tasks updated.',
        teamTasks: report.teamTasks,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 14. Submit Task Completion Report with Evidence
// -------------------------------------------------------------
router.post(
  '/workspace/:reportId/complete',
  protect,
  [
    body('notes')
      .isString()
      .trim()
      .isLength({ min: 5, max: 2000 })
      .withMessage('Completion notes must be between 5 and 2000 characters.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { notes, images = [] } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      if (!isTeamAuthorized(report, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Private team workspace.',
        });
      }

      report.completionReport = {
        submittedBy: req.user._id,
        submittedAt: new Date(),
        notes,
        images: Array.isArray(images) ? images : [],
        reviewStatus: 'pending',
      };

      report.statusHistory.push({
        status: report.status,
        changedBy: req.user._id,
        note: `Volunteer team submitted completion evidence: ${notes.slice(0, 100)}...`,
      });

      await report.save();

      const io = req.app.get('io');

      // Post system announcement
      await TeamMessage.create({
        report: report._id,
        sender: req.user._id,
        senderName: req.user.name,
        senderRole: 'member',
        content: `📋 ${req.user.name} submitted task completion evidence for review.`,
        isSystem: true,
      });

      if (io) {
        io.to(`team:${report._id}`).emit('team_completion_submitted', {
          completionReport: report.completionReport,
        });
      }

      // Notify coordinator/admins
      const coordinatorId = report.teamCoordinator || report.reporter;
      if (coordinatorId) {
        await notifyUser(io, {
          recipient: coordinatorId,
          report: report._id,
          type: 'task-completed',
          title: 'Completion Evidence Submitted',
          message: `Team submitted completion evidence for "${report.title}".`,
        });
      }

      res.json({
        success: true,
        message: 'Task completion report submitted for review.',
        completionReport: report.completionReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 15. Review Task Completion (Coordinator or Admin)
// -------------------------------------------------------------
router.post(
  '/workspace/:reportId/review-completion',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('approved')
      .isBoolean()
      .withMessage('Approved must be true or false.'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { approved, notes = '' } = req.body;

      const report = await Report.findById(reportId);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      const isCoordinator =
        req.user.role === 'admin' ||
        report.teamCoordinator?.toString() === req.user._id.toString();

      if (!isCoordinator) {
        return res.status(403).json({
          success: false,
          message:
            'Only the coordinator or an administrator can review completion.',
        });
      }

      report.completionReport.reviewedBy = req.user._id;
      report.completionReport.reviewedAt = new Date();
      report.completionReport.reviewStatus = approved ? 'approved' : 'rejected';
      report.completionReport.reviewNotes = notes;

      if (approved) {
        report.status = 'resolved';
        report.resolutionNote = notes || report.completionReport.notes;
        report.resolvedAt = new Date();
      }

      report.statusHistory.push({
        status: report.status,
        changedBy: req.user._id,
        note: approved
          ? `Completion approved by coordinator: ${notes}`
          : `Completion rejected by coordinator: ${notes}`,
      });

      await report.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${report._id}`).emit('team_completion_reviewed', {
          approved,
          report,
        });
      }

      // Notify citizen reporter
      await notifyUser(io, {
        recipient: report.reporter,
        report: report._id,
        type: approved ? 'report-resolved' : 'report-in-progress',
        title: approved ? 'Report Resolved' : 'Work Update',
        message: approved
          ? `Your reported issue "${report.title}" has been resolved by the community team!`
          : `Work is continuing on "${report.title}".`,
      });

      res.json({
        success: true,
        message: approved
          ? 'Completion approved and report marked as resolved!'
          : 'Completion rejected with feedback provided.',
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 16. Review Assignment Request (Approve or Reject)
// -------------------------------------------------------------
router.post(
  '/request/:requestId/review',
  protect,
  requireRole('volunteer', 'admin'),
  [
    body('approved')
      .isBoolean()
      .withMessage('Approved must be a boolean.'),
    body('note')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Note must be less than 500 characters.'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { approved, note = '' } = req.body;

      const request = await VolunteerRequest.findById(requestId);
      if (!request || request.status !== 'pending') {
        return res.status(404).json({
          success: false,
          message: 'Pending assignment request not found.',
        });
      }

      const report = await Report.findById(request.report);
      if (!report) {
        return res
          .status(404)
          .json({ success: false, message: 'Report not found.' });
      }

      const isCoordinator =
        req.user.role === 'admin' ||
        report.teamCoordinator?.toString() === req.user._id.toString();

      if (!isCoordinator) {
        return res.status(403).json({
          success: false,
          message:
            'Only the coordinator or an administrator can review requests.',
        });
      }

      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.reviewNote = note;

      const io = req.app.get('io');

      if (!approved) {
        request.status = 'rejected';
        await request.save();

        await notifyUser(io, {
          recipient: request.volunteer,
          report: report._id,
          type: 'request-rejected',
          title: 'Assignment Request Declined',
          message: `Your request for "${report.title}" was not approved at this time.`,
        });

        return res.json({
          success: true,
          message: 'Request has been rejected.',
          request,
        });
      }

      // APPROVED
      const maxCount = report.requiredTeamSize || 1;
      if (report.teamMembers.length >= maxCount) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot approve request: team is already at maximum capacity.',
        });
      }

      const alreadyIn = report.teamMembers.some(
        (m) => m.user.toString() === request.volunteer.toString()
      );
      if (!alreadyIn) {
        report.teamMembers.push({
          user: request.volunteer,
          role: report.teamMembers.length === 0 ? 'lead' : 'member',
          joinedAt: new Date(),
        });
      }

      // Also set assignedVolunteer for backward compatibility with single-volunteer views
      if (!report.assignedVolunteer) {
        report.assignedVolunteer = request.volunteer;
      }

      if (report.teamMembers.length >= maxCount) {
        report.recruitmentStatus = 'full';
      }
      if (report.status === 'pending' || report.status === 'verified') {
        report.status = 'assigned';
      }

      await report.save();

      request.status = 'approved';
      await request.save();

      // System announcement
      const volunteerUser = await User.findById(request.volunteer).select(
        'name'
      );
      if (volunteerUser) {
        await TeamMessage.create({
          report: report._id,
          sender: volunteerUser._id,
          senderName: volunteerUser.name,
          senderRole: 'member',
          content: `${volunteerUser.name}'s assignment request was approved. Welcome to the team!`,
          isSystem: true,
        });
      }

      await notifyUser(io, {
        recipient: request.volunteer,
        report: report._id,
        type: 'request-approved',
        title: 'Assignment Request Approved!',
        message: `You have been added to the team for "${report.title}". Open your team workspace to start collaborating!`,
      });

      res.json({
        success: true,
        message:
          'Volunteer request approved and member added to team workspace.',
        request,
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
