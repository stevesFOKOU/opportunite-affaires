const express = require('express');
const { verifyToken, listPendingAgents, listApprovedAgents, setAgentStatus, AGENT_STATUS, ROLES } = require('../auth/authService');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token d'authentification requis" });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.admin) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
};

router.get('/agents/pending', authenticateToken, requireAdmin, (req, res) => {
  listPendingAgents()
    .then((agents) => res.status(200).json({ success: true, agents }))
    .catch((error) => res.status(500).json({ success: false, error: error.message }));
});

router.get('/agents', (req, res) => {
  listApprovedAgents()
    .then((agents) => res.status(200).json({ success: true, agents }))
    .catch((error) => res.status(500).json({ success: false, error: error.message }));
});

router.patch('/agents/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  setAgentStatus(req.params.id, AGENT_STATUS.approved)
    .then((updated) => res.status(200).json({ success: true, agent: updated }))
    .catch((error) => res.status(400).json({ success: false, error: error.message }));
});

router.patch('/agents/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  setAgentStatus(req.params.id, AGENT_STATUS.rejected)
    .then((updated) => res.status(200).json({ success: true, agent: updated }))
    .catch((error) => res.status(400).json({ success: false, error: error.message }));
});

const prisma = require('../db/prisma');

router.get('/properties', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.status(200).json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/properties/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ success: false, error: 'Annonce non trouvée' });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { status: 'published' },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.status(200).json({ success: true, property: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/properties/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ success: false, error: 'Annonce non trouvée' });
    }

    await prisma.property.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Annonce supprimée' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
