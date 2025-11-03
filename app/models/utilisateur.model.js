const mongoose = require('mongoose');

const UtilisateurSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est requis'],
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'L\'email est requis'],
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
    },
    photo_de_profile: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['client', 'proprietaire' ,'admin'],
      default: 'client',
    },
    numTel: {
      type: String,
      required: [
        function () {
          return this.type === 'proprietaire';
        },
        'Le numéro de téléphone est requis pour les propriétaires',
      ],
    },
    facebook: {
      type: String,
      required: [
        function () {
          return this.type === 'proprietaire';
        },
        'Le lien Facebook est requis pour les propriétaires',
      ],
    },
    location: {
      type: String,
      required: [
        function () {
          return this.type === 'proprietaire';
        },
        'Le gouvernorat est requis pour les propriétaires',
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);