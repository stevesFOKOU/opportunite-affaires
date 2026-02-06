const express = require('express');
const prisma = require('../db/prisma');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Obtenir les compteurs de notifications
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let counts = {
      newLeads: 0,
      pendingVisits: 0,
      unreadMessages: 0,
      pendingProperties: 0,
      pendingAgents: 0
    };

    // Leads non traités (nouveau) pour agents/vendeurs
    if (['agent_regional', 'client_vendeur', 'admin_central'].includes(userRole)) {
      counts.newLeads = await prisma.lead.count({
        where: {
          agentId: userId,
          status: 'nouveau'
        }
      });

      // Visites en attente
      counts.pendingVisits = await prisma.visitRequest.count({
        where: {
          property: { createdById: userId },
          status: 'pending'
        }
      });
    }

    // Messages non lus
    counts.unreadMessages = await prisma.message.count({
      where: {
        conversation: {
          participants: {
            some: { userId: userId }
          }
        },
        senderId: { not: userId },
        read: false
      }
    });

    // Admin: propriétés et agents en attente
    if (userRole === 'admin_central') {
      counts.pendingProperties = await prisma.property.count({
        where: { status: 'draft' }
      });

      counts.pendingAgents = await prisma.user.count({
        where: {
          role: 'agent_regional',
          agentStatus: 'pending'
        }
      });
    }

    // Total
    counts.total = counts.newLeads + counts.pendingVisits + counts.unreadMessages + 
                   counts.pendingProperties + counts.pendingAgents;

    res.json({ success: true, counts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Marquer les leads comme vus
router.post('/mark-leads-seen', authenticateToken, async (req, res) => {
  try {
    await prisma.lead.updateMany({
      where: {
        agentId: req.user.id,
        status: 'nouveau'
      },
      data: {
        status: 'contacte'
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
