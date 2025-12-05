import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`DROP VIEW IF EXISTS unified_models CASCADE`;
    console.log('Dropped view unified_models');
  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

main();
