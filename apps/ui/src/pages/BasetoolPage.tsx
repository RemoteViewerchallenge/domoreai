import React, { useState, useMemo } from 'react';
import { HeadlessForm } from '../components/HeadlessForm.js';
import { HeadlessTable } from '../components/HeadlessTable.js';
import { VisualQueryBuilder } from './VisualQueryBuilder.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import { trpc } from '../utils/trpc.js';
import { Database, Table, Search, FileText, Cpu } from 'lucide-react';
import { cn } from '../lib/utils.js';
import type { FormSchema, TableSchema } from '../schemas/types.js';

type TabType = 'browser' | 'form' | 'query' | 'docs';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'browser', label: 'Data Browser', icon: Database },
  { id: 'form',    label: 'Form Builder', icon: FileText },
  { id: 'query',   label: 'Query Builder', icon: Search },
  { id: 'docs',    label: 'Docs',          icon: FileText },
];

export const BasetoolPage: React.FC = () => {
  const [activeTab, setActiveTab]       = useState<TabType>('browser');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedRow, setSelectedRow]   = useState<Record<string, unknown> | null>(null);
  const [formMode, setFormMode]         = useState<'create' | 'edit'>('create');

  const { data: availableTables } = trpc.basetool.listTables.useQuery();
  const { data: tableSchema }     = trpc.basetool.getTableSchema.useQuery(
    { tableName: selectedTable },
    { enabled: !!selectedTable }
  );

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
        type: col.type as any,
        sortable: true,
        filterable: true,
        render: col.type === 'boolean' ? 'boolean' : col.type.includes('date') ? 'date' : undefined,
      })),
      actions: { create: true, edit: true, delete: true, view: true },
      pagination: { enabled: true, pageSize: 20 },
      filters: {
        enabled: true,
        fields: (tableSchema.columns as Array<{ name: string; type: string; nullable?: boolean }>).map(c => c.name),
      },
      sorting: { enabled: true, defaultField: 'id', defaultDirection: 'asc' },
    };
  }, [tableSchema]);

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
        .filter((col: { name: string; type: string; nullable?: boolean }) =>
          col.name !== 'id' && col.name !== 'createdAt' && col.name !== 'updatedAt'
        )
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
          placeholder: `Enter ${col.name}...`,
        })),
      submitLabel: formMode === 'create' ? 'Create' : 'Update',
      mode: formMode,
      recordId: selectedRow?.id as string | undefined,
    };
  }, [tableSchema, formMode, selectedRow]);

  const handleTableAction = (action: string, row: Record<string, unknown>) => {
    if (action === 'create') { setFormMode('create'); setSelectedRow(null); setActiveTab('form'); }
    if (action === 'edit')   { setFormMode('edit');   setSelectedRow(row);  setActiveTab('form'); }
    if (action === 'view')   alert(`Viewing record:\n${JSON.stringify(row, null, 2)}`);
  };

  const handleFormSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    setActiveTab('browser');
    setSelectedRow(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-none h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-background-secondary)]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
            <Cpu size={16} className="text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-[var(--color-text)] tracking-tight leading-none uppercase">
              Basetool
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
              Data management interface
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SuperAiButton contextId="basetool_page" />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex-none border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] px-6 flex items-center gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-6">

        {/* DATA BROWSER */}
        {activeTab === 'browser' && (
          <div className="flex flex-col gap-4 h-full">
            {/* Table selector */}
            <div className="flex-none bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-4 flex items-center gap-4">
              <Table size={14} className="text-[var(--color-text-muted)] flex-none" />
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex-none">
                Table
              </span>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-1.5 rounded font-mono focus:border-[var(--color-primary)] focus:outline-none transition-all w-64"
              >
                <option value="">— select a table —</option>
                {availableTables?.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {selectedTable && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {tableSchema?.columns?.length ?? 0} columns
                </span>
              )}
            </div>

            {/* Table display */}
            {selectedTable && tableSchemaForDisplay ? (
              <div className="flex-1 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <HeadlessTable
                  schema={tableSchemaForDisplay}
                  onAction={handleTableAction}
                  onRowClick={(row: Record<string, unknown>) => console.log('Row clicked:', row)}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg">
                <Database size={32} className="text-[var(--color-text-muted)] mb-3 opacity-40" />
                <p className="text-sm text-[var(--color-text-muted)]">Select a table to browse its data</p>
              </div>
            )}
          </div>
        )}

        {/* FORM BUILDER */}
        {activeTab === 'form' && (
          <div className="max-w-2xl mx-auto">
            {selectedTable && formSchemaForDisplay ? (
              <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <HeadlessForm
                  schema={formSchemaForDisplay}
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setActiveTab('browser'); setSelectedRow(null); }}
                  initialData={selectedRow || undefined}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg p-12 gap-4">
                <FileText size={32} className="text-[var(--color-text-muted)] opacity-40" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  Select a table in Data Browser first, then click Create or Edit on a row.
                </p>
                <button
                  onClick={() => setActiveTab('browser')}
                  className="px-4 py-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] rounded text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-primary)]/30 transition-all"
                >
                  Go to Data Browser
                </button>
              </div>
            )}
          </div>
        )}

        {/* QUERY BUILDER */}
        {activeTab === 'query' && (
          <div className="h-full">
            <VisualQueryBuilder />
          </div>
        )}

        {/* DOCS */}
        {activeTab === 'docs' && (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Quick start */}
            <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-5">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
                Quick Start
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Data Browser', text: 'Select a table to view, filter, sort, and manage records. Click Create New to add records or Edit to modify existing ones.' },
                  { label: 'Form Builder', text: 'Dynamically generated forms based on table schemas. All fields are validated and support text, number, date, boolean, and JSON types.' },
                  { label: 'Query Builder', text: 'Visually build SQL queries by dragging columns between tables. AI generates optimized SQL from your visual mappings.' },
                ].map(item => (
                  <div key={item.label} className="flex gap-4">
                    <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider w-28 flex-none pt-0.5">
                      {item.label}
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* API reference */}
            <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-5">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
                API Endpoints
              </h2>
              <div className="space-y-2">
                {[
                  ['basetool.listTables()', 'Get all available tables'],
                  ['basetool.getTableSchema(tableName)', 'Get schema for a specific table'],
                  ['basetool.getTableData(tableName, filters)', 'Query table data with filters'],
                  ['basetool.createRow(tableName, values)', 'Insert new records'],
                  ['basetool.updateRow(tableName, rowId, values)', 'Update existing records'],
                  ['basetool.deleteRow(tableName, rowId)', 'Delete records'],
                  ['basetool.generateSQL(request)', 'Generate SQL from visual mappings'],
                  ['basetool.executeSQL(query)', 'Execute custom SQL queries'],
                ].map(([endpoint, desc]) => (
                  <div key={endpoint} className="flex items-center gap-4 p-2 rounded bg-[var(--color-background)] border border-[var(--color-border)]">
                    <code className="text-xs font-mono text-[var(--color-primary)] flex-none">{endpoint}</code>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full docs pointer */}
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/30 rounded-lg p-4 flex items-center gap-3">
              <FileText size={14} className="text-[var(--color-primary)] flex-none" />
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Full documentation including schema examples and best practices:</p>
                <code className="text-xs font-mono text-[var(--color-primary)]">docs/basetool-integration.md</code>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default BasetoolPage;
