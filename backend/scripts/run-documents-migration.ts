import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20261016182000_add_property_documents', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log(`OK: ${statement.substring(0, 70)}...`);
    } catch (e: any) {
      console.error(`ERR: ${statement.substring(0, 70)}...`);
      console.error(e.message.split('\n')[0]);
    }
  }

  console.log('Migration executed successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());