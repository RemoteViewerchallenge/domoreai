
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const roleId = 'cmiho2dhf0000azs2nx0zt0cl';
  console.log(`Debugging Agent Start for Role: ${roleId}`);

  try {
    // 1. Fetch Role
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      console.error('Role not found!');
      return;
    }
    console.log('Role:', JSON.stringify(role, null, 2));

    // 2. Fetch Active Registry
    const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
    const tableName = config?.activeTableName || 'unified_models';
    console.log(`Active Table: ${tableName}`);

    // 3. Fetch Columns
    const columnsRaw = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`
    );
    const columns = columnsRaw.map(c => c.column_name);
    console.log('Columns:', columns);

    // 4. Check Type Column Values
    if (columns.includes('type')) {
      const types = await prisma.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT "type" FROM "${tableName}" LIMIT 20`
      );
      console.log('Distinct Types:', types);
    } else {
      console.log('No "type" column found.');
    }

    // 5. Simulate Query (Simplified)
    let query = `SELECT * FROM "${tableName}" WHERE 1=1`;
    
    // Type Filter Simulation
    if (columns.includes('type')) {
       const allowedTypes = ["'chat'", "'text-generation'"];
       if (role.needsCoding) allowedTypes.push("'coding'", "'code'");
       const typeList = allowedTypes.join(', ');
       query += ` AND ("type" IN (${typeList}) OR "type" IS NULL)`;
    }

    // Non-Chat Pattern Simulation
    const nonChatPatterns = ['veo', 'tts', 'whisper', 'dall-e', 'embedding', 'moderation'];
    const patternChecks = nonChatPatterns.map(p => `LOWER(model_id) LIKE '%${p}%'`).join(' OR ');
    
    if (columns.includes('type')) {
        query += ` AND ("type" IS NOT NULL OR NOT (${patternChecks}))`;
    } else {
        query += ` AND NOT (${patternChecks})`;
    }

    query += ` LIMIT 5`;
    console.log(`Simulated Query: ${query}`);

    const candidates = await prisma.$queryRawUnsafe<any[]>(query);
    console.log(`Found ${candidates.length} candidates.`);
    if (candidates.length > 0) {
        console.log('First candidate:', candidates[0]);
    } else {
        console.log('No candidates found. Dumping first 5 rows of table without filters:');
        const rawRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${tableName}" LIMIT 5`);
        console.log(rawRows);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
