import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { prisma } from '../db.js';
import { TRPCError } from '@trpc/server';

const sanitize = (str: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(str)) throw new Error(`Invalid identifier: ${str}`);
  return `"${str}"`;
};

export const schemaRouter = createTRPCRouter({
  // 1. Get Table Schema (Crucial for seeing empty tables)
  getTableSchema: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(async ({ input }) => {
      // Postgres query to get column details
      const result = await prisma.$queryRawUnsafe<any[]>(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, input.tableName);
      return result.map(r => ({
        name: r.column_name as string,
        column_name: r.column_name as string, // Alias for frontend compatibility
        type: r.data_type as string,
        data_type: r.data_type as string, // Alias for frontend compatibility
        nullable: r.is_nullable === 'YES',
        is_nullable: r.is_nullable // Alias
      }));
    }),

  // 2. Add Column (The "Evolutionary" Tool)
  addColumn: publicProcedure
    .input(z.object({
      tableName: z.string(),
      columnName: z.string(),
      type: z.enum(['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT', 'JSONB', 'TIMESTAMP']),
      isProtected: z.boolean().default(false) // <--- The "Discretion" Toggle
    }))
    .mutation(async ({ input }) => {
      const table = sanitize(input.tableName);
      
      // AUTO-PROTECTION: Enforce naming convention
      let colName = input.columnName;
      if (input.isProtected && !colName.startsWith('sec_')) {
        colName = `sec_${colName}`; 
      }
      const col = sanitize(colName);

      let sql = '';
      // Always nullable (Fail Open) unless explicitly defaulted
      switch (input.type) {
        case 'TEXT': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} TEXT;`; break;
        case 'BOOLEAN': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT false;`; break;
        case 'INTEGER': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} INTEGER;`; break;
        case 'FLOAT': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} DOUBLE PRECISION;`; break;
        case 'JSONB': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} JSONB DEFAULT '{}';`; break;
        case 'TIMESTAMP': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} TIMESTAMP(3);`; break;
      }

      await prisma.$executeRawUnsafe(sql);
      return { success: true, column: colName };
    }),

  // 3. Drop a Column (Cleanup)
  dropColumn: publicProcedure
    .input(z.object({ tableName: z.string(), columnName: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${sanitize(input.tableName)} DROP COLUMN IF EXISTS ${sanitize(input.columnName)};`);
      return { success: true };
    }),

  // 4. Drop a Table (Hard Delete)
  dropTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${sanitize(input.tableName)} CASCADE;`);
      return { success: true };
    }),
    
  // 5. Get Tables (For the Sidebar)
  getTables: publicProcedure.query(async () => {
    const result = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma_%'
      ORDER BY tablename;
    `;
    return (result as any[]).map((r: any) => r.tablename as string);
  }),

  // 6. Create Table (Basic)
  createTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ input }) => {
      const tableName = sanitize(input.tableName);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE ${tableName} (
          id TEXT PRIMARY KEY,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `);
      return { success: true, tableName: input.tableName };
    }),

  // 7. Get Table Data (Simple Select)
  getTableData: publicProcedure
    .input(z.object({ tableName: z.string(), limit: z.number().min(1).max(1000).default(100) }))
    .query(async ({ input }) => {
      const tableName = sanitize(input.tableName);
      // Use queryRawUnsafe to select from dynamic table name
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM ${tableName} LIMIT ${input.limit}`);
      const countResult = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      // Handle BigInt serialization
      const serializedRows = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      const rowCount = Number(countResult[0]?.count || 0);

      return { rows: serializedRows, rowCount };
    }),

  // 8. Import JSON to Table
  importJsonToTable: publicProcedure
    .input(z.object({ 
      tableName: z.string(), 
      jsonString: z.string(),
      options: z.object({
        allowReserved: z.boolean().default(false),
        preserveIds: z.boolean().default(false),
        upsertOnConflict: z.boolean().default(false),
        useStrictSchema: z.boolean().default(false),
        auditReason: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      const { tableName, jsonString, options } = input;
      const safeTableName = sanitize(tableName);
      
      // Basic reserved table check
      const reservedTables = ['User', 'Account', 'Session', 'Role', 'Permission']; 
      if (reservedTables.includes(tableName) && !options?.allowReserved) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Refusing to import into reserved table "${tableName}" without explicit verification.`
        });
      }

      let data: any[];
      try {
        data = JSON.parse(jsonString);
        if (!Array.isArray(data)) {
            if (typeof data === 'object' && data !== null) data = [data]; 
            else throw new Error('Root must be array or object');
        }
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST', 
          message: 'Invalid JSON format'
        });
      }

      if (data.length === 0) return { success: true, rowCount: 0, tableName };

      // Simplified insert logic
      let insertedCount = 0;
      
      for (const row of data) {
         const keys = Object.keys(row).filter(k => k !== 'id' || options?.preserveIds);
         if (options?.preserveIds && row.id) {
            // Already included in keys if check passed, but double check not to duplicate
            if (!keys.includes('id')) keys.push('id');
         }
         
         if (keys.length === 0) continue;

         const cols = keys.map(k => `"${k}"`).join(', ');
         
         const vals = keys.map(k => {
             const v = row[k];
             if (v === null) return 'NULL';
             if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`; 
             if (typeof v === 'object') return `'${JSON.stringify(v)}'`;
             if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
             if (typeof v === 'number') return v;
             return 'NULL';
         }).join(', ');

         const query = `INSERT INTO ${safeTableName} (${cols}) VALUES (${vals}) ${
             options?.upsertOnConflict && row.id ? 
             `ON CONFLICT (id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}` : 
             ''
         }`;

         await prisma.$executeRawUnsafe(query);
         insertedCount++;
      }

      return { success: true, rowCount: insertedCount, tableName };
    })
});
