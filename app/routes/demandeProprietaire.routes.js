const express = require('express');
const router = express.Router();
const demandeProprietaireController = require('../controllers/demandeProprietaire.controller');

router.post('/', demandeProprietaireController.create);
router.get('/', demandeProprietaireController.findAll);
router.get('/:demandeId', demandeProprietaireController.findOne);
router.get('/utilisateur/:utilisateurId', demandeProprietaireController.getByUtilisateur);
router.post('/:demandeId/approve', demandeProprietaireController.approve);
router.post('/:demandeId/reject', demandeProprietaireController.reject);

module.exports = router;

