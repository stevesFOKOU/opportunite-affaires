const express = require('express');
const prisma = require('../db/prisma');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Créer une demande de visite
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { propertyId, preferredDate, message } = req.body;

    if (!propertyId || !preferredDate) {
      return res.status(400).json({ success: false, error: 'Propriété et date requises' });
    }

    const visit = await prisma.visitRequest.create({
      data: {
        propertyId,
        requesterId: req.user.id,
        preferredDate: new Date(preferredDate),
        message
      },
      include: {
        property: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    res.status(201).json({ success: true, visit });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Mes demandes de visite (en tant que demandeur)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const visits = await prisma.visitRequest.findMany({
      where: { requesterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, title: true, city: true, photos: { take: 1 } }
        }
      }
    });

    res.json({ success: true, visits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Visites pour mes propriétés (en tant qu'agent/propriétaire)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const visits = await prisma.visitRequest.findMany({
      where: {
        property: { createdById: req.user.id }
      },
      orderBy: { preferredDate: 'asc' },
      include: {
        property: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    res.json({ success: true, visits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour le statut d'une visite
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, agentNotes } = req.body;

    // Vérifier que l'utilisateur est le propriétaire de l'annonce
    const visit = await prisma.visitRequest.findUnique({
      where: { id },
      include: { property: { select: { createdById: true } } }
    });

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visite non trouvée' });
    }

    if (visit.property.createdById !== req.user.id && req.user.role !== 'admin_central') {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    const updated = await prisma.visitRequest.update({
      where: { id },
      data: { status, agentNotes },
      include: {
        property: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    res.json({ success: true, visit: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Créneaux disponibles pour une propriété (simulation)
router.get('/slots/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Générer des créneaux pour les 14 prochains jours
    const slots = [];
    const now = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Pas de visites le dimanche
      if (date.getDay() === 0) continue;
      
      // Créneaux: 9h, 11h, 14h, 16h
      [9, 11, 14, 16].forEach(hour => {
        const slot = new Date(date);
        slot.setHours(hour, 0, 0, 0);
        slots.push({
          datetime: slot.toISOString(),
          available: true
        });
      });
    }

    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
