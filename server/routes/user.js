
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  next();
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    profileImage: user.profileImage ?? null,
    bio: user.bio ?? '',
    location: user.location ?? null,
    serviceRadiusMeters: user.serviceRadiusMeters,
    categories: user.categories,
    isAvailable: user.isAvailable,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// GET /api/users/me
// View your own profile
router.get('/me', protect, (req, res) => {
  return res.json({
    success: true,
    user: publicUser(req.user),
  });
});

// PATCH /api/users/me
// Update your own basic profile
router.patch(
  '/me',
  protect,
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters.'),

    body('phone')
      .optional({ values: 'null' })
      .isString()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number cannot exceed 20 characters.'),

    body('bio')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters.'),

    body('profileImage')
      .optional({ values: 'null' })
      .isString()
      .trim()
      .isLength({ max: 2048 })
      .withMessage('Profile image URL is too long.'),

    validate,
  ],
  async (req, res) => {
    try {
      const allowedFields = ['name', 'phone', 'bio', 'profileImage'];

      for (const field of allowedFields) {
        if (Object.hasOwn(req.body, field)) {
          req.user[field] = req.body[field];
        }
      }

      await req.user.save();

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: publicUser(req.user),
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile information.',
        });
      }

      console.error('Profile update error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to update profile.',
      });
    }
  }
);

// PATCH /api/users/me/availability
// Volunteers can update their own availability
router.patch(
  '/me/availability',
  protect,
  [
    body('isAvailable')
      .isBoolean()
      .withMessage('isAvailable must be true or false'),

    validate,
  ],
  async (req, res) => {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can change availability.',
      });
    }

    try {
      req.user.isAvailable = req.body.isAvailable;
      await req.user.save();

      return res.json({
        success: true,
        message: 'Availability updated successfully.',
        isAvailable: req.user.isAvailable,
      });
    } catch (error) {
      console.error('Availability update error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to update availability.',
      });
    }
  }
);

export default router;
