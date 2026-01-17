import React, { useState, useMemo } from 'react';
import { TableSchema, ColumnSchema } from '../schemas/types';
import { trpc } from '../utils/trpc';

interface HeadlessTableProps {
  schema: TableSchema;
  onRowClick?: (row: Record<string, unknown>) => void;
  onAction?: (action: string, row: Record<string, unknown>) => void;
}

/**
 * HeadlessTable - A dynamic table component driven entirely by JSON schema
 * Displays data from Basetool with sorting, filtering, and pagination
 */
export const HeadlessTable: React.FC<HeadlessTableProps> = ({
  schema,
  onRowClick,
  onAction
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | undefined>(
    schema.sorting?.defaultField
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    schema.sorting?.defaultDirection || 'asc'
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  const pageSize = schema.pagination?.pageSize || 20;

  // Build query filters
  const queryFilters = useMemo(() => {
    const result: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      limit: number;
      offset: number;
    } = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    };

    // Add filters
    if (Object.keys(filters).length > 0) {
      result.where = filters;
    }

    // Add sorting
    if (sortField) {
      result.orderBy = { [sortField]: sortDirection };
    }

    return result;
  }, [currentPage, pageSize, sortField, sortDirection, filters]);

  // Fetch data
  const { data, isLoading, refetch } = trpc.basetool.getTableData.useQuery({
    tableName: schema.table,
    filters: queryFilters
  });

  // Delete mutation
  const deleteMutation = trpc.basetool.deleteRow.useMutation({
    onSuccess: () => {
      void refetch();
    }
  });

  const handleSort = (columnName: string) => {
    if (!schema.sorting?.enabled) return;

    const column = schema.columns.find((col) => col.name === columnName);
    if (!column?.sortable) return;

    if (sortField === columnName) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(columnName);
      setSortDirection('asc');
    }
  };

  const handleFilter = (columnName: string, value: string) => {
    if (!schema.filters?.enabled) return;

    setFilters((prev) => {
      if (value === '') {
        const newFilters = { ...prev };
        delete newFilters[columnName];
        return newFilters;
      }
      return { ...prev, [columnName]: value };
    });
    setCurrentPage(1); // Reset to first page
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        tableName: schema.table,
        rowId: row.id as string
      });
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete record');
    }
  };

  const renderCellValue = (column: ColumnSchema, value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }

    switch (column.render) {
      case 'boolean':
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {value ? 'Yes' : 'No'}
          </span>
        );

      case 'badge':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {String(value)}
          </span>
        );

      case 'date':
        try {
          const date = new Date(value as string);
          return date.toLocaleDateString();
        } catch {
          return String(value);
        }

      case 'json':
        return (
          <pre className="text-xs bg-gray-50 p-1 rounded overflow-auto max-w-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        );

      default:
        return String(value);
    }
  };

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{schema.title}</h2>
        {schema.description && (
          <p className="mt-1 text-sm text-gray-600">{schema.description}</p>
        )}
      </div>

      {/* Actions */}
      {schema.actions?.create && (
        <div className="mb-4">
          <button
            onClick={() => onAction?.('create', {})}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create New
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {schema.columns.map((column) => (
                <th
                  key={column.name}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && schema.sorting?.enabled && (
                      <button
                        onClick={() => handleSort(column.name)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {sortField === column.name ? (
                          sortDirection === 'asc' ? '↑' : '↓'
                        ) : (
                          '↕'
                        )}
                      </button>
                    )}
                  </div>
                  {column.filterable && schema.filters?.enabled && (
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filters[column.name] || ''}
                      onChange={(e) => handleFilter(column.name, e.target.value)}
                      className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                  )}
                </th>
              ))}
              {(schema.actions?.edit ||
                schema.actions?.delete ||
                schema.actions?.view) && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td
                  colSpan={schema.columns.length + 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : data?.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={schema.columns.length + 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              data?.rows.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {schema.columns.map((column) => (
                    <td key={column.name} className="px-4 py-3 text-sm text-gray-900">
                      {renderCellValue(column, row[column.name])}
                    </td>
                  ))}
                  {(schema.actions?.edit ||
                    schema.actions?.delete ||
                    schema.actions?.view) && (
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {schema.actions?.view && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction?.('view', row);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                        )}
                        {schema.actions?.edit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction?.('edit', row);
                            }}
                            className="text-green-600 hover:text-green-800"
                          >
                            Edit
                          </button>
                        )}
                        {schema.actions?.delete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(row);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {schema.pagination?.enabled && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, data?.totalCount || 0)} of{' '}
            {data?.totalCount || 0} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
