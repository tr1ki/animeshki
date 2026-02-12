const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/emailService');

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const mapUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified
});

const register = async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email or username already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: 'user'
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, username, verificationToken);
    
    if (!emailSent) {
      console.error('Failed to send verification email to:', email);
      // Don't fail registration if email fails, but log it
    }

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: mapUserResponse(user),
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: mapUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email or username already exists' });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'admin'
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: mapUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
};

const createModerator = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email or username already exists' });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'moderator'
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: mapUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.clearEmailVerificationFields();
    await user.save();

    return res.json({
      message: 'Email verified successfully!',
      user: mapUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const user = req.user; // From auth middleware

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, user.username, verificationToken);

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    return res.json({
      message: 'Verification email sent successfully! Please check your inbox.'
    });
  } catch (error) {
    return next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user, moderator, or admin' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.json({
      message: 'User role updated successfully',
      user: mapUserResponse(user)
    });
  } catch (error) {
    return next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('_id username email role createdAt')
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  createAdmin,
  createModerator,
  updateUserRole,
  getAllUsers
};
