const mongoose = require('mongoose');

const AnnonceSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
    },
    
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
    },
    
    localisation: {
      type: String,
      required: [true, 'La localisation est requise'],
      trim: true
    },
    
    prix: {
      type: Number,
      required: [true, 'Le prix est requis'],
      min: [0, 'Le prix ne peut pas être négatif']
    },
    
    nbPieces: {
      type: Number,
      required: [true, 'Le nombre de pièces est requis'],
      min: [1, 'Le nombre de pièces doit être au moins 1']
    },
    
    meublee: {
      type: Boolean,
      default: false
    },
    
    images: [{
      type: String,
      required: [true, 'Au moins une image est requise']
    }],
    
    amenities: [{
      type: String,
      trim: true
    }],
    
    statut: {
      type: String,
      enum: ['disponible', 'indisponible', 'en_location'],
      default: 'disponible'
    },
    
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'Le propriétaire est requis']
    },
    
    telephone: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis']
    },
    
    facebook: {
      type: String,
      required: false
    },
    
    surface: {
      type: Number,
      required: [true, 'La surface est requise'],
      min: [1, 'La surface doit être au moins 1m²']
    },
    
    typeBien: {
      type: String,
      enum: ['appartement', 'maison', 'villa', 'studio', 'duplex'],
      required: [true, 'Le type de bien est requis']
    },
    
    etage: {
      type: Number,
      min: [0, 'L\'étage ne peut pas être négatif']
    },
    
    ascenseur: {
      type: Boolean,
      default: false
    },
    
    parking: {
      type: Boolean,
      default: false
    },
    
    climatisation: {
      type: Boolean,
      default: false
    },
    
    chauffage: {
      type: Boolean,
      default: false
    },
    
    balcon: {
      type: Boolean,
      default: false
    },
    
    jardin: {
      type: Boolean,
      default: false
    },
    
    piscine: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

AnnonceSchema.index({ localisation: 1, prix: 1, statut: 1 });
AnnonceSchema.index({ proprietaire: 1 });

AnnonceSchema.virtual('imagesUrls').get(function() {
  return this.images.map(image => {
    if (image.startsWith('http')) {
      return image;
    }
    return `http://localhost:5000/uploads/${image}`;
  });
});

AnnonceSchema.virtual('proprietaireInfo').get(function() {
  return {
    nom: this.proprietaire?.nom || '',
    prenom: this.proprietaire?.prenom || '',
    email: this.proprietaire?.email || '',
    photo: this.proprietaire?.photo_de_profile || ''
  };
});

AnnonceSchema.set('toJSON', { virtuals: true });
AnnonceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Annonce', AnnonceSchema);
