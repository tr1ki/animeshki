const express = require('express');
const { getAllManga, getMangaById, createManga, updateManga, deleteManga } = require('../controllers/mangaController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = express.Router();

router.get('/', getAllManga);
router.get('/:id', getMangaById);
router.post('/', auth, role('admin'), createManga);
router.put('/:id', auth, role('admin'), updateManga);
router.delete('/:id', auth, role('admin'), deleteManga);

module.exports = router;