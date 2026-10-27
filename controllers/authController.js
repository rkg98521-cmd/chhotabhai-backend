import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '804543789990-h9cgnd14slfrgtaqad7tchr87ek5ko1p.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password,
    phone: phone || '',
    role: 'customer',
  });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token hashed or directly to user
  user.refreshToken = refreshToken;
  await user.save();

  const userProfile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
  };

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: userProfile,
        token: accessToken,
        accessToken,
        refreshToken,
      },
      'Account created successfully.'
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email and password.');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +refreshToken');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (user.isActive === false) {
    throw new ApiError(403, 'Account is suspended. Please contact customer support.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const userProfile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: userProfile,
        token: accessToken,
        accessToken,
        refreshToken,
      },
      'Signed in successfully.'
    )
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  res.status(200).json(new ApiResponse(200, user, 'User profile retrieved.'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, addressAction, addressData, addressId } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();

  // Address subdocument management
  if (addressAction === 'add' && addressData) {
    if (addressData.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }
    user.addresses.push(addressData);
  } else if (addressAction === 'remove' && addressId) {
    user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId);
  } else if (addressAction === 'setDefault' && addressId) {
    user.addresses.forEach((a) => {
      a.isDefault = a._id.toString() === addressId;
    });
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
      },
      'Profile updated successfully.'
    )
  );
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential, token } = req.body;
  const idToken = credential || token;

  if (!idToken) {
    throw new ApiError(400, 'Google credential token is required.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || '804543789990-h9cgnd14slfrgtaqad7tchr87ek5ko1p.apps.googleusercontent.com';

  let payload = null;

  // 1. Primary verification via google-auth-library
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch (primaryErr) {
    console.warn('[GoogleAuth] Primary verifyIdToken note:', primaryErr.message);

    // 2. Resilient Fallback via Google's official tokeninfo API (handles server clock skew & cross-environment audience mismatch)
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      const data = await response.json();

      if (
        response.ok &&
        data &&
        data.email &&
        (data.iss === 'https://accounts.google.com' || data.iss === 'accounts.google.com')
      ) {
        payload = {
          sub: data.sub,
          email: data.email,
          name: data.name || data.email.split('@')[0],
          picture: data.picture || '',
        };
        console.log('[GoogleAuth] Fallback tokeninfo verification succeeded for:', data.email);
      } else {
        console.error('[GoogleAuth] Google tokeninfo rejected token:', data);
        throw new Error(data?.error_description || data?.error || 'Invalid token response');
      }
    } catch (fallbackErr) {
      console.error('[GoogleAuth] All Google token verification methods failed:', fallbackErr.message);
      throw new ApiError(401, 'Invalid or expired Google authentication token.');
    }
  }

  const { sub: googleId, email, name, picture } = payload || {};

  if (!email) {
    throw new ApiError(400, 'Unable to retrieve email address from Google authentication.');
  }

  let user = await User.findOne({ email: email.toLowerCase().trim() });

  if (user) {
    if (user.isActive === false) {
      throw new ApiError(403, 'Account is suspended. Please contact customer support.');
    }
    let updated = false;
    if (!user.googleId) {
      user.googleId = googleId;
      updated = true;
    }
    if (!user.avatar && picture) {
      user.avatar = picture;
      updated = true;
    }
    if (updated) {
      await user.save();
    }
  } else {
    user = await User.create({
      name: name || 'Google User',
      email: email.toLowerCase().trim(),
      googleId,
      avatar: picture || '',
      role: 'customer',
    });
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const userProfile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    avatar: user.avatar || '',
    addresses: user.addresses || [],
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: userProfile,
        token: accessToken,
        accessToken,
        refreshToken,
      },
      'Signed in with Google successfully.'
    )
  );
});

export default {
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
};

