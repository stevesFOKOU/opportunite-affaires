const express = require('express');
const prisma = require('../db/prisma');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Obtenir mon profil
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        bio: true,
        company: true,
        address: true,
        city: true,
        region: true,
        role: true,
        agentStatus: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            favorites: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour mon profil
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, bio, company, address, city, region } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        bio,
        company,
        address,
        city,
        region
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        bio: true,
        company: true,
        address: true,
        city: true,
        region: true,
        role: true,
        agentStatus: true
      }
    });

    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Changer le mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcryptjs');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Mots de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Mot de passe modifié' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
