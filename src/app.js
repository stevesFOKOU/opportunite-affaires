require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRouter = require('./auth/authController');
const adminRouter = require('./routes/adminRoutes');
const propertiesApiRouter = require('./routes/propertiesApiRoutes');
const favoritesApiRouter = require('./routes/favoritesApiRoutes');
const visitsApiRouter = require('./routes/visitsApiRoutes');
const leadsApiRouter = require('./routes/leadsApiRoutes');
const profileApiRouter = require('./routes/profileApiRoutes');
const notificationsApiRouter = require('./routes/notificationsApiRoutes');

const app = express();

// CORS configuration - en production, le frontend est servi par le même serveur
const corsOptions = process.env.NODE_ENV === 'production' 
  ? { origin: true, credentials: true }
  : {
      origin: ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3001"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    };

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes API
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/properties', propertiesApiRouter);
app.use('/api/favorites', favoritesApiRouter);
app.use('/api/visits', visitsApiRouter);
app.use('/api/leads', leadsApiRouter);
app.use('/api/profile', profileApiRouter);
app.use('/api/notifications', notificationsApiRouter);

// Servir le frontend statique (en production)
app.use(express.static(path.join(__dirname, '..', 'real-estate-light')));

// Toutes les routes non-API renvoient vers index.html (SPA fallback)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  // Si le fichier existe, express.static l'a déjà servi
  // Sinon, on renvoie index.html pour le routing côté client
  res.sendFile(path.join(__dirname, '..', 'real-estate-light', 'index.html'));
});

module.exports = app;
