
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import OtpChallenge from '../models/OtpChallenge.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  sendEmailOtp,
  sendSmsOtp,
  verifySmsOtp,
} from '../services/otpService.js';
import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

const router = Router();
const BCRYPT_ROUNDS = 12;
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashCode(code) {
  return createHash('sha256').update(code).digest('hex');
}

function codesMatch(expectedHash, suppliedCode) {
  if (!expectedHash || !/^\d{6}$/.test(String(suppliedCode || ''))) {
    return false;
  }

  const expected = Buffer.from(expectedHash, 'hex');
  const supplied = Buffer.from(hashCode(String(suppliedCode)), 'hex');

  return (
    expected.length === supplied.length &&
    timingSafeEqual(expected, supplied)
  );
}

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
    isPhoneVerified: user.isPhoneVerified ?? false,
    createdAt: user.createdAt,
  };
}

function validPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(String(phone || ''));
}

async function checkCooldown(email, purpose, channel) {
  const previous = await OtpChallenge.findOne({
    email,
    purpose,
    channel,
  }).select('createdAt');

  if (
    previous &&
    Date.now() - previous.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return Math.ceil(
      (RESEND_COOLDOWN_MS -
        (Date.now() - previous.createdAt.getTime())) / 1000
    );
  }

  return 0;
}

async function createChallenge({ email, purpose, channel, phone, code }) {
  await OtpChallenge.deleteMany({ email, purpose, channel });

  const challenge = await OtpChallenge.create({
    email,
    purpose,
    channel,
    ...(phone ? { phone } : {}),
    ...(code ? { codeHash: hashCode(code) } : {}),
    expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });

  try {
    if (channel === 'email') {
      await sendEmailOtp(email, code);
    } else {
      await sendSmsOtp(phone);
    }
  } catch (error) {
    await OtpChallenge.deleteOne({ _id: challenge._id });
    throw error;
  }

  return challenge;
}

async function issueChallenge({ email, purpose, channel, phone }) {
  const waitSeconds = await checkCooldown(email, purpose, channel);

  if (waitSeconds > 0) {
    const error = new Error(
      `Please wait ${waitSeconds} seconds before requesting another code.`
    );
    error.status = 429;
    throw error;
  }

  const code = channel === 'email'
    ? String(randomInt(100000, 1000000))
    : undefined;

  await createChallenge({
    email,
    purpose,
    channel,
    phone,
    code,
  });
}

async function verifyChallenge({ email, purpose, channel, code }) {
  const challenge = await OtpChallenge.findOne({
    email,
    purpose,
    channel,
  }).select('+codeHash');

  if (!challenge || challenge.expiresAt <= new Date()) {
    if (challenge) {
      await OtpChallenge.deleteOne({ _id: challenge._id });
    }

    return {
      ok: false,
      message: 'Code expired or invalid. Request a new code.',
    };
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    await OtpChallenge.deleteOne({ _id: challenge._id });

    return {
      ok: false,
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }

  let approved = false;

  if (channel === 'email') {
    approved = codesMatch(challenge.codeHash, code);
  } else {
    try {
      approved = await verifySmsOtp(
        challenge.phone,
        String(code || '')
      );
    } catch {
      approved = false;
    }
  }

  if (!approved) {
    challenge.attempts += 1;
    await challenge.save();

    return {
      ok: false,
      message: challenge.attempts >= MAX_OTP_ATTEMPTS
        ? 'Too many incorrect attempts. Request a new code.'
        : 'Incorrect or expired verification code.',
    };
  }

  await OtpChallenge.deleteOne({ _id: challenge._id });
  return { ok: true };
}

// POST /api/auth/register
// Direct registration: no OTP required.
router.post(
  '/register',
  [
    body('name')
      .isString().withMessage('Name is required.')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters.'),

    body('email')
      .isString().withMessage('Email is required.')
      .trim()
      .isEmail().withMessage('Enter a valid email address.')
      .normalizeEmail(),

    body('password')
      .isString().withMessage('Password is required.')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be between 8 and 72 characters.'),

    body('role')
      .optional()
      .isIn(['citizen', 'volunteer'])
      .withMessage('Role must be citizen or volunteer.'),

    body('phone')
      .optional()
      .custom((value) => !value || validPhone(value))
      .withMessage(
        'Enter a valid phone number with country code, such as +919876543210.'
      ),

    validate,
  ],
  async (req, res) => {
    try {
      const { name, password, role, phone } = req.body;
      const email = normalizeEmail(req.body.email);

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = await User.create({
        name: name.trim(),
        email,
        passwordHash,
        role: role === 'volunteer' ? 'volunteer' : 'citizen',
        phone: phone || undefined,
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        isAvailable: role === 'volunteer',
      });

      // IMPORTANT: use the defined signToken() helper.
      const token = signToken(user);

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
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

      console.error('Registration error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to complete registration right now.',
      });
    }
  }
);

