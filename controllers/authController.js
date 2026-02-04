const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const register = async (req, res) => {
  // Implementation will be added later
};

const login = async (req, res) => {
  // Implementation will be added later
};

module.exports = {
  register,
  login
};