const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAgencies() {
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'info@century21.cm',
          'info@douala-properties.cm',
          'info@bastos-immo.cm'
        ]
      }
    }
  });
  console.log(`${result.count} agences supprimées`);
}

deleteAgencies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