// POST /api/auth/verify-registration
router.post(
  '/verify-registration',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('channel').isIn(['email', 'sms']).withMessage('Choose email or SMS.'),
    body('code').matches(/^\d{6}$/).withMessage('Enter the six-digit code.'),
    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { channel, code } = req.body;
      const user = await User.findOne({ email }).select('+tokenVersion');

      if (!user || user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Registration cannot be verified. Please register again if needed.',
        });
      }

      const result = await verifyChallenge({
        email,
        purpose: 'register',
        channel,
        code,
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      if (channel === 'email') {
        user.isEmailVerified = true;
      } else {
        user.isPhoneVerified = true;
      }

      user.isActive = true;
      user.lastActiveAt = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Account verified successfully.',
        token: signToken(user),
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Registration verification error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to verify registration right now.',
      });
    }
  }
);

// POST /api/auth/login
// Direct login: no OTP required.
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Enter a valid email address.')
      .normalizeEmail(),

    body('password')
      .isString()
      .notEmpty()
      .withMessage('Password is required.'),

    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { password } = req.body;

      const user = await User.findOne({ email })
        .select('+passwordHash +tokenVersion');

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This account is inactive. Please contact support.',
        });
      }

      user.lastActiveAt = new Date();

      try {
        await user.save();
      } catch (saveError) {
        console.error('Could not update lastActiveAt:', saveError.message);
      }

      // IMPORTANT: use the defined signToken() helper.
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

// Legacy POST /api/auth/verify-login
router.post(
  '/verify-login',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('channel').isIn(['email', 'sms']).withMessage('Choose email or SMS.'),
    body('code').matches(/^\d{6}$/).withMessage('Enter the six-digit code.'),
    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { channel, code } = req.body;

      const result = await verifyChallenge({
        email,
        purpose: 'login',
        channel,
        code,
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      const user = await User.findOne({ email }).select('+tokenVersion');

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Unable to complete login. Please try again.',
        });
      }

      if (channel === 'email' && !user.isEmailVerified) {
        user.isEmailVerified = true;
      }

      user.lastActiveAt = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token: signToken(user),
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Login verification error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to verify login right now.',
      });
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('newPassword')
      .optional()
      .isLength({ min: 8, max: 72 })
      .withMessage('New password must be between 8 and 72 characters.'),
    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { newPassword, channel } = req.body;

      const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: 'No active account found with this email address.',
        });
      }

      // If new password is provided, perform direct secure password reset
      if (newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.passwordHash = passwordHash;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        return res.status(200).json({
          success: true,
          message: 'Password reset successful! You can now sign in with your new password.',
        });
      }

      // Fallback for legacy OTP flow if channel is requested
      if (channel) {
        if (channel === 'sms' && (!user.phone || !user.isPhoneVerified)) {
          return res.status(400).json({
            success: false,
            message: 'A verified phone number is required for SMS recovery.',
          });
        }

        await issueChallenge({
          email,
          purpose: 'password-reset',
          channel,
          phone: channel === 'sms' ? user.phone : undefined,
        });

        return res.status(202).json({
          success: true,
          message: 'A recovery code has been sent if eligible.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Please provide your new password to reset.',
      });
    } catch (error) {
      console.error('Password recovery request failed:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Unable to process password reset right now.',
      });
    }
  }
);

