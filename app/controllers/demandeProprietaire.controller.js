const DemandeProprietaire = require('../models/demandeProprietaire.model');
const Utilisateur = require('../models/utilisateur.model');

exports.create = async (req, res) => {
  try {
    const { utilisateurId } = req.body;

    const utilisateur = await Utilisateur.findById(utilisateurId);
    if (!utilisateur) {
      return res.status(404).send({ message: 'Utilisateur non trouvé' });
    }

    if (utilisateur.type === 'proprietaire') {
      return res.status(400).send({ message: 'Vous êtes déjà propriétaire' });
    }

    if (utilisateur.type === 'admin') {
      return res.status(400).send({ message: 'Les admins ne peuvent pas devenir propriétaires' });
    }

    // Vérifier si une demande existe déjà
    const demandeExistante = await DemandeProprietaire.findOne({
      utilisateur: utilisateurId,
      statut: 'en_attente'
    });

    if (demandeExistante) {
      return res.status(400).send({ message: 'Vous avez déjà une demande en attente' });
    }

    const demande = new DemandeProprietaire({
      utilisateur: utilisateurId,
      statut: 'en_attente'
    });

    const data = await demande.save();
    await data.populate('utilisateur', 'nom prenom email type');

    console.log('Demande créée:', data._id);
    res.status(201).send({
      message: 'Demande créée avec succès',
      demande: data
    });
  } catch (err) {
    console.error('Erreur lors de la création de la demande:', err);
    res.status(500).send({
      message: 'Erreur lors de la création de la demande',
      error: err.message
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { statut } = req.query;
    let filter = {};
    
    if (statut) {
      filter.statut = statut;
    }

    const demandes = await DemandeProprietaire.find(filter)
      .populate('utilisateur', 'nom prenom email type photo_de_profile')
      .populate('traitePar', 'nom prenom email')
      .sort({ dateDemande: -1 });

    res.send({
      count: demandes.length,
      demandes: demandes
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des demandes:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération des demandes',
      error: err.message
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const demande = await DemandeProprietaire.findById(req.params.demandeId)
      .populate('utilisateur', 'nom prenom email type photo_de_profile')
      .populate('traitePar', 'nom prenom email');

    if (!demande) {
      return res.status(404).send({
        message: 'Demande non trouvée avec l\'ID ' + req.params.demandeId
      });
    }

    res.send(demande);
  } catch (err) {
    console.error('Erreur lors de la récupération de la demande:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: 'Demande non trouvée avec l\'ID ' + req.params.demandeId
      });
    }
    res.status(500).send({
      message: 'Erreur lors de la récupération de la demande',
      error: err.message
    });
  }
};

exports.getByUtilisateur = async (req, res) => {
  try {
    const demande = await DemandeProprietaire.findOne({
      utilisateur: req.params.utilisateurId
    })
      .populate('utilisateur', 'nom prenom email type')
      .sort({ dateDemande: -1 });

    if (!demande) {
      return res.status(404).send({
        message: 'Aucune demande trouvée pour cet utilisateur'
      });
    }

    res.send(demande);
  } catch (err) {
    console.error('Erreur lors de la récupération de la demande:', err);
    res.status(500).send({
      message: 'Erreur lors de la récupération de la demande',
      error: err.message
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const { adminId } = req.body;
    const demandeId = req.params.demandeId;

    const admin = await Utilisateur.findById(adminId);
    if (!admin || admin.type !== 'admin') {
      return res.status(403).send({ message: 'Seuls les admins peuvent approuver les demandes' });
    }

    const demande = await DemandeProprietaire.findById(demandeId);
    if (!demande) {
      return res.status(404).send({ message: 'Demande non trouvée' });
    }

    if (demande.statut !== 'en_attente') {
      return res.status(400).send({ message: 'Cette demande a déjà été traitée' });
    }

    // Mettre à jour le type de l'utilisateur
    await Utilisateur.findByIdAndUpdate(
      demande.utilisateur,
      { type: 'proprietaire' }
    );

    // Mettre à jour la demande
    demande.statut = 'approuvee';
    demande.dateTraitement = new Date();
    demande.traitePar = adminId;
    await demande.save();

    await demande.populate('utilisateur', 'nom prenom email type');
    await demande.populate('traitePar', 'nom prenom email');

    console.log('Demande approuvée:', demande._id);
    res.send({
      message: 'Demande approuvée avec succès',
      demande: demande
    });
  } catch (err) {
    console.error('Erreur lors de l\'approbation de la demande:', err);
    res.status(500).send({
      message: 'Erreur lors de l\'approbation de la demande',
      error: err.message
    });
  }
};

exports.reject = async (req, res) => {
  try {
    const { adminId } = req.body;
    const demandeId = req.params.demandeId;

    const admin = await Utilisateur.findById(adminId);
    if (!admin || admin.type !== 'admin') {
      return res.status(403).send({ message: 'Seuls les admins peuvent rejeter les demandes' });
    }

    const demande = await DemandeProprietaire.findById(demandeId);
    if (!demande) {
      return res.status(404).send({ message: 'Demande non trouvée' });
    }

    if (demande.statut !== 'en_attente') {
      return res.status(400).send({ message: 'Cette demande a déjà été traitée' });
    }

    demande.statut = 'rejetee';
    demande.dateTraitement = new Date();
    demande.traitePar = adminId;
    await demande.save();

    await demande.populate('utilisateur', 'nom prenom email type');
    await demande.populate('traitePar', 'nom prenom email');

    console.log('Demande rejetée:', demande._id);
    res.send({
      message: 'Demande rejetée',
      demande: demande
    });
  } catch (err) {
    console.error('Erreur lors du rejet de la demande:', err);
    res.status(500).send({
      message: 'Erreur lors du rejet de la demande',
      error: err.message
    });
  }
};

