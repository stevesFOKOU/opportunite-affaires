const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const agencies = [
  {
    name: 'Immobilier Prestige Yaoundé',
    email: 'contact@prestige-yaounde.cm',
    phone: '+237 699 123 456',
    password: 'agent123'
  },
  {
    name: 'Century 21 Cameroun',
    email: 'info@century21.cm',
    phone: '+237 677 234 567',
    password: 'agent123'
  },
  {
    name: 'Afrique Immobilier',
    email: 'contact@afrique-immo.cm',
    phone: '+237 655 345 678',
    password: 'agent123'
  },
  {
    name: 'Douala Properties',
    email: 'info@douala-properties.cm',
    phone: '+237 690 456 789',
    password: 'agent123'
  },
  {
    name: 'Cameroon Real Estate',
    email: 'contact@cameroon-realestate.cm',
    phone: '+237 678 567 890',
    password: 'agent123'
  },
  {
    name: 'Bastos Immobilier',
    email: 'info@bastos-immo.cm',
    phone: '+237 691 678 901',
    password: 'agent123'
  }
];

async function seedAgencies() {
  console.log('🏢 Ajout des agences...\n');

  for (const agency of agencies) {
    const existing = await prisma.user.findUnique({
      where: { email: agency.email }
    });

    if (existing) {
      console.log(`⏭️  ${agency.name} existe déjà`);
      continue;
    }

    const passwordHash = await bcrypt.hash(agency.password, 10);

    await prisma.user.create({
      data: {
        name: agency.name,
        email: agency.email,
        phone: agency.phone,
        passwordHash,
        role: 'agent_regional',
        agentStatus: 'approved'
      }
    });

    console.log(`✅ ${agency.name} ajouté`);
  }

  console.log('\n🎉 Terminé !');
  console.log('\nLes agences peuvent se connecter avec:');
  console.log('- Email: leur email ci-dessus');
  console.log('- Mot de passe: agent123');
}

seedAgencies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
