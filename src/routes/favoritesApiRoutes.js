const express = require('express');

const prisma = require('../db/prisma');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: {
            photos: { orderBy: { sortOrder: 'asc' } },
            createdBy: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      }
    });

    res.status(200).json({ success: true, favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId
        }
      }
    });

    if (existing) {
      return res.status(200).json({ success: true, favorite: existing, created: false });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        propertyId
      }
    });

    res.status(201).json({ success: true, favorite, created: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;

    await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId
        }
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:propertyId/status', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const fav = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId
        }
      }
    });

    res.status(200).json({ success: true, isFavorite: Boolean(fav) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
