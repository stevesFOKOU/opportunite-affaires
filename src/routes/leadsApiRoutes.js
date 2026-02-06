const express = require('express');
const prisma = require('../db/prisma');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Créer un lead (contact depuis une annonce)
router.post('/', async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;

    if (!propertyId || !name || !phone) {
      return res.status(400).json({ success: false, error: 'Propriété, nom et téléphone requis' });
    }

    // Trouver l'agent de la propriété
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { createdById: true }
    });

    const lead = await prisma.lead.create({
      data: {
        propertyId,
        name,
        email,
        phone,
        message,
        agentId: property?.createdById
      },
      include: {
        property: { select: { id: true, title: true } }
      }
    });

    res.status(201).json({ success: true, lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Leads pour mes propriétés (agent/vendeur)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { agentId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, city: true } }
      }
    });

    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats du pipeline
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.lead.groupBy({
      by: ['status'],
      where: { agentId: req.user.id },
      _count: { id: true }
    });

    const pipeline = {
      nouveau: 0,
      contacte: 0,
      visite: 0,
      offre: 0,
      negociation: 0,
      reserve: 0,
      vendu: 0,
      perdu: 0
    };

    stats.forEach(s => {
      pipeline[s.status] = s._count.id;
    });

    res.json({ success: true, pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour un lead
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, nextAction, nextActionDate } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead non trouvé' });
    }

    if (lead.agentId !== req.user.id && req.user.role !== 'admin_central') {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status,
        notes,
        nextAction,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null
      },
      include: {
        property: { select: { id: true, title: true } }
      }
    });

    res.json({ success: true, lead: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Supprimer un lead
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead non trouvé' });
    }

    if (lead.agentId !== req.user.id && req.user.role !== 'admin_central') {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    await prisma.lead.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
