const express = require('express');
const router = express.Router();
const utilisateurs = require('../controllers/utilisateur.controller');
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers images sont autorisés'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});

router.post('/login', utilisateurs.login);
router.post('/register', upload.single('photo_de_profile'), utilisateurs.create);
router.post('/forgot-password', utilisateurs.forgotPassword);

router.put(
  '/:utilisateurId/profile',
  upload.single('photo_de_profile'),
  utilisateurs.updateProfile
);
router.put('/:utilisateurId/password', utilisateurs.changePassword);
router.post('/:utilisateurId/change-password', utilisateurs.changePassword);
router.get('/', utilisateurs.findAll);
router.get('/proprietaires', utilisateurs.findProprietaires);
router.get('/:utilisateurId', utilisateurs.findOne);
router.put('/:utilisateurId', utilisateurs.update);
router.delete('/:utilisateurId', utilisateurs.delete);

module.exports = router;