
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to access this resource.',
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing.',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      console.error('JWT_SECRET is missing or too short.');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured.',
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'locallens-api',
      audience: 'locallens-client',
    });

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.sub !== 'string'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    const user = await User.findById(decoded.sub).select('+tokenVersion');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is unavailable. Please contact support if needed.',
      });
    }

    const tokenVersion = decoded.ver ?? 0;

    if (
      !Number.isInteger(tokenVersion) ||
      tokenVersion !== user.tokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (
      [
        'JsonWebTokenError',
        'TokenExpiredError',
        'NotBeforeError',
        'CastError',
    ].includes(error.name)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      });
    }

    console.error('Authentication error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to authenticate the request.',
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireVolunteer = requireRole('volunteer');
export const requireCitizen = requireRole('citizen');
