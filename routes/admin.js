const express = require('express');
const { getAllUsers } = require('../controllers/authController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = express.Router();

// Admin dashboard routes
router.get('/dashboard', auth, role('admin'), (req, res) => {
  res.json({
    message: 'Welcome to Admin Dashboard',
    user: req.user
  });
});

// User management
router.get('/users', auth, role('admin'), getAllUsers);

// System stats
router.get('/stats', auth, role('admin'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Anime = require('../models/Anime');
    const Manga = require('../models/Manga');
    const Review = require('../models/Review');

    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAnime = await Anime.countDocuments();
    const totalManga = await Manga.countDocuments();
    const totalReviews = await Review.countDocuments();

    res.json({
      users: userStats,
      totalAnime,
      totalManga,
      totalReviews
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
