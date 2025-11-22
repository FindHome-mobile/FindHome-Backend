const mongoose = require('mongoose');

const DemandeProprietaireSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'L\'utilisateur est requis']
    },
    statut: {
      type: String,
      enum: ['en_attente', 'approuvee', 'rejetee'],
      default: 'en_attente'
    },
    dateDemande: {
      type: Date,
      default: Date.now
    },
    dateTraitement: {
      type: Date
    },
    traitePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur'
    }
  },
  {
    timestamps: true
  }
);

DemandeProprietaireSchema.index({ utilisateur: 1 });
DemandeProprietaireSchema.index({ statut: 1 });

module.exports = mongoose.model('DemandeProprietaire', DemandeProprietaireSchema);

