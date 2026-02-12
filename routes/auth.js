const express = require('express');
const { register, login, createAdmin, createModerator, updateUserRole, getAllUsers } = require('../controllers/authController');
const { validateRegister, validateLogin, handleValidationErrors } = require('../utils/validation');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = express.Router();

router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);

// Admin only routes
router.post('/create-admin', auth, role('admin'), createAdmin);
router.post('/create-moderator', auth, role('admin'), createModerator);
router.put('/users/:userId/role', auth, role('admin'), updateUserRole);
router.get('/users', auth, role('admin'), getAllUsers);

module.exports = router;
