import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20261016134000_make_lead_visit_property_many_to_many', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolon, execute each statement independently
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let okCount = 0;
  let errCount = 0;

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      okCount++;
    } catch (e: any) {
      errCount++;
      const msg = e.message || String(e);
      // Ignore "already exists" errors
      if (msg.includes('already exists') || msg.includes('does not exist') || msg.includes('n\'existe pas')) {
        console.log(`SKIP: ${statement.substring(0, 60)}... (${msg.split('\n')[0]})`);
      } else {
        console.error(`ERR: ${statement.substring(0, 60)}...`);
        console.error(msg.split('\n')[0]);
      }
    }
  }

  console.log(`\nDone: ${okCount} OK, ${errCount} skipped/errors`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());