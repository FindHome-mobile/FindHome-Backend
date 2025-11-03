const Favori = require('../models/favori.model');
const Annonce = require('../models/annonce.model');
const Utilisateur = require('../models/utilisateur.model');

exports.addToFavorites = async (req, res) => {
  try {
    const { clientId, annonceId } = req.body;

    const client = await Utilisateur.findById(clientId);
    if (!client) {
      return res.status(404).send({ message: 'Client non trouvé' });
    }

    const annonce = await Annonce.findById(annonceId);
    if (!annonce) {
      return res.status(404).send({ message: 'Annonce non trouvée' });
    }

    const existingFavori = await Favori.findOne({ client: clientId, annonce: annonceId });
    if (existingFavori) {
      return res.status(400).send({ message: 'Cette annonce est déjà dans vos favoris' });
    }
    const favori = new Favori({
      client: clientId,
      annonce: annonceId
    });

    await favori.save();

    res.status(201).send({
      message: 'Annonce ajoutée aux favoris avec succès',
      favori
    });
  } catch (err) {
    console.error('Erreur lors de l\'ajout aux favoris:', err);
    res.status(500).send({
      message: 'Erreur lors de l\'ajout aux favoris',
      error: err.message
    });
  }
};

exports.removeFromFavorites = async (req, res) => {
  try {
    const { clientId, annonceId } = req.params;

    const favori = await Favori.findOneAndDelete({ client: clientId, annonce: annonceId });
    
    if (!favori) {
      return res.status(404).send({ message: 'Favori non trouvé' });
    }

    res.send({
      message: 'Annonce supprimée des favoris avec succès'
    });
  } catch (err) {
    console.error('Erreur lors de la suppression du favori:', err);
    res.status(500).send({
      message: 'Erreur lors de la suppression du favori',
      error: err.message
    });
  }
};

exports.getClientFavorites = async (req, res) => {
  try {
    const { clientId } = req.params;

    const favoris = await Favori.find({ client: clientId })
      .populate({
        path: 'annonce',
        populate: {
          path: 'proprietaire',
          select: 'nom prenom email photo_de_profile'
        }
      })
      .sort({ dateAjout: -1 });

    res.send({
      message: 'Favoris récupérés avec succès',
      favoris: favoris.map(f => ({
        _id: f._id,
        annonce: f.annonce,
        dateAjout: f.dateAjout
      }))
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des favoris:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération des favoris',
      error: err.message
    });
  }
};
exports.checkIfFavorite = async (req, res) => {
  try {
    const { clientId, annonceId } = req.params;

    const favori = await Favori.findOne({ client: clientId, annonce: annonceId });
    
    res.send({
      isFavorite: !!favori,
      favori: favori ? { _id: favori._id, dateAjout: favori.dateAjout } : null
    });
  } catch (err) {
    console.error('Erreur lors de la vérification du favori:', err);
    res.status(500).send({
      message: 'Erreur lors de la vérification du favori',
      error: err.message
    });
  }
};

exports.getFavoritesCount = async (req, res) => {
  try {
    const { clientId } = req.params;

    const count = await Favori.countDocuments({ client: clientId });
    
    res.send({
      count
    });
  } catch (err) {
    console.error('Erreur lors du comptage des favoris:', err);
    res.status(500).send({
      message: 'Erreur lors du comptage des favoris',
      error: err.message
    });
  }
};
