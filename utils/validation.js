const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateAnime = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim(),
  body('genre')
    .isArray({ min: 1 })
    .withMessage('At least one genre is required'),
  body('episodes')
    .isInt({ min: 1 })
    .withMessage('Episodes must be a positive number'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim(),
  body('releaseYear')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid release year')
];

const validateManga = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim(),
  body('genre')
    .isArray({ min: 1 })
    .withMessage('At least one genre is required'),
  body('chapters')
    .isInt({ min: 1 })
    .withMessage('Chapters must be a positive number'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim(),
  body('releaseYear')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid release year')
];

const validateReview = [
  body('contentId')
    .notEmpty()
    .withMessage('Content ID is required'),
  body('contentType')
    .isIn(['Anime', 'Manga'])
    .withMessage('Content type must be Anime or Manga'),
  body('comment')
    .notEmpty()
    .withMessage('Comment is required')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('rating')
    .isInt({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateAnime,
  validateManga,
  validateReview,
  handleValidationErrors
};