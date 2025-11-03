const express = require('express');
const router = express.Router();
const favoriController = require('../controllers/favori.controller');

router.post('/add', favoriController.addToFavorites);
router.delete('/:clientId/:annonceId', favoriController.removeFromFavorites);
router.get('/client/:clientId', favoriController.getClientFavorites);
router.get('/check/:clientId/:annonceId', favoriController.checkIfFavorite);
router.get('/count/:clientId', favoriController.getFavoritesCount);

module.exports = router;
