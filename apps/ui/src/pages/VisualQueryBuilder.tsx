import React, { useState, useCallback } from 'react';
import { trpc } from '../utils/trpc';

interface TableColumn {
  name: string;
  type: string;
}

interface SelectedTable {
  name: string;
  columns: TableColumn[];
  position: { x: number; y: number };
}

interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'inner' | 'left' | 'right' | 'full';
}

/**
 * VisualQueryBuilder - Visual interface for building SQL queries by drawing relationships
 * Integrates with AI to generate SQL from visual mappings
 */
export const VisualQueryBuilder: React.FC = () => {
  const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState<string>('');
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<{
    table: string;
    column: string;
  } | null>(null);

  // Fetch available tables
  const { data: availableTables } = trpc.basetool.listTables.useQuery();

  // Mutations
  const generateSQLMutation = trpc.basetool.generateSQL.useMutation();
  const executeSQLMutation = trpc.basetool.executeSQL.useMutation();

  // Query for getting table schema
  const utils = trpc.useContext();

  // Add a table to the canvas
  const handleAddTable = useCallback(
    async (tableName: string) => {
      // Check if table is already added
      if (selectedTables.some((t) => t.name === tableName)) {
        return;
      }

      try {
        // Fetch table schema using tRPC
        const schema = await utils.basetool.getTableSchema.fetch({ tableName });

        const newTable: SelectedTable = {
          name: tableName,
          columns: schema.columns.map((col) => ({
            name: col.name,
            type: col.type
          })),
          position: {
            x: 100 + selectedTables.length * 250,
            y: 100
          }
        };

        setSelectedTables((prev) => [...prev, newTable]);
      } catch (error) {
        console.error('Error adding table:', error);
      }
    },
    [selectedTables]
  );

  // Remove a table from the canvas
  const handleRemoveTable = (tableName: string) => {
    setSelectedTables((prev) => prev.filter((t) => t.name !== tableName));
    // Remove related relationships
    setRelationships((prev) =>
      prev.filter((r) => r.fromTable !== tableName && r.toTable !== tableName)
    );
  };

  // Handle column drag start
  const handleColumnDragStart = (table: string, column: string) => {
    setDraggedColumn({ table, column });
  };

  // Handle column drop (create relationship)
  const handleColumnDrop = (targetTable: string, targetColumn: string) => {
    if (!draggedColumn) return;
    if (draggedColumn.table === targetTable) return; // Can't relate to same table

    const newRelationship: Relationship = {
      id: `${draggedColumn.table}.${draggedColumn.column}-${targetTable}.${targetColumn}`,
      fromTable: draggedColumn.table,
      fromColumn: draggedColumn.column,
      toTable: targetTable,
      toColumn: targetColumn,
      type: 'inner'
    };

    setRelationships((prev) => [...prev, newRelationship]);
    setDraggedColumn(null);
  };

  // Remove a relationship
  const handleRemoveRelationship = (relationshipId: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== relationshipId));
  };

  // Change relationship type
  const handleChangeRelationType = (
    relationshipId: string,
    type: 'inner' | 'left' | 'right' | 'full'
  ) => {
    setRelationships((prev) =>
      prev.map((r) => (r.id === relationshipId ? { ...r, type } : r))
    );
  };

  // Generate SQL from visual mappings
  const handleGenerateSQL = async () => {
    if (selectedTables.length === 0) {
      alert('Please add at least one table');
      return;
    }

    try {
      const result = await generateSQLMutation.mutateAsync({
        tables: selectedTables.map((t) => t.name),
        relationships: relationships.map((r) => ({
          fromTable: r.fromTable,
          fromColumn: r.fromColumn,
          toTable: r.toTable,
          toColumn: r.toColumn,
          type: r.type
        })),
        select: selectedTables.flatMap((t) => t.columns.map((c) => `${t.name}.${c.name}`)),
        limit: 100
      });

      setGeneratedSQL(result.sql);
    } catch (error) {
      console.error('Error generating SQL:', error);
      alert('Failed to generate SQL');
    }
  };

  // Execute the generated SQL
  const handleExecuteSQL = async () => {
    if (!generatedSQL) {
      alert('Please generate SQL first');
      return;
    }

    if (!window.confirm('Execute this SQL query?')) {
      return;
    }

    setIsExecuting(true);
    try {
      const results = await executeSQLMutation.mutateAsync({
        query: generatedSQL
      });
      setQueryResults(results);
    } catch (error) {
      console.error('Error executing SQL:', error);
      alert('Failed to execute SQL');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-900">Visual Query Builder</h1>
        <p className="text-sm text-gray-600 mt-1">
          Draw relationships between tables to build SQL queries with AI assistance
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Table List */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Tables</h3>
          <div className="space-y-2">
            {availableTables?.map((table) => (
              <button
                key={table}
                onClick={() => void handleAddTable(table)}
                className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
              >
                {table}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas - Table Visualization */}
        <div className="flex-1 bg-gray-100 overflow-auto relative">
          {selectedTables.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Select tables from the sidebar to start building your query
            </div>
          ) : (
            <div className="p-8">
              {selectedTables.map((table) => (
                <div
                  key={table.name}
                  className="absolute bg-white border border-gray-300 rounded-lg shadow-md"
                  style={{
                    left: table.position.x,
                    top: table.position.y,
                    minWidth: '200px'
                  }}
                >
                  {/* Table Header */}
                  <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg flex justify-between items-center">
                    <span className="font-semibold">{table.name}</span>
                    <button
                      onClick={() => handleRemoveTable(table.name)}
                      className="text-white hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Columns */}
                  <div className="p-2">
                    {table.columns.map((column) => (
                      <div
                        key={column.name}
                        draggable
                        onDragStart={() => handleColumnDragStart(table.name, column.name)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleColumnDrop(table.name, column.name)}
                        className="px-2 py-1 text-sm hover:bg-gray-100 cursor-move rounded"
                      >
                        <span className="font-mono">{column.name}</span>
                        <span className="text-gray-500 text-xs ml-2">({column.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Relationships & SQL */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Relationships */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Relationships ({relationships.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="font-mono">
                        {rel.fromTable}.{rel.fromColumn}
                      </div>
                      <div className="text-gray-500">→</div>
                      <div className="font-mono">
                        {rel.toTable}.{rel.toColumn}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRelationship(rel.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                  <select
                    value={rel.type}
                    onChange={(e) =>
                      handleChangeRelationType(
                        rel.id,
                        e.target.value as 'inner' | 'left' | 'right' | 'full'
                      )
                    }
                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="inner">INNER JOIN</option>
                    <option value="left">LEFT JOIN</option>
                    <option value="right">RIGHT JOIN</option>
                    <option value="full">FULL JOIN</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => void handleGenerateSQL()}
              disabled={selectedTables.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
            >
              Generate SQL with AI
            </button>
            <button
              onClick={() => void handleExecuteSQL()}
              disabled={!generatedSQL || isExecuting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </button>
          </div>

          {/* Generated SQL */}
          {generatedSQL && (
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Generated SQL</h3>
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                {generatedSQL}
              </pre>
            </div>
          )}

          {/* Query Results */}
          {queryResults && (
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Results ({queryResults.length} rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {queryResults.length > 0 &&
                        Object.keys(queryResults[0]).map((key) => (
                          <th
                            key={key}
                            className="px-2 py-1 border-b border-gray-200 text-left"
                          >
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((value, colIdx) => (
                          <td key={colIdx} className="px-2 py-1 border-b border-gray-200">
                            {value !== null && value !== undefined
                              ? String(value)
                              : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
