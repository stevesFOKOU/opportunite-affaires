const express = require('express');

const prisma = require('../db/prisma');
const upload = require('../middleware/uploadMiddleware');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

const requireAuth = authenticateToken;

const canCreateProperty = (user) => {
  if (!user) return false;
  if (user.role === 'admin_central') return true;
  if (user.role === 'agent_regional' && user.agentStatus === 'approved') return true;
  if (user.role === 'client_vendeur') return true;
  return false;
};

const canViewProperty = (user, property) => {
  if (property.status === 'published') return true;
  if (!user) return false;
  if (user.role === 'admin_central') return true;
  if (property.createdById === user.id) return true;
  return false;
};

router.get('/', async (req, res) => {
  try {
    const {
      q,
      type,
      priceMin,
      priceMax,
      surfaceMin,
      city,
      region,
      status,
      mine
    } = req.query;

    let user = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        user = require('../auth/authService').verifyToken(token);
      } catch {
        user = null;
      }
    }

    const where = {};

    if (mine === 'true') {
      if (!user) return res.status(401).json({ error: "Token d'authentification requis" });
      where.createdById = user.id;
    } else {
      if (status) where.status = status;
      else where.status = 'published';
    }

    if (type) where.type = type;
    if (city) where.city = city;
    if (region) where.region = region;

    const priceFilter = {};
    if (priceMin) priceFilter.gte = parseInt(priceMin, 10);
    if (priceMax) priceFilter.lte = parseInt(priceMax, 10);
    if (Object.keys(priceFilter).length > 0) where.price = priceFilter;

    if (surfaceMin) {
      const parsedSurfaceMin = parseInt(surfaceMin, 10);
      if (Number.isFinite(parsedSurfaceMin)) {
        where.surfaceM2 = { gte: parsedSurfaceMin };
      }
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { region: { contains: q, mode: 'insensitive' } }
      ];
    }

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

router.get('/mine/list', requireAuth, async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { createdById: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { photos: { orderBy: { sortOrder: 'asc' } } }
    });

    res.status(200).json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let user = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        user = require('../auth/authService').verifyToken(token);
      } catch {
        user = null;
      }
    }

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    if (!canViewProperty(user, property)) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    res.status(200).json({ success: true, property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, (req, res) => {
  upload.array('photos', 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: typeof err === 'string' ? err : err.message
      });
    }

    try {
      if (!canCreateProperty(req.user)) {
        return res.status(403).json({ success: false, error: 'Accès refusé' });
      }

      const {
        title,
        description,
        type,
        price,
        currency,
        surfaceM2,
        region,
        city,
        address
      } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Titre invalide' });
      }

      if (!description || typeof description !== 'string' || description.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'Description invalide' });
      }

      const allowedTypes = ['apartment', 'house', 'land', 'commercial'];
      if (!type || !allowedTypes.includes(type)) {
        return res.status(400).json({ success: false, error: 'Type invalide' });
      }

      const parsedPrice = parseInt(price, 10);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ success: false, error: 'Prix invalide' });
      }

      const status = req.user.role === 'client_vendeur' ? 'draft' : 'published';

      let parsedSurfaceM2 = null;
      if (surfaceM2 !== undefined && surfaceM2 !== null && String(surfaceM2).trim() !== '') {
        const v = parseInt(surfaceM2, 10);
        if (!Number.isFinite(v) || v <= 0) {
          return res.status(400).json({ success: false, error: 'Superficie invalide' });
        }
        parsedSurfaceM2 = v;
      }

      const photosData = (req.files || []).map((f, idx) => ({
        url: `/uploads/${f.filename}`,
        sortOrder: idx
      }));

      const property = await prisma.property.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          type,
          status,
          price: parsedPrice,
          currency: currency && typeof currency === 'string' ? currency : 'XAF',
          surfaceM2: parsedSurfaceM2,
          region: region && typeof region === 'string' ? region : null,
          city: city && typeof city === 'string' ? city : null,
          address: address && typeof address === 'string' ? address : null,
          createdById: req.user.id,
          photos: {
            create: photosData
          }
        },
        include: { photos: { orderBy: { sortOrder: 'asc' } } }
      });

      res.status(201).json({ success: true, property });
    } catch (error) {
      console.error('POST /api/properties failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

module.exports = router;