// POST /api/auth/verify-reset-otp
router.post(
  '/verify-reset-otp',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('channel').isIn(['email', 'sms']).withMessage('Choose email or SMS verification.'),
    body('code').matches(/^\d{6}$/).withMessage('Enter the six-digit code.'),
    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { channel, code } = req.body;

      const challenge = await OtpChallenge.findOne({
        email,
        purpose: 'password-reset',
        channel,
      }).select('+codeHash +payload');

      if (!challenge || challenge.expiresAt <= new Date()) {
        if (challenge) {
          await OtpChallenge.deleteOne({ _id: challenge._id });
        }

        return res.status(400).json({
          success: false,
          message: 'Code expired or invalid. Request a new code.',
        });
      }

      if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
        await OtpChallenge.deleteOne({ _id: challenge._id });

        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Request a new code.',
        });
      }

      let approved = false;

      if (channel === 'email') {
        approved = codesMatch(challenge.codeHash, code);
      } else {
        try {
          approved = await verifySmsOtp(challenge.phone, code);
        } catch {
          approved = false;
        }
      }

      if (!approved) {
        challenge.attempts += 1;
        await challenge.save();

        return res.status(400).json({
          success: false,
          message: 'Incorrect or expired verification code.',
        });
      }

      const resetToken = randomBytes(32).toString('hex');

      challenge.codeHash = undefined;
      challenge.payload = {
        verified: true,
        resetTokenHash: hashCode(resetToken),
      };
      challenge.attempts = 0;
      await challenge.save();

      return res.status(200).json({
        success: true,
        message: 'Code verified. You can now reset your password.',
        resetToken,
      });
    } catch (error) {
      console.error('Recovery OTP verification failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to verify the recovery code right now.',
      });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('channel').isIn(['email', 'sms']).withMessage('Choose email or SMS verification.'),
    body('resetToken')
      .isString()
      .matches(/^[a-f0-9]{64}$/i)
      .withMessage('A valid reset authorization is required.'),
    body('newPassword')
      .isString()
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be between 8 and 72 characters.'),
    validate,
  ],
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const { channel, resetToken, newPassword } = req.body;

      const challenge = await OtpChallenge.findOne({
        email,
        purpose: 'password-reset',
        channel,
        expiresAt: { $gt: new Date() },
      }).select('+payload');

      if (
        !challenge ||
        challenge.payload?.verified !== true ||
        typeof challenge.payload?.resetTokenHash !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Reset authorization is invalid or expired. Verify a new code.',
        });
      }

      const expected = Buffer.from(challenge.payload.resetTokenHash, 'hex');
      const supplied = Buffer.from(hashCode(resetToken), 'hex');

      const tokenMatches =
        expected.length === supplied.length &&
        timingSafeEqual(expected, supplied);

      if (!tokenMatches) {
        return res.status(400).json({
          success: false,
          message: 'Reset authorization is invalid or expired.',
        });
      }

      const user = await User.findOne({ email }).select('+tokenVersion');

      if (!user || !user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Unable to reset this account.',
        });
      }

      user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      await user.save();

      await OtpChallenge.deleteMany({
        email,
        purpose: {
          $in: ['password-reset', 'login', 'register'],
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please sign in again.',
      });
    } catch (error) {
      console.error('Password reset failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to reset your password right now.',
      });
    }
  }
);

// POST /api/auth/resend-otp
router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('channel').isIn(['email', 'sms']).withMessage('Choose email or SMS.'),
    body('purpose')
      .isIn(['register', 'login', 'password-reset'])
      .withMessage('Invalid verification purpose.'),
    validate,
  ],
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { channel, purpose } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(202).json({
          success: true,
          message: 'If your account is eligible, a new code will be sent.',
        });
      }

      if (purpose === 'register' && user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This account has already completed registration.',
        });
      }

      if (
        (purpose === 'login' || purpose === 'password-reset') &&
        !user.isActive
      ) {
        return res.status(202).json({
          success: true,
          message: 'If your account is eligible, a new code will be sent.',
        });
      }

      if (
        channel === 'sms' &&
        (!user.phone || (purpose !== 'register' && !user.isPhoneVerified))
      ) {
        return res.status(400).json({
          success: false,
          message: 'A valid phone number is required for SMS verification.',
        });
      }

      await issueChallenge({
        email,
        purpose,
        channel,
        phone: channel === 'sms' ? user.phone : undefined,
      });

      return res.status(200).json({
        success: true,
        message: 'A new verification code has been requested.',
      });
    } catch (error) {
      if (error.status === 429) {
        return res.status(429).json({
          success: false,
          message: error.message,
        });
      }

      console.error('Resend OTP error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to resend the verification code right now.',
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
