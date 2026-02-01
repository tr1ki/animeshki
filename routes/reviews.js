const express = require('express');
const { createReview, getReviewsByContent, updateReview, deleteReview } = require('../controllers/reviewController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createReview);
router.get('/:contentId', getReviewsByContent);
router.put('/:id', auth, updateReview);
router.delete('/:id', auth, deleteReview);

module.exports = router;