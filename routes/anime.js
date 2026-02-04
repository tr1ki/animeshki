const express = require('express');
const { getAllAnime, getAnimeById, createAnime, updateAnime, deleteAnime } = require('../controllers/animeController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = express.Router();

router.get('/', getAllAnime);
router.get('/:id', getAnimeById);
router.post('/', auth, role('admin'), createAnime);
router.put('/:id', auth, role('admin'), updateAnime);
router.delete('/:id', auth, role('admin'), deleteAnime);

module.exports = router;