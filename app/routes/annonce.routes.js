const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonce.controller');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers images sont autorisés'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10 
  }
});

router.post('/', upload.array('images', 10), annonceController.create);
router.get('/', annonceController.findAll);
router.get('/stats', annonceController.getStats);
router.get('/:annonceId', annonceController.findOne);
router.get('/proprietaire/:proprietaireId', annonceController.findByProprietaire);
router.put('/:annonceId', upload.array('images', 10), annonceController.update);
router.patch('/:annonceId/status', annonceController.updateStatus);
router.delete('/:annonceId', annonceController.delete);


module.exports = router;
