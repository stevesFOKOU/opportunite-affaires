process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

const path = require('path');
const fs = require('fs');

const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const prisma = require('../src/db/prisma');

const ensureAdminExists = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@local.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin_central' } });
  if (existingAdmin) return { email: existingAdmin.email, password };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Admin',
      role: 'admin_central',
      agentStatus: null
    }
  });

  return { email, password };
};

const writeTempPng = () => {
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, `test-${Date.now()}.png`);

  // Minimal 1x1 transparent PNG
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOqZ6mQAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
  return filePath;
};

describe('Properties API (upload + validation)', () => {
  let token;

  beforeAll(async () => {
    const { email, password } = await ensureAdminExists();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    token = res.body?.token;
    if (!token) {
      throw new Error('Unable to login admin in tests');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('creates a property with photo upload', async () => {
    const imgPath = writeTempPng();

    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test annonce')
      .field('description', 'Description suffisamment longue pour passer la validation.')
      .field('type', 'apartment')
      .field('price', '250000')
      .attach('photos', imgPath);

    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.property?.id).toBeTruthy();
    expect(Array.isArray(res.body?.property?.photos)).toBe(true);
  });

  test('rejects invalid price', async () => {
    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test annonce')
      .field('description', 'Description suffisamment longue pour passer la validation.')
      .field('type', 'apartment')
      .field('price', '-1');

    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });

  test('rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test annonce')
      .field('description', 'Description suffisamment longue pour passer la validation.')
      .field('type', 'invalid')
      .field('price', '100');

    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });
});
