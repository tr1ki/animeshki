const express = require('express');
const { getProfile, updateProfile, getFavorites, addFavorite, removeFavorite } = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.get('/favorites', auth, getFavorites);
router.post('/favorites', auth, addFavorite);
router.delete('/favorites/:id', auth, removeFavorite);

module.exports = router;