const Annonce = require('../models/annonce.model');
const Utilisateur = require('../models/utilisateur.model');
const fs = require('fs');
const path = require('path');

exports.create = async (req, res) => {
  try {
    console.log('📝 Request body:', req.body);
    console.log('📁 Files:', req.files ? req.files.length : 0);
    console.log('📋 Body keys:', Object.keys(req.body));
    console.log('📞 Téléphone reçu:', req.body.telephone);
    
    const {
      titre,
      description,
      localisation,
      prix,
      nbPieces,
      meublee,
      amenities,
      surface,
      typeBien,
      etage,
      ascenseur,
      parking,
      climatisation,
      chauffage,
      balcon,
      jardin,
      piscine,
      telephone
    } = req.body;
    
    // Vérifier que le téléphone est fourni
    if (!telephone || telephone.trim() === '') {
      console.error('❌ Téléphone manquant ou vide');
      return res.status(400).send({ message: 'Le numéro de téléphone est requis' });
    }

    const proprietaire = await Utilisateur.findById(req.body.proprietaire);
    if (!proprietaire) {
      return res.status(404).send({ message: 'Propriétaire non trouvé' });
    }

    if (proprietaire.type !== 'proprietaire') {
      return res.status(400).send({ message: 'Seuls les propriétaires peuvent créer des annonces' });
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return base64;
      });
      console.log(`📸 ${images.length} images converties en Base64`);
    }

    const annonce = new Annonce({
      titre,
      description,
      localisation,
      prix: parseFloat(prix),
      nbPieces: parseInt(nbPieces),
      meublee: meublee === 'true',
      images,
      amenities: amenities ? amenities.split(',').map(item => item.trim()) : [],
      surface: parseFloat(surface),
      typeBien,
      etage: etage ? parseInt(etage) : undefined,
      ascenseur: ascenseur === 'true',
      parking: parking === 'true',
      climatisation: climatisation === 'true',
      chauffage: chauffage === 'true',
      balcon: balcon === 'true',
      jardin: jardin === 'true',
      piscine: piscine === 'true',
      proprietaire: proprietaire._id,
      telephone: telephone.trim() || proprietaire.numTel || '',
      facebook: proprietaire.facebook || ''
    });

    const data = await annonce.save();
    
    await data.populate('proprietaire', 'nom prenom email photo_de_profile');
    
    console.log('Annonce créée:', data.titre);
    res.status(201).send({
      message: 'Annonce créée avec succès',
      annonce: data
    });
  } catch (err) {
    console.error('Erreur lors de la création de l\'annonce:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).send({ message: `Erreur de validation: ${messages}` });
    }
    res.status(500).send({
      message: 'Erreur lors de la création de l\'annonce',
      error: err.message
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { localisation, prixMin, prixMax, typeBien, meublee, statut } = req.query;
    
    let filter = {};
    
    if (localisation) {
      filter.localisation = { $regex: localisation, $options: 'i' };
    }
    
    if (prixMin || prixMax) {
      filter.prix = {};
      if (prixMin) filter.prix.$gte = parseFloat(prixMin);
      if (prixMax) filter.prix.$lte = parseFloat(prixMax);
    }
    
    if (typeBien) {
      filter.typeBien = typeBien;
    }
    
    if (meublee !== undefined) {
      filter.meublee = meublee === 'true';
    }
    
    if (statut) {
      filter.statut = statut;
    }

    const annonces = await Annonce.find(filter)
      .populate('proprietaire', 'nom prenom email photo_de_profile')
      .sort({ createdAt: -1 });

    res.send({
      count: annonces.length,
      annonces: annonces
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des annonces:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération des annonces',
      error: err.message
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.annonceId)
      .populate('proprietaire', 'nom prenom email photo_de_profile numTel facebook');

    if (!annonce) {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }

    res.send(annonce);
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'annonce:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }
    res.status(500).send({
      message: 'Erreur lors de la récupération de l\'annonce',
      error: err.message
    });
  }
};

exports.findByProprietaire = async (req, res) => {
  try {
    const annonces = await Annonce.find({ proprietaire: req.params.proprietaireId })
      .populate('proprietaire', 'nom prenom email photo_de_profile')
      .sort({ createdAt: -1 });

    res.send({
      count: annonces.length,
      annonces: annonces
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des annonces du propriétaire:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération des annonces du propriétaire',
      error: err.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({
        message: 'Les données à mettre à jour ne peuvent pas être vides !'
      });
    }

    const annonce = await Annonce.findById(req.params.annonceId);
    if (!annonce) {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }
    if (annonce.proprietaire.toString() !== req.body.proprietaire) {
      return res.status(403).send({
        message: 'Vous n\'êtes pas autorisé à modifier cette annonce'
      });
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return base64;
      });
      
      console.log(`📸 ${newImages.length} nouvelles images converties en Base64`);
      req.body.images = newImages;
    }

    const updatedAnnonce = await Annonce.findByIdAndUpdate(
      req.params.annonceId,
      req.body,
      { new: true, runValidators: true }
    ).populate('proprietaire', 'nom prenom email photo_de_profile');

    console.log('Annonce mise à jour:', updatedAnnonce.titre);
    res.send({
      message: 'Annonce mise à jour avec succès',
      annonce: updatedAnnonce
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'annonce:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).send({ message: `Erreur de validation: ${messages}` });
    }
    res.status(500).send({
      message: 'Erreur lors de la mise à jour de l\'annonce',
      error: err.message
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { statut } = req.body;
    
    if (!['disponible', 'indisponible', 'en_location'].includes(statut)) {
      return res.status(400).send({
        message: 'Statut invalide. Valeurs autorisées: disponible, indisponible, en_location'
      });
    }

    const annonce = await Annonce.findByIdAndUpdate(
      req.params.annonceId,
      { statut },
      { new: true, runValidators: true }
    ).populate('proprietaire', 'nom prenom email photo_de_profile');

    if (!annonce) {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }

    console.log('Statut de l\'annonce mis à jour:', annonce.titre, '->', statut);
    res.send({
      message: 'Statut de l\'annonce mis à jour avec succès',
      annonce: annonce
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du statut:', err);
    res.status(500).send({
      message: 'Erreur lors de la mise à jour du statut',
      error: err.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.annonceId);
    if (!annonce) {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }

    if (annonce.proprietaire.toString() !== req.body.proprietaire) {
      return res.status(403).send({
        message: 'Vous n\'êtes pas autorisé à supprimer cette annonce'
      });
    }

    if (annonce.images && annonce.images.length > 0) {
      annonce.images.forEach(image => {
        if (!image.startsWith('http')) {
          const imagePath = path.join(__dirname, '../../Uploads', image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`🗑️ Image supprimée: ${image}`);
          }
        }
      });
    }

    await Annonce.findByIdAndRemove(req.params.annonceId);
    console.log('Annonce supprimée:', annonce.titre);
    
    res.send({ message: 'Annonce supprimée avec succès !' });
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'annonce:', err);
    if (err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }
    res.status(500).send({
      message: 'Impossible de supprimer l\'annonce avec l\'ID ' + req.params.annonceId,
      error: err.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalAnnonces = await Annonce.countDocuments();
    const annoncesDisponibles = await Annonce.countDocuments({ statut: 'disponible' });
    const annoncesEnLocation = await Annonce.countDocuments({ statut: 'en_location' });
    const annoncesIndisponibles = await Annonce.countDocuments({ statut: 'indisponible' });

    const prixMoyen = await Annonce.aggregate([
      { $group: { _id: null, prixMoyen: { $avg: '$prix' } } }
    ]);

    const repartitionType = await Annonce.aggregate([
      { $group: { _id: '$typeBien', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.send({
      totalAnnonces,
      annoncesDisponibles,
      annoncesEnLocation,
      annoncesIndisponibles,
      prixMoyen: prixMoyen[0]?.prixMoyen || 0,
      repartitionType
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des statistiques:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération des statistiques',
      error: err.message
    });
  }
};
exports.delete = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.annonceId);
    if (!annonce) {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }

    if (annonce.proprietaire.toString() !== req.body.proprietaire) {
      return res.status(403).send({
        message: 'Vous n\'êtes pas autorisé à supprimer cette annonce'
      });
    }

    await Annonce.findByIdAndRemove(req.params.annonceId);
    console.log('Annonce supprimée:', annonce.titre);
    
    res.send({ message: 'Annonce supprimée avec succès !' });
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'annonce:', err);
    if (err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: 'Annonce non trouvée avec l\'ID ' + req.params.annonceId
      });
    }
    res.status(500).send({
      message: 'Impossible de supprimer l\'annonce avec l\'ID ' + req.params.annonceId,
      error: err.message
    });
  }
};
