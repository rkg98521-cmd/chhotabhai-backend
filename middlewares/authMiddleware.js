import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication failed. No authorization token provided.');
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secure_enterprise_jwt_secret_key_chhotabhai_2026'
    );

    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      throw new ApiError(401, 'User belonging to this token no longer exists.');
    }

    if (currentUser.isActive === false || currentUser.isBlocked) {
      throw new ApiError(403, 'Account is suspended or deactivated. Please contact support.');
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Invalid or expired authentication token. Please sign in again.');
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this resource`
      );
    }
    next();
  };
};

export const authorizeRoles = authorize;

export default {
  protect,
  authorize,
  authorizeRoles,
};
