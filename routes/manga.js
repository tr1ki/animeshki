const express = require('express');
const {
  handleCoverUpload,
  handleMangaUpload,
  getPublicManga,
  getPublicMangaById,
  getMyManga,
  createManga,
  uploadMangaCover,
  uploadMangaFile,
  getMangaCover,
  getMangaPages,
  getPendingManga,
  approveManga,
  rejectManga,
  deleteManga
} = require('../controllers/mangaController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = express.Router();

const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return next();
  }

  return auth(req, res, next);
};

router.get('/', getPublicManga);
router.get('/my', auth, role('user', 'moderator', 'admin'), getMyManga);

router.get('/pending', auth, role('moderator', 'admin'), getPendingManga);
router.post('/', auth, role('user', 'moderator', 'admin'), createManga);
router.patch('/:id/approve', auth, role('moderator', 'admin'), approveManga);
router.patch('/:id/reject', auth, role('moderator', 'admin'), rejectManga);
router.post('/:id/cover', auth, role('user', 'moderator', 'admin'), handleCoverUpload, uploadMangaCover);
router.post('/:id/upload', auth, role('user', 'moderator', 'admin'), handleMangaUpload, uploadMangaFile);
router.get('/:id/cover', getMangaCover);
router.get('/:id/pages', optionalAuth, getMangaPages);
router.get('/:id', getPublicMangaById);
router.delete('/:id', auth, role('user', 'moderator', 'admin'), deleteManga);

module.exports = router;
