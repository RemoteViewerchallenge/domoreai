import { prisma } from '../db.js';

/**
 * Sanitizes a string to be used as a table or column name.
 * Replaces non-alphanumeric characters with underscores.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

interface FlattenOptions {
  snapshotId?: string;
  tableName: string;
  rawData?: Record<string, unknown>[];
}

/**
 * Flattens a raw JSON array from the RawDataLake into a new, structured SQL table.
 * This function is idempotent and will replace the table on each run.
 *
 * @param options - The options for flattening data.
 * @param options.snapshotId - The ID of the record in RawDataLake. If provided, rawData will be fetched from here.
 * @param options.tableName - The desired name for the new, flattened table.
 * @param options.rawData - A fallback array of raw data to use if snapshotId is not provided or fails.
 */
export async function flattenRawData(options: FlattenOptions) {
  const { tableName: rawTableName, rawData } = options;
  
  // We will ONLY use the rawData passed directly from the provider fetch.
  // This removes the dependency on any intermediate snapshot table.
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    console.warn(`[Refinement] No data provided to flatten for table ${rawTableName}.`);
    return { tableName: rawTableName, rowCount: 0 };
  }

  const dataToProcess = rawData;

  const tableName = sanitizeName(rawTableName);

  // 3. Introspect the data to determine columns
  const columnSet = new Set<string>();
  dataToProcess.forEach((row: Record<string, unknown>) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(key => columnSet.add(key));
    }
  });

  const columns = Array.from(columnSet).map(sanitizeName);
  if (columns.length === 0) {
    throw new Error('Cannot create a table with no columns.');
  }

  // 4. Build and execute the CREATE TABLE statement
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);

  const columnDefs = columns.map(col => `"${col}" TEXT`).join(', ');
  const createSql = `CREATE TABLE "${tableName}" (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _loaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ${columnDefs}
  )`;
  await prisma.$executeRawUnsafe(createSql);

  // 5. Batch Insert the data for performance
  const rowsToInsert = dataToProcess.filter(row => row && typeof row === 'object');
  if (rowsToInsert.length === 0) {
    return { tableName, rowCount: 0 };
  }

  // All rows will be inserted against the full list of columns derived earlier
  const insertCols = columns.map(c => `"${c}"`).join(', ');

  const valueStrings = rowsToInsert.map(row => {
    const vals = columns.map(col => {
      // Find the original key before sanitization to look up the value
      const originalKey = Array.from(columnSet).find(k => sanitizeName(k) === col);
      const val = originalKey ? (row)[originalKey] : undefined;

      if (val === null || val === undefined) return 'NULL';
      let s: string;
      if (typeof val === 'object') {
        // If it's an object (including arrays), stringify it as JSON
        s = JSON.stringify(val).replace(/'/g, "''");
        return `'${s}'::jsonb`; // Store as JSONB
      } else {
        // Otherwise, it's a primitive, so convert to string
        s = String(val).replace(/'/g, "''");
        return `'${s}'`;
      }
    });
    return `(${vals.join(', ')})`;
  });

  if (valueStrings.length > 0) {
    const insertSql = `INSERT INTO "${tableName}" (${insertCols}) VALUES ${valueStrings.join(', ')}`;
    try {
      await prisma.$executeRawUnsafe(insertSql);
    } catch (e) {
      console.error(`[Refinement] Batch insert failed for ${tableName}. Error:`, e);
      throw e;
    }
  }

  return { tableName, rowCount: rowsToInsert.length };
}