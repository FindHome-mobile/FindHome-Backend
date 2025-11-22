const Annonce = require('../models/annonce.model');
const Utilisateur = require('../models/utilisateur.model');
const fs = require('fs');
const path = require('path');

// Middleware d'authentification simple (à remplacer par JWT plus tard)
const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId || req.params.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié - user-id manquant dans headers, body ou params' });
    }

    const user = await Utilisateur.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    res.status(401).json({ message: 'Erreur d\'authentification', error: error.message });
  }
};

// Exporter le middleware pour l'utiliser dans les routes
exports.authenticateUser = authenticateUser;

// Middleware pour vérifier les permissions propriétaire
const requireProprietaire = (req, res, next) => {
  if (req.user.type !== 'proprietaire') {
    return res.status(403).json({ message: 'Accès réservé aux propriétaires' });
  }
  next();
};

exports.create = async (req, res) => {
  try {
    console.log('📝 CREATE - req.user:', req.user);
    console.log('📝 CREATE - req.userId:', req.userId);
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

    // Utiliser l'utilisateur authentifié comme propriétaire
    const proprietaire = req.user;

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

    console.log('🏗️ Objet annonce créé:', annonce);
    console.log('💾 Tentative de sauvegarde...');

    const data = await annonce.save();
    console.log('✅ Annonce sauvegardée:', data._id);
    
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
    const {
      localisation,
      prixMin,
      prixMax,
      typeBien,
      meublee,
      statut,
      nbPiecesMin,
      nbPiecesMax,
      surfaceMin,
      surfaceMax,
      amenities,
      ascenseur,
      parking,
      climatisation,
      chauffage,
      balcon,
      jardin,
      piscine,
      etageMin,
      etageMax,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    console.log('🔍 Filtres reçus:', req.query);

    let filter = {};

    // Filtre par localisation (recherche partielle)
    if (localisation) {
      filter.localisation = { $regex: localisation.trim(), $options: 'i' };
    }

    // Filtre par prix (plage)
    if (prixMin || prixMax) {
      filter.prix = {};
      if (prixMin) filter.prix.$gte = parseFloat(prixMin);
      if (prixMax) filter.prix.$lte = parseFloat(prixMax);
    }

    // Filtre par type de bien
    if (typeBien) {
      const types = Array.isArray(typeBien) ? typeBien : typeBien.split(',');
      filter.typeBien = { $in: types.map(t => t.trim()) };
    }

    // Filtre par statut meublé
    if (meublee !== undefined) {
      filter.meublee = meublee === 'true';
    }

    // Filtre par statut de l'annonce
    if (statut) {
      const statuts = Array.isArray(statut) ? statut : statut.split(',');
      filter.statut = { $in: statuts.map(s => s.trim()) };
    }

    // Filtre par nombre de pièces
    if (nbPiecesMin || nbPiecesMax) {
      filter.nbPieces = {};
      if (nbPiecesMin) filter.nbPieces.$gte = parseInt(nbPiecesMin);
      if (nbPiecesMax) filter.nbPieces.$lte = parseInt(nbPiecesMax);
    }

    // Filtre par surface
    if (surfaceMin || surfaceMax) {
      filter.surface = {};
      if (surfaceMin) filter.surface.$gte = parseFloat(surfaceMin);
      if (surfaceMax) filter.surface.$lte = parseFloat(surfaceMax);
    }

    // Filtre par étage
    if (etageMin !== undefined || etageMax !== undefined) {
      filter.etage = {};
      if (etageMin !== undefined) filter.etage.$gte = parseInt(etageMin);
      if (etageMax !== undefined) filter.etage.$lte = parseInt(etageMax);
    }

    // Filtres par équipements (booléens)
    const booleanFilters = {
      ascenseur, parking, climatisation, chauffage, balcon, jardin, piscine
    };

    Object.keys(booleanFilters).forEach(key => {
      if (booleanFilters[key] !== undefined) {
        filter[key] = booleanFilters[key] === 'true';
      }
    });

    // Filtre par amenities (liste)
    if (amenities) {
      const amenitiesList = Array.isArray(amenities) ? amenities : amenities.split(',');
      filter.amenities = { $in: amenitiesList.map(a => new RegExp(a.trim(), 'i')) };
    }

    console.log('🔍 Filtre MongoDB construit:', JSON.stringify(filter, null, 2));

    // Configuration du tri
    const sortOptions = {};
    const validSortFields = ['prix', 'surface', 'nbPieces', 'createdAt', 'localisation'];
    const validSortOrders = ['asc', 'desc', 1, -1];

    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'desc' || sortOrder === -1 ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Tri par défaut
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Exécuter la requête avec pagination
    const [annonces, totalCount] = await Promise.all([
      Annonce.find(filter)
        .populate('proprietaire', 'nom prenom email photo_de_profile numTel facebook')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Annonce.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`📊 Résultats: ${annonces.length} annonces sur ${totalCount} total (page ${pageNum}/${totalPages})`);

    res.send({
      success: true,
      count: annonces.length,
      totalCount,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      annonces: annonces,
      filters: {
        applied: Object.keys(filter).length > 0,
        summary: Object.keys(filter)
      }
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des annonces:', err);
    res.status(500).send({
      success: false,
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
    const proprietaireId = req.params.proprietaireId;

    // Vérifier que l'utilisateur authentifié peut accéder à ces annonces
    if (req.user && req.user._id.toString() !== proprietaireId && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const annonces = await Annonce.find({ proprietaire: proprietaireId })
      .populate('proprietaire', 'nom prenom email photo_de_profile numTel facebook')
      .sort({ createdAt: -1 });

    // Statistiques pour le propriétaire
    const stats = {
      total: annonces.length,
      disponibles: annonces.filter(a => a.statut === 'disponible').length,
      enLocation: annonces.filter(a => a.statut === 'en_location').length,
      indisponibles: annonces.filter(a => a.statut === 'indisponible').length,
      totalRevenue: annonces
        .filter(a => a.statut === 'en_location')
        .reduce((sum, a) => sum + a.prix, 0)
    };

    res.send({
      success: true,
      count: annonces.length,
      annonces: annonces,
      stats: stats
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des annonces du propriétaire:', err);
    res.status(500).send({
      success: false,
      message: 'Erreur lors de la récupération des annonces du propriétaire',
      error: err.message
    });
  }
};

// Méthode pour les propriétaires - créer une annonce
exports.createByProprietaire = async (req, res) => {
  try {
    if (req.user.type !== 'proprietaire') {
      return res.status(403).json({ message: 'Seuls les propriétaires peuvent créer des annonces' });
    }

    console.log('📝 Création annonce par propriétaire:', req.user.nom, req.user.prenom);

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

    // Validation des champs requis
    if (!titre || !description || !localisation || !prix || !nbPieces || !surface || !typeBien) {
      return res.status(400).send({ message: 'Champs requis manquants' });
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return base64;
      });
      console.log(`📸 ${images.length} images converties en Base64`);
    } else {
      return res.status(400).send({ message: 'Au moins une image est requise' });
    }

    const annonce = new Annonce({
      titre: titre.trim(),
      description: description.trim(),
      localisation: localisation.trim(),
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
      proprietaire: req.user._id,
      telephone: telephone ? telephone.trim() : req.user.numTel,
      facebook: req.user.facebook || ''
    });

    const data = await annonce.save();
    await data.populate('proprietaire', 'nom prenom email photo_de_profile');

    console.log('✅ Annonce créée par propriétaire:', data.titre);
    res.status(201).send({
      success: true,
      message: 'Annonce créée avec succès',
      annonce: data
    });
  } catch (err) {
    console.error('❌ Erreur création annonce propriétaire:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).send({ message: `Erreur de validation: ${messages}` });
    }
    res.status(500).send({
      success: false,
      message: 'Erreur lors de la création de l\'annonce',
      error: err.message
    });
  }
};

// Méthode pour les propriétaires - modifier leur annonce
exports.updateByProprietaire = async (req, res) => {
  try {
    const annonceId = req.params.annonceId;
    const annonce = await Annonce.findById(annonceId);

    if (!annonce) {
      return res.status(404).json({ message: 'Annonce non trouvée' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (annonce.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette annonce' });
    }

    console.log('📝 Modification annonce par propriétaire:', req.user.nom, annonce.titre);

    // Gérer les nouvelles images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return base64;
      });
      req.body.images = newImages;
      console.log(`📸 ${newImages.length} nouvelles images ajoutées`);
    }

    // Convertir les valeurs booléennes
    const booleanFields = ['meublee', 'ascenseur', 'parking', 'climatisation', 'chauffage', 'balcon', 'jardin', 'piscine'];
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = req.body[field] === 'true';
      }
    });

    // Convertir les valeurs numériques
    if (req.body.prix) req.body.prix = parseFloat(req.body.prix);
    if (req.body.nbPieces) req.body.nbPieces = parseInt(req.body.nbPieces);
    if (req.body.surface) req.body.surface = parseFloat(req.body.surface);
    if (req.body.etage) req.body.etage = parseInt(req.body.etage);

    // Traiter les amenities
    if (req.body.amenities && typeof req.body.amenities === 'string') {
      req.body.amenities = req.body.amenities.split(',').map(item => item.trim());
    }

    const updatedAnnonce = await Annonce.findByIdAndUpdate(
      annonceId,
      req.body,
      { new: true, runValidators: true }
    ).populate('proprietaire', 'nom prenom email photo_de_profile');

    console.log('✅ Annonce modifiée:', updatedAnnonce.titre);
    res.json({
      success: true,
      message: 'Annonce modifiée avec succès',
      annonce: updatedAnnonce
    });
  } catch (err) {
    console.error('❌ Erreur modification annonce:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: `Erreur de validation: ${messages}` });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'annonce',
      error: err.message
    });
  }
};

// Méthode pour les propriétaires - supprimer leur annonce
exports.deleteByProprietaire = async (req, res) => {
  try {
    const annonceId = req.params.annonceId;
    const annonce = await Annonce.findById(annonceId);

    if (!annonce) {
      return res.status(404).json({ message: 'Annonce non trouvée' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (annonce.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer cette annonce' });
    }

    console.log('🗑️ Suppression annonce par propriétaire:', req.user.nom, annonce.titre);

    // Supprimer les images associées
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

    await Annonce.findByIdAndRemove(annonceId);

    console.log('✅ Annonce supprimée avec succès');
    res.json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });
  } catch (err) {
    console.error('❌ Erreur suppression annonce:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'annonce',
      error: err.message
    });
  }
};

// Méthode pour les propriétaires - changer le statut de leur annonce
exports.updateStatusByProprietaire = async (req, res) => {
  try {
    const { statut } = req.body;
    const annonceId = req.params.annonceId;

    if (!['disponible', 'indisponible', 'en_location'].includes(statut)) {
      return res.status(400).json({
        message: 'Statut invalide. Valeurs autorisées: disponible, indisponible, en_location'
      });
    }

    const annonce = await Annonce.findById(annonceId);
    if (!annonce) {
      return res.status(404).json({ message: 'Annonce non trouvée' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (annonce.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette annonce' });
    }

    const updatedAnnonce = await Annonce.findByIdAndUpdate(
      annonceId,
      { statut },
      { new: true, runValidators: true }
    ).populate('proprietaire', 'nom prenom email photo_de_profile');

    console.log('📊 Statut changé:', updatedAnnonce.titre, '->', statut);
    res.json({
      success: true,
      message: 'Statut de l\'annonce mis à jour avec succès',
      annonce: updatedAnnonce
    });
  } catch (err) {
    console.error('❌ Erreur changement statut:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
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

    // Vérification de l'autorisation - utiliser l'ID depuis les paramètres ou le body
    const proprietaireId = req.body.proprietaire || req.params.proprietaireId;
    if (!proprietaireId || annonce.proprietaire.toString() !== proprietaireId) {
      return res.status(403).send({
        message: 'Vous n\'êtes pas autorisé à supprimer cette annonce'
      });
    }

    // Supprimer les images associées
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
