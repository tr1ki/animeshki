const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
  role: user.role
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

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: mapUserResponse(user)
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
  createAdmin,
  createModerator,
  updateUserRole,
  getAllUsers
};
