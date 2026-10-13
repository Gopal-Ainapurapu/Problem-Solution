
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

const BCRYPT_ROUNDS = 12;

// Validate request data
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

// Create a token compatible with authMiddleware.js
function signToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short.');
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      ver: user.tokenVersion ?? 0,
    },
    secret,
    {
      expiresIn: '1d',
      issuer: 'locallens-api',
      audience: 'locallens-client',
      algorithm: 'HS256',
    }
  );
}

// Return only public user fields
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    profileImage: user.profileImage ?? null,
    bio: user.bio ?? '',
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .isString()
      .withMessage('Name is required.')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters.'),

    body('email')
      .isString()
      .withMessage('Email is required.')
      .trim()
      .isEmail()
      .withMessage('Enter a valid email address.')
      .normalizeEmail(),

    body('password')
      .isString()
      .withMessage('Password is required.')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be between 8 and 72 characters.'),

    body('role')
      .optional()
      .isIn(['citizen', 'volunteer'])
      .withMessage('Role must be citizen or volunteer.'),

    validate,
  ],
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      const existingUser = await User.findOne({ email })
        .select('_id')
        .lean();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const passwordHash = await bcrypt.hash(
        password,
        BCRYPT_ROUNDS
      );

      // Never allow public admin registration
      const assignedRole =
        role === 'volunteer' ? 'volunteer' : 'citizen';

      const user = await User.create({
        name,
        email,
        passwordHash,
        role: assignedRole,
        isAvailable: false,
      });

      const token = signToken(user);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: publicUser(user),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid account information.',
        });
      }

      console.error('Registration error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to create your account right now.',
      });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .isString()
      .withMessage('Email is required.')
      .trim()
      .isEmail()
      .withMessage('Enter a valid email address.')
      .normalizeEmail(),

    body('password')
      .isString()
      .withMessage('Password is required.')
      .notEmpty()
      .withMessage('Password is required.'),

    validate,
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // These fields are hidden by default in User.js
      const user = await User.findOne({ email })
        .select('+passwordHash +tokenVersion');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.passwordHash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This account is inactive.',
        });
      }

      user.lastActiveAt = new Date();
      await user.save();

      const token = signToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Login error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to log in right now.',
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
});

export default router;
