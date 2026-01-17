import axios, { AxiosInstance } from 'axios';
import { TRPCError } from '@trpc/server';

/**
 * Basetool Service - Abstraction layer for Basetool API operations
 * Enables all data operations through Basetool instead of direct database access
 */

interface BasetoolConfig {
  apiUrl: string;
  apiKey: string;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
}

interface TableData {
  rows: Record<string, unknown>[];
  totalCount: number;
}

interface QueryFilters {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

export class BasetoolService {
  private client: AxiosInstance;
  private config: BasetoolConfig;

  constructor(config?: BasetoolConfig) {
    // Use environment variables with fallback to mock mode
    this.config = config || {
      apiUrl: process.env.BASETOOL_API_URL || 'http://localhost:3000/api',
      apiKey: process.env.BASETOOL_API_KEY || 'mock-api-key'
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Get all table schemas from the database
   */
  async getTableSchemas(): Promise<TableSchema[]> {
    try {
      const response = await this.client.get<TableSchema[]>('/schemas/tables');
      return response.data;
    } catch (error) {
      console.error('Error fetching table schemas:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch table schemas from Basetool'
      });
    }
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    try {
      const response = await this.client.get<TableSchema>(`/schemas/tables/${tableName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching schema for table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch schema for table ${tableName}`
      });
    }
  }

  /**
   * Get data from a table with optional filters
   */
  async getTableData(
    tableName: string,
    filters?: QueryFilters
  ): Promise<TableData> {
    try {
      const response = await this.client.post<TableData>(
        `/data/${tableName}/query`,
        filters || {}
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch data from table ${tableName}`
      });
    }
  }

  /**
   * Create a new row in a table
   */
  async createRow(
    tableName: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.post<Record<string, unknown>>(
        `/data/${tableName}`,
        values
      );
      return response.data;
    } catch (error) {
      console.error(`Error creating row in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create row in table ${tableName}`
      });
    }
  }

  /**
   * Update an existing row in a table
   */
  async updateRow(
    tableName: string,
    rowId: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.patch<Record<string, unknown>>(
        `/data/${tableName}/${rowId}`,
        values
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating row in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update row in table ${tableName}`
      });
    }
  }

  /**
   * Delete a row from a table
   */
  async deleteRow(tableName: string, rowId: string): Promise<void> {
    try {
      await this.client.delete(`/data/${tableName}/${rowId}`);
    } catch (error) {
      console.error(`Error deleting row from table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete row from table ${tableName}`
      });
    }
  }

  /**
   * Execute a custom SQL query
   * @param query - SQL query to execute
   * @param params - Optional query parameters for parameterized queries
   */
  async runSQL(
    query: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.client.post<Record<string, unknown>[]>(
        '/sql/execute',
        { query, params }
      );
      return response.data;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to execute SQL query'
      });
    }
  }

  /**
   * List all available tables
   */
  async listTables(): Promise<string[]> {
    try {
      const schemas = await this.getTableSchemas();
      return schemas.map(schema => schema.name);
    } catch (error) {
      console.error('Error listing tables:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list tables'
      });
    }
  }

  /**
   * Batch create multiple rows in a table
   */
  async batchCreateRows(
    tableName: string,
    rows: Record<string, unknown>[]
  ): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.client.post<Record<string, unknown>[]>(
        `/data/${tableName}/batch`,
        { rows }
      );
      return response.data;
    } catch (error) {
      console.error(`Error batch creating rows in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to batch create rows in table ${tableName}`
      });
    }
  }
}

// Singleton instance for the service
let basetoolServiceInstance: BasetoolService | null = null;

/**
 * Get or create the Basetool service singleton instance
 */
export function getBasetoolService(): BasetoolService {
  if (!basetoolServiceInstance) {
    basetoolServiceInstance = new BasetoolService();
  }
  return basetoolServiceInstance;
}
