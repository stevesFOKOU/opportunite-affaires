const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = require('../db/prisma');

// Simule une base de données en mémoire

// Clé secrète pour JWT (à remplacer par une variable d'environnement en production)
const JWT_SECRET = 'votre_clé_secrète_très_longue_et_sécurisée';
const JWT_EXPIRES_IN = '24h';

const ROLES = {
  admin: 'admin_central',
  agent: 'agent_regional',
  buyer: 'client_acheteur',
  seller: 'client_vendeur'
};

const AGENT_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected'
};

// Fonction utilitaire pour trouver un utilisateur par email
const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email } });

// Fonction utilitaire pour générer un token JWT
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    agentStatus: user.agentStatus
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Valider les données d'inscription
const validateRegistration = (userData) => {
  const { name, email, phone, password, confirmPassword, accountType } = userData;
  const errors = [];
  
  if (!name || name.length < 3) {
    errors.push('Le nom doit contenir au moins 3 caractères');
  }
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Veuillez fournir un email valide');
  }
  
  if (!phone || !/^[0-9+\s-]+$/.test(phone)) {
    errors.push('Veuillez fournir un numéro de téléphone valide');
  }
  
  if (!password || password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }
  
  if (password !== confirmPassword) {
    errors.push('Les mots de passe ne correspondent pas');
  }

  if (!accountType || !Object.keys(ROLES).includes(accountType)) {
    errors.push('Type de compte invalide');
  }
  
  return errors;
};

const seedAdminIfNeeded = () => {
  const email = process.env.ADMIN_EMAIL || 'admin@local.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  return prisma.user.findFirst({ where: { role: ROLES.admin } }).then(async (existingAdmin) => {
    const desiredPasswordHash = bcrypt.hashSync(password, 10);

    if (existingAdmin) {
      const needsEmailUpdate = existingAdmin.email !== email;
      const needsPasswordUpdate = !bcrypt.compareSync(password, existingAdmin.passwordHash);

      if (!needsEmailUpdate && !needsPasswordUpdate) return;

      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email,
          passwordHash: desiredPasswordHash
        }
      });

      return;
    }

    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          role: ROLES.admin,
          agentStatus: null,
          passwordHash: desiredPasswordHash
        }
      });

      return;
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: desiredPasswordHash,
        name: 'Admin',
        phone: '',
        role: ROLES.admin,
        agentStatus: null
      }
    });
  });
};

exports.initAuth = async () => {
  await seedAdminIfNeeded();
};

// Valider les données de connexion
const validateLogin = (email, password) => {
  const errors = [];
  
  if (!email || !password) {
    errors.push('Veuillez fournir un email et un mot de passe');
  }
  
  return errors;
};

// Enregistrer un nouvel utilisateur
exports.register = async (userData) => {
  const { name, email, phone, password, accountType } = userData;
  
  // Validation des données
  const errors = validateRegistration(userData);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  // Vérifier si l'utilisateur existe déjà
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('Un compte avec cet email existe déjà');
  }
  
  // Hacher le mot de passe
  const passwordHash = bcrypt.hashSync(password, 10);

  const role = ROLES[accountType];
  const agentStatus = role === ROLES.agent ? AGENT_STATUS.pending : null;
  
  try {
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role,
        agentStatus
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        agentStatus: true
      }
    });

    const token = generateToken(createdUser);
    return { user: createdUser, token };
  } catch (e) {
    if (e?.code === 'P2002') {
      throw new Error('Un compte avec cet email existe déjà');
    }
    throw e;
  }
};

// Connecter un utilisateur existant
exports.login = (email, password) => {
  // Validation des données
  const errors = validateLogin(email, password);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return findUserByEmail(email).then((user) => {
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const token = generateToken(user);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  });
};

// Vérifier un token JWT
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
};

// Récupérer un utilisateur par son ID
exports.getUserById = (id) => {
  return prisma.user
    .findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        agentStatus: true
      }
    })
    .then((user) => {
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      return user;
    });
};

exports.updateUserById = (id, updates) => {
  const allowedUpdates = {};
  if (typeof updates.name === 'string') allowedUpdates.name = updates.name;
  if (typeof updates.phone === 'string') allowedUpdates.phone = updates.phone;

  return prisma.user
    .update({
      where: { id },
      data: allowedUpdates,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        agentStatus: true
      }
    })
    .catch(() => {
      throw new Error('Utilisateur non trouvé');
    });
};

exports.listPendingAgents = () => {
  return prisma.user.findMany({
    where: {
      role: ROLES.agent,
      agentStatus: AGENT_STATUS.pending
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      agentStatus: true
    }
  });
};

exports.listApprovedAgents = () => {
  return prisma.user.findMany({
    where: {
      role: ROLES.agent,
      agentStatus: AGENT_STATUS.approved
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      agentStatus: true
    }
  });
};

exports.setAgentStatus = (agentId, status) => {
  if (!Object.values(AGENT_STATUS).includes(status)) {
    throw new Error('Statut agent invalide');
  }

  return prisma.user
    .findUnique({ where: { id: agentId } })
    .then((user) => {
      if (!user) throw new Error('Utilisateur non trouvé');
      if (user.role !== ROLES.agent) throw new Error('Utilisateur non agent');

      return prisma.user.update({
        where: { id: agentId },
        data: { agentStatus: status },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          agentStatus: true
        }
      });
    });
};

exports.ROLES = ROLES;
exports.AGENT_STATUS = AGENT_STATUS;
