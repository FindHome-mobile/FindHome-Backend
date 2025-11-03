const Utilisateur = require('../models/utilisateur.model');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const convertBufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

exports.create = async (req, res) => {
  try {
    console.log('Request body:', req.body); 
    console.log('Uploaded file:', req.file); 

    const hashedPassword = await bcrypt.hash(req.body.motDePasse, 10);

    let photoBase64 = '';
    if (req.file) {
      photoBase64 = convertBufferToBase64(req.file.buffer, req.file.mimetype);
      console.log('📸 Image convertie en Base64');
    }

    const utilisateur = new Utilisateur({
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      motDePasse: hashedPassword,
      photo_de_profile: photoBase64, 
      type: req.body.type,
      numTel: req.body.numTel || '',
      facebook: req.body.facebook || '',
      location: req.body.location || '',
    });

    const data = await utilisateur.save();
    console.log('User created:', data.email);
    res.status(201).send(data);
  } catch (err) {
    console.error('Error creating user:', err.stack); 
    if (err.code === 11000) {
      res.status(400).send({ message: "L'email existe déjà" });
    } else if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      res.status(400).send({ message: `Erreur de validation: ${messages}` });
    } else {
      res.status(500).send({
        message: err.message || "Une erreur est survenue lors de la création de l'utilisateur.",
        error: err.stack,
      });
    }
  }
};

exports.findAll = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find();
    res.send(utilisateurs);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send({
      message: err.message || 'Une erreur est survenue lors de la récupération des utilisateurs.',
    });
  }
};

exports.findProprietaires = async (req, res) => {
  try {
    const proprietaires = await Utilisateur.find({ type: 'proprietaire' }).select('-motDePasse');
    res.send(proprietaires);
  } catch (err) {
    console.error('Error fetching proprietaires:', err);
    res.status(500).send({
      message: err.message || 'Une erreur est survenue lors de la récupération des propriétaires.',
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.utilisateurId);
    if (!utilisateur) {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }
    res.send(utilisateur);
  } catch (err) {
    console.error('Error fetching user:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }
    res.status(500).send({
      message: 'Erreur lors de la récupération de l\'utilisateur avec l\'ID ' + req.params.utilisateurId,
      errorDetails: err.message,
    });
  }
};

exports.update = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: 'Les données à mettre à jour ne peuvent pas être vides !',
    });
  }

  try {
    const utilisateur = await Utilisateur.findByIdAndUpdate(
      req.params.utilisateurId,
      req.body,
      { new: true }
    );

    if (!utilisateur) {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }

    res.send(utilisateur);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }
    res.status(500).send({
      message: 'Erreur lors de la mise à jour de l\'utilisateur avec l\'ID ' + req.params.utilisateurId,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, email, numTel, facebook, location } = req.body;
    
    if (!nom || !prenom || !email) {
      return res.status(400).send({ message: "Nom, prénom et email sont requis" });
    }

    const updateData = { nom, prenom, email };
    
    if (numTel !== undefined) updateData.numTel = numTel;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (location !== undefined) updateData.location = location;

    if (req.file) {
      const photoBase64 = convertBufferToBase64(req.file.buffer, req.file.mimetype);
      updateData.photo_de_profile = photoBase64;
      console.log(`📸 Nouvelle photo convertie en Base64`);
    }

    const utilisateur = await Utilisateur.findByIdAndUpdate(
      req.params.utilisateurId,
      updateData,
      { new: true, runValidators: true }
    ).select('-motDePasse');

    if (!utilisateur) {
      return res.status(404).send({ message: 'Utilisateur non trouvé' });
    }

    res.send({
      message: 'Profil mis à jour avec succès',
      utilisateur: {
        ...utilisateur.toObject(),
        photo_de_profile: utilisateur.photo_de_profile
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    if (err.code === 11000) {
      return res.status(400).send({ message: 'Cet email est déjà utilisé' });
    }
    res.status(500).send({
      message: 'Erreur lors de la mise à jour du profil',
      error: err.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).send({
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    const utilisateur = await Utilisateur.findById(req.params.utilisateurId);
    if (!utilisateur) {
      return res.status(404).send({
        message: 'Utilisateur non trouvé'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, utilisateur.motDePasse);
    if (!isCurrentPasswordValid) {
      return res.status(400).send({
        message: 'Mot de passe actuel incorrect'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await Utilisateur.findByIdAndUpdate(
      req.params.utilisateurId,
      { motDePasse: hashedNewPassword }
    );

    console.log('Password changed for user:', utilisateur.email);
    res.send({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).send({
      message: 'Erreur lors de la modification du mot de passe',
      error: err.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findByIdAndRemove(req.params.utilisateurId);
    if (!utilisateur) {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }
    console.log('User deleted:', utilisateur.email);
    res.send({ message: 'Utilisateur supprimé avec succès !' });
  } catch (err) {
    console.error('Error deleting user:', err);
    if (err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: 'Utilisateur non trouvé avec l\'ID ' + req.params.utilisateurId,
      });
    }
    res.status(500).send({
      message: 'Impossible de supprimer l\'utilisateur avec l\'ID ' + req.params.utilisateurId,
    });
  }
};

exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  try {
    const utilisateur = await Utilisateur.findOne({ email });

    if (!utilisateur) {
      return res.status(404).send({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!isMatch) {
      return res.status(400).send({ message: 'Mot de passe invalide' });
    }

    const photoUrl = utilisateur.photo_de_profile ? 
      `http://localhost:5000/uploads/${utilisateur.photo_de_profile}` : null;

    console.log('User logged in:', utilisateur.email);
    res.send({
      id: utilisateur._id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      type: utilisateur.type,
      photo_de_profile: utilisateur.photo_de_profile,
      photo_url: photoUrl,
      location: utilisateur.location,
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send({ message: 'Erreur lors de la connexion' });
  }
};

exports.forgotPassword = async (req, res) => {
  console.log('ForgotPassword request:', req.body);
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).send({ message: 'Email et mot de passe requis' });
    }

    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      return res.status(404).send({ message: 'Utilisateur non trouvé' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    utilisateur.motDePasse = hashedPassword;

    await utilisateur.save();
    console.log('Password reset for:', email);
    res.status(200).send({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    res.status(500).send({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};