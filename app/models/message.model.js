const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom complet est requis'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'L\'adresse email est requise'],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Veuillez fournir une adresse email valide']
    },
    subject: {
      type: String,
      required: [true, 'Le sujet est requis'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Le message est requis'],
      trim: true
    }
  },
  {
    timestamps: true 
  }
);

module.exports = mongoose.model('Message', MessageSchema);
