import React, { useState, useMemo } from 'react';
import { HeadlessForm } from '../components/HeadlessForm.js';
import { HeadlessTable } from '../components/HeadlessTable.js';
import { VisualQueryBuilder } from './VisualQueryBuilder.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import { trpc } from '../utils/trpc.js';
import type { FormSchema, TableSchema } from '../schemas/types.js';

type TabType = 'browser' | 'form' | 'query' | 'docs';

/**
 * BasetoolPage - Comprehensive interface for all Basetool features
 * Provides unified access to data browsing, form building, query building, and documentation
 */
export const BasetoolPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('browser');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Fetch available tables
  const { data: availableTables } = trpc.basetool.listTables.useQuery();
  const { data: tableSchema } = trpc.basetool.getTableSchema.useQuery(
    { tableName: selectedTable },
    { enabled: !!selectedTable }
  );

  // Generate table schema for HeadlessTable
  const tableSchemaForDisplay: TableSchema | null = useMemo(() => {
    if (!tableSchema) return null;

    return {
      type: 'table',
      title: tableSchema.name,
      description: `Browse and manage ${tableSchema.name} records`,
      table: tableSchema.name,
      columns: tableSchema.columns.map((col: { name: string; type: string; nullable?: boolean }) => ({
        name: col.name,
        label: col.name.charAt(0).toUpperCase() + col.name.slice(1),
        type: col.type as any, // Cast to satisfy FieldType - actual type comes from database
        sortable: true,
        filterable: true,
        render: col.type === 'boolean' ? 'boolean' : col.type.includes('date') ? 'date' : undefined
      })),
      actions: {
        create: true,
        edit: true,
        delete: true,
        view: true
      },
      pagination: {
        enabled: true,
        pageSize: 20
      },
      filters: {
        enabled: true,
        fields: (tableSchema.columns as Array<{ name: string; type: string; nullable?: boolean }>).map((col) => col.name)
      },
      sorting: {
        enabled: true,
        defaultField: 'id',
        defaultDirection: 'asc'
      }
    };
  }, [tableSchema]);

  // Generate form schema for HeadlessForm
  const formSchemaForDisplay: FormSchema | null = useMemo(() => {
    if (!tableSchema) return null;

    return {
      type: 'form',
      title: formMode === 'create' ? `Create ${tableSchema.name}` : `Edit ${tableSchema.name}`,
      description: formMode === 'create' 
        ? `Add a new record to ${tableSchema.name}`
        : `Update existing ${tableSchema.name} record`,
      table: tableSchema.name,
      fields: tableSchema.columns
        .filter((col: { name: string; type: string; nullable?: boolean }) => col.name !== 'id' && col.name !== 'createdAt' && col.name !== 'updatedAt')
        .map((col: { name: string; type: string; nullable?: boolean }) => ({
          name: col.name,
          label: col.name.charAt(0).toUpperCase() + col.name.slice(1).replace(/([A-Z])/g, ' $1'),
          type: col.type === 'boolean' ? 'boolean' 
              : col.type.includes('int') || col.type.includes('float') || col.type.includes('decimal') ? 'number'
              : col.type.includes('text') ? 'textarea'
              : col.type.includes('json') ? 'json'
              : col.type.includes('date') ? 'date'
              : 'text',
          required: !col.nullable,
          placeholder: `Enter ${col.name}...`
        })),
      submitLabel: formMode === 'create' ? 'Create' : 'Update',
      mode: formMode,
      recordId: selectedRow?.id as string | undefined
    };
  }, [tableSchema, formMode, selectedRow]);

  const handleTableAction = (action: string, row: Record<string, unknown>) => {
    switch (action) {
      case 'create':
        setFormMode('create');
        setSelectedRow(null);
        setActiveTab('form');
        break;
      case 'edit':
        setFormMode('edit');
        setSelectedRow(row);
        setActiveTab('form');
        break;
      case 'view':
        alert(`Viewing record:\n${JSON.stringify(row, null, 2)}`);
        break;
    }
  };

  const handleFormSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    alert(`Record ${formMode === 'create' ? 'created' : 'updated'} successfully!`);
    setActiveTab('browser');
    setSelectedRow(null);
  };

  const handleFormCancel = () => {
    setActiveTab('browser');
    setSelectedRow(null);
  };

  const tabs = [
    { id: 'browser' as TabType, label: '📊 Data Browser', icon: '📊' },
    { id: 'form' as TabType, label: '📝 Form Builder', icon: '📝' },
    { id: 'query' as TabType, label: '🔍 Query Builder', icon: '🔍' },
    { id: 'docs' as TabType, label: '📚 Documentation', icon: '📚' }
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--colors-background)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Basetool UI</h1>
              <p className="mt-1 text-sm text-gray-600">
                Comprehensive data management interface with AI assistance
              </p>
            </div>
            <SuperAiButton contextId="basetool_page" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label.replace(/^.+\s/, '')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Data Browser Tab */}
        {activeTab === 'browser' && (
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Table Selector */}
              <div className="mb-6 bg-white rounded-lg shadow p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Table
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a table --</option>
                  {availableTables?.map((table: string) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table Display */}
              {selectedTable && tableSchemaForDisplay ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <HeadlessTable
                    schema={tableSchemaForDisplay}
                    onAction={handleTableAction}
                    onRowClick={(row: Record<string, unknown>) => console.log('Row clicked:', row)}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-gray-400 text-lg">
                    👆 Select a table to browse its data
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Builder Tab */}
        {activeTab === 'form' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {selectedTable && formSchemaForDisplay ? (
                <div className="bg-white rounded-lg shadow">
                  <HeadlessForm
                    schema={formSchemaForDisplay}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                    initialData={selectedRow || undefined}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-gray-400 text-lg mb-4">
                    📝 No table selected
                  </div>
                  <p className="text-gray-600 text-sm mb-6">
                    Go to the Data Browser tab and click "Create New" or "Edit" on a row
                  </p>
                  <button
                    onClick={() => setActiveTab('browser')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Go to Data Browser
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Query Builder Tab */}
        {activeTab === 'query' && (
          <div className="h-full">
            <VisualQueryBuilder />
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Quick Start */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 Quick Start</h2>
                <div className="space-y-4 text-gray-700">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Data Browser</h3>
                    <p className="text-sm">
                      Select a table from the dropdown to view, filter, sort, and manage records.
                      Click "Create New" to add records or "Edit" to modify existing ones.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Form Builder</h3>
                    <p className="text-sm">
                      Dynamically generated forms based on table schemas. All fields are validated
                      and support various input types (text, number, date, boolean, JSON, etc.).
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Query Builder</h3>
                    <p className="text-sm">
                      Visually build SQL queries by dragging columns between tables to create
                      relationships. AI generates optimized SQL from your visual mappings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🎨 Headless Design</h3>
                    <p className="text-sm text-gray-600">
                      UI components are completely decoupled from data models. Change schemas
                      without touching component code.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🔌 Unified API</h3>
                    <p className="text-sm text-gray-600">
                      All data operations go through the Basetool service layer, providing
                      a consistent abstraction over your database.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🤖 AI-Powered</h3>
                    <p className="text-sm text-gray-600">
                      Generate SQL queries from visual relationships, get AI assistance for
                      data operations, and automate complex workflows.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">⚡ Real-time</h3>
                    <p className="text-sm text-gray-600">
                      Live data updates, instant validation, and responsive UI ensure
                      a smooth user experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* API Reference */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📡 API Endpoints</h2>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.listTables()</code>
                    <p className="text-xs text-gray-600 mt-1">Get all available tables</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.getTableSchema(tableName)</code>
                    <p className="text-xs text-gray-600 mt-1">Get schema for a specific table</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.getTableData(tableName, filters)</code>
                    <p className="text-xs text-gray-600 mt-1">Query table data with filters</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.createRow(tableName, values)</code>
                    <p className="text-xs text-gray-600 mt-1">Insert new records</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.updateRow(tableName, rowId, values)</code>
                    <p className="text-xs text-gray-600 mt-1">Update existing records</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.deleteRow(tableName, rowId)</code>
                    <p className="text-xs text-gray-600 mt-1">Delete records</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.generateSQL(request)</code>
                    <p className="text-xs text-gray-600 mt-1">Generate SQL from visual mappings</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <code className="text-sm font-mono text-blue-600">basetool.executeSQL(query)</code>
                    <p className="text-xs text-gray-600 mt-1">Execute custom SQL queries</p>
                  </div>
                </div>
              </div>

              {/* Documentation Link */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-blue-900 mb-2">📚 Full Documentation</h2>
                <p className="text-sm text-blue-800 mb-3">
                  For complete documentation including schema examples, best practices, and
                  advanced usage, see:
                </p>
                <code className="block bg-blue-100 text-blue-900 px-3 py-2 rounded text-sm">
                  docs/basetool-integration.md
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasetoolPage;
