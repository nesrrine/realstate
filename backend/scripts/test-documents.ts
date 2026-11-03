import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if property_documents table exists
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM "property_documents" LIMIT 1`);
    console.log('property_documents table exists:', result);
  } catch (e: any) {
    console.error('property_documents table error:', e.message);
  }

  // Try a simple property query
  try {
    const props = await prisma.property.findMany({
      take: 1,
      include: {
        documents: true,
      },
    });
    console.log('Property query works:', props.length, 'properties found');
  } catch (e: any) {
    console.error('Property query error:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());