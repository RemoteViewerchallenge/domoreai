import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Flatten a nested JSON object into a flat structure
 * Example: { user: { name: "John" } } => { "user.name": "John" }
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Infer Postgres column type from a value
 */
function inferColumnType(value: any): string {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
  }
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (typeof value === 'string') {
    // If it looks like a JSON string, use JSONB
    if (value.startsWith('[') || value.startsWith('{')) return 'JSONB';
    return 'TEXT';
  }
  // For objects/arrays, store as JSONB
  if (typeof value === 'object') return 'JSONB';
  return 'TEXT';
}

/**
 * Sanitize table/column names to be Postgres-safe
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&') // Prefix with _ if starts with number
    .substring(0, 63); // Postgres max identifier length
}

/**
 * Flatten raw JSON data and create a Postgres table
 */
export async function flattenRawData(rawDataId: string, tableName: string) {
  // 1. Fetch the raw data
  const rawDataRecord = await prisma.rawDataLake.findUnique({
    where: { id: rawDataId },
  });

  if (!rawDataRecord) {
    throw new Error(`Raw data record not found: ${rawDataId}`);
  }

  // 2. Flatten the JSON
  const rawData = rawDataRecord.rawData as any;
  const dataArray = Array.isArray(rawData) ? rawData : [rawData];
  
  if (dataArray.length === 0) {
    throw new Error('No data to flatten');
  }

  // Flatten all objects and collect all unique keys
  const flattenedRows = dataArray.map(item => flattenObject(item));
  const allKeys = new Set<string>();
  flattenedRows.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  // 3. Infer column types from first row
  const columns = Array.from(allKeys).map(key => {
    const sampleValue = flattenedRows[0][key];
    return {
      name: sanitizeName(key),
      originalName: key,
      type: inferColumnType(sampleValue),
    };
  });

  // 4. Create the Postgres table
  const safeTableName = sanitizeName(tableName);
  const columnDefs = columns
    .map(col => `"${col.name}" ${col.type}`)
    .join(', ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${safeTableName}" (
      id SERIAL PRIMARY KEY,
      ${columnDefs}
    )
  `);

  // 5. Insert the data
  for (const row of flattenedRows) {
    const columnNames = columns.map(col => `"${col.name}"`).join(', ');
    
    // Build placeholders with JSONB casting where needed
    const placeholders = columns.map((col, i) => {
      if (col.type === 'JSONB') {
        return `$${i + 1}::jsonb`;
      }
      return `$${i + 1}`;
    }).join(', ');
    
    const values = columns.map(col => {
      const rawVal = row[col.originalName] ?? null;
      // For JSONB columns, always stringify (the ::jsonb cast will handle it)
      if (col.type === 'JSONB' && rawVal !== null) {
        return typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
      }
      return rawVal;
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${safeTableName}" (${columnNames}) VALUES (${placeholders})`,
      ...values
    );
  }

  // 6. Save metadata to FlattenedTable
  const metadata = await prisma.flattenedTable.create({
    data: {
      name: safeTableName,
      sourceId: rawDataId,
      columns: columns,
      rowCount: flattenedRows.length,
    },
  });

  return {
    tableName: safeTableName,
    rowCount: flattenedRows.length,
    columns: columns,
    metadata,
  };
}

/**
 * List all flattened tables
 */
export async function listFlattenedTables() {
  return await prisma.flattenedTable.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get data from a flattened table
 */
export async function getTableData(tableName: string, limit = 100) {
  const safeTableName = sanitizeName(tableName);
  
  // Verify table exists in metadata
  const metadata = await prisma.flattenedTable.findUnique({
    where: { name: safeTableName },
  });

  if (!metadata) {
    throw new Error(`Table not found: ${tableName}`);
  }

  // Fetch data - using template string to avoid cached plan issues
  // When a table schema changes (ALTER TABLE), Prisma's cached prepared statements fail
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "${safeTableName}" LIMIT ${Number(limit)}`
  );

  return {
    metadata,
    rows,
  };
}

/**
 * Execute a SQL query (SELECT only for safety)
 */
export async function executeQuery(query: string) {
  // Security: Only allow SELECT queries
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Additional safety checks
  const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE'];
  for (const keyword of dangerousKeywords) {
    if (trimmedQuery.includes(keyword)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}`);
    }
  }

  try {
    const results = await prisma.$queryRawUnsafe(query);
    return results;
  } catch (error: any) {
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

/**
 * Save query results to a new table
 */
export async function saveQueryResults(
  query: string,
  newTableName: string,
  sourceTableId?: string
) {
  // 1. Execute the query to get results
  const results = await executeQuery(query);
  
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Query returned no results');
  }

  // 2. Infer schema from results
  const firstRow = results[0] as Record<string, any>;
  const columns = Object.keys(firstRow).map(key => ({
    name: sanitizeName(key),
    originalName: key,
    type: inferColumnType(firstRow[key]),
  }));

  // 3. Create the new table
  const safeTableName = sanitizeName(newTableName);
  const columnDefs = columns
    .map(col => `"${col.name}" ${col.type}`)
    .join(', ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${safeTableName}" (
      id SERIAL PRIMARY KEY,
      ${columnDefs}
    )
  `);

  // 4. Insert the results
  for (const row of results as any[]) {
    const columnNames = columns.map(col => `"${col.name}"`).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map(col => row[col.originalName] ?? null);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${safeTableName}" (${columnNames}) VALUES (${placeholders})`,
      ...values
    );
  }

  // 5. Save metadata
  const metadata = await prisma.flattenedTable.create({
    data: {
      name: safeTableName,
      sourceId: sourceTableId || 'query_result',
      columns: columns,
      rowCount: results.length,
    },
  });

  return {
    tableName: safeTableName,
    rowCount: results.length,
    columns: columns,
    metadata,
  };
}
