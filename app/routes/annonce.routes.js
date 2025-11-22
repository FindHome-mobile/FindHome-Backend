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

// Middleware d'authentification complet
const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId || req.params.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié - user-id manquant' });
    }

    // Importer le modèle ici pour éviter les problèmes de chargement
    const Utilisateur = require('../models/utilisateur.model');

    const user = await Utilisateur.findById(userId);

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = user;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    res.status(500).json({ message: 'Erreur d\'authentification', error: error.message });
  }
};

// Routes publiques (sans authentification)
router.get('/', annonceController.findAll);
router.get('/stats', annonceController.getStats);
router.get('/:annonceId', annonceController.findOne);

// Route de test sans middleware
router.post('/test', annonceController.create);

// Routes nécessitant authentification
router.use(authenticateUser);

// Routes pour les propriétaires
router.post('/proprietaire', upload.array('images', 10), annonceController.createByProprietaire);
router.get('/proprietaire/:proprietaireId', annonceController.findByProprietaire);

// Routes de modification/suppression d'annonces (pour propriétaires seulement)
router.put('/:annonceId', upload.array('images', 10), annonceController.updateByProprietaire);
router.delete('/:annonceId', annonceController.deleteByProprietaire);

// Routes admin (anciennes routes maintenues pour compatibilité)
router.post('/', upload.array('images', 10), annonceController.create);
router.put('/admin/:annonceId', upload.array('images', 10), annonceController.update);
router.patch('/:annonceId/status', annonceController.updateStatus);
router.delete('/admin/:annonceId', annonceController.delete);

// Routes admin (anciennes routes maintenues pour compatibilité)
router.post('/', upload.array('images', 10), annonceController.create);
router.put('/:annonceId', upload.array('images', 10), annonceController.update);
router.patch('/:annonceId/status', annonceController.updateStatus);
router.delete('/:annonceId', annonceController.delete);

module.exports = router;
