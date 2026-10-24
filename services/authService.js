import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export class AuthService {
  static async registerUser({ name, email, password, phone }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
    });

    const token = user.generateAuthToken();

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  }

  static async loginUser({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.isBlocked) {
      throw new ApiError(403, 'Account is suspended. Please contact support.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = user.generateAuthToken();

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  }
}
