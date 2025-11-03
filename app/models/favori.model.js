const mongoose = require('mongoose');

const FavoriSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'Le client est requis']
    },
    
    annonce: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Annonce',
      required: [true, 'L\'annonce est requise']
    },
    
    dateAjout: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

FavoriSchema.index({ client: 1, annonce: 1 }, { unique: true });

FavoriSchema.index({ client: 1 });
FavoriSchema.index({ annonce: 1 });

module.exports = mongoose.model('Favori', FavoriSchema);
