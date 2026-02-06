const express = require('express');
const { register, login, verifyToken, getUserById, updateUserById } = require('./authService');

const router = express.Router();

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }
  
  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, accountType } = req.body;
    
    // Appeler le service d'inscription
    const result = await register({
      name,
      email,
      phone,
      password,
      confirmPassword,
      accountType
    });
    
    // Renvoyer la réponse avec le token et les données utilisateur
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token: result.token,
      user: result.user
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Une erreur est survenue lors de l\'inscription'
    });
  }
});

// Mettre à jour le profil de l'utilisateur connecté
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const updatedUser = await updateUserById(req.user.id, {
      name: req.body.name,
      phone: req.body.phone
    });

    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Une erreur est survenue lors de la mise à jour du profil'
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un email et un mot de passe'
      });
    }
    
    // Appeler le service de connexion
    const result = await login(email, password);
    
    // Renvoyer la réponse avec le token et les données utilisateur
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token: result.token,
      user: result.user
    });
    
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Email ou mot de passe incorrect'
    });
  }
});

// Route protégée pour récupérer le profil de l'utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'utilisateur à partir de la base de données
    const user = await getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la récupération du profil'
    });
  }
});

// Route de déconnexion (côté client, il suffit de supprimer le token)
router.post('/logout', (req, res) => {
  // La déconnexion est gérée côté client en supprimant le token
  res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

module.exports = router;
