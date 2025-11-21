require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration intelligente des fichiers statiques
const uploadsDir = path.join(__dirname, 'Uploads');

// Vérifier que le dossier Uploads existe, sinon le créer
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Dossier Uploads créé');
}

// Servir les fichiers statiques avec plusieurs chemins pour la compatibilité
app.use('/uploads', express.static(uploadsDir));
app.use('/Uploads', express.static(uploadsDir));
app.use('/images', express.static(uploadsDir));

// Route de test pour vérifier l'accès aux images
app.get('/test-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(imagePath)) {
    console.log(`✅ Image trouvée: ${filename}`);
    console.log(`📁 Chemin complet: ${imagePath}`);
    console.log(`📊 Taille: ${(fs.statSync(imagePath).size / 1024).toFixed(2)} KB`);
    res.sendFile(imagePath);
  } else {
    console.log(`❌ Image non trouvée: ${filename}`);
    console.log(`🔍 Chemin recherché: ${imagePath}`);
    res.status(404).send(`Image ${filename} non trouvée`);
  }
});

// Route pour lister toutes les images disponibles
app.get('/list-images', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const images = files.filter(file => 
      /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file)
    );
    
    res.json({
      message: 'Images disponibles',
      count: images.length,
      uploadsDir: uploadsDir,
      images: images.map(img => ({
        name: img,
        url: `/uploads/${img}`,
        fullUrl: `http://localhost:5000/uploads/${img}`,
        size: fs.statSync(path.join(uploadsDir, img)).size,
        sizeKB: (fs.statSync(path.join(uploadsDir, img)).size / 1024).toFixed(2)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture du dossier', details: error.message });
  }
});

// Route pour vérifier le statut du serveur et des images
app.get('/server-status', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const images = files.filter(file => 
      /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file)
    );
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uploadsDir: uploadsDir,
      uploadsDirExists: fs.existsSync(uploadsDir),
      totalFiles: files.length,
      imageFiles: images.length,
      staticRoutes: ['/uploads', '/Uploads', '/images'],
      sampleImage: images.length > 0 ? {
        name: images[0],
        url: `/uploads/${images[0]}`,
        fullUrl: `http://localhost:5000/uploads/${images[0]}`
      } : null
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      uploadsDir: uploadsDir,
      uploadsDirExists: fs.existsSync(uploadsDir)
    });
  }
});

// Vérifier la variable DB_URL
const dbConfig = process.env.DB_URL;
if (!dbConfig) {
  console.error('Erreur : DB_URL non défini dans le fichier .env.');
  process.exit(1);
}

// Connexion à MongoDB
mongoose
  .connect(dbConfig, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connecté à la base de données MongoDB'))
  .catch((err) => {
    console.error('Impossible de se connecter à la base de données :', err);
    process.exit(1);
  });

// Routes
app.use('/api/utilisateurs', require('./app/routes/utilisateur.routes'));
app.use('/api/annonces', require('./app/routes/annonce.routes'));
app.use('/api/favoris', require('./app/routes/favori.routes'));
app.use('/api/messages', require('./app/routes/message.routes'));
app.use('/api/demandes-proprietaire', require('./app/routes/demandeProprietaire.routes'));
// Route de base
app.get('/', (req, res) => {
  res.send('Serveur HomeFind en fonctionnement');
});

// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  console.log(`📁 Dossier Uploads: ${uploadsDir}`);
  console.log(`🖼️  Images accessibles via: /uploads/, /Uploads/, /images/`);
  console.log(`🧪 Test d'images: /test-image/[nom_fichier]`);
  console.log(`📋 Liste des images: /list-images`);
});