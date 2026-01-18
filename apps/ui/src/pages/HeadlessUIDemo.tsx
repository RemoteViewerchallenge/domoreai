import React, { useState } from 'react';
import { HeadlessForm } from '../components/HeadlessForm';
import { HeadlessTable } from '../components/HeadlessTable';
import formSchema from '../schemas/example-user-form.json';
import tableSchema from '../schemas/example-user-table.json';
import { FormSchema, TableSchema } from '../schemas/types';

/**
 * HeadlessUIDemo - Demonstrates the JSON-driven headless UI system
 * Shows how forms and tables can be completely driven by JSON schemas
 */
export const HeadlessUIDemo: React.FC = () => {
  const [activeView, setActiveView] = useState<'form' | 'table'>('table');
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const handleFormSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    alert('User created successfully!');
    setActiveView('table');
    setSelectedRow(null);
  };

  const handleFormCancel = () => {
    setActiveView('table');
    setSelectedRow(null);
  };

  const handleAction = (action: string, row: Record<string, unknown>) => {
    switch (action) {
      case 'create':
        setSelectedRow(null);
        setActiveView('form');
        break;
      case 'edit':
        setSelectedRow(row);
        setActiveView('form');
        break;
      case 'view':
        alert(`Viewing user: ${JSON.stringify(row, null, 2)}`);
        break;
      default:
        console.log('Action:', action, row);
    }
  };

  // Create edit schema if editing
  const editFormSchema: FormSchema = selectedRow
    ? {
        ...formSchema as FormSchema,
        title: 'Edit User',
        mode: 'edit',
        recordId: selectedRow.id as string
      }
    : formSchema as FormSchema;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Headless UI Demo
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            A demonstration of JSON-driven UI components with no entity coupling
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveView('table')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === 'table'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Table
            </button>
            <button
              onClick={() => {
                setSelectedRow(null);
                setActiveView('form');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Form
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Panel */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 How This Works
          </h3>
          <p className="text-sm text-blue-800">
            These UI components are completely driven by JSON schemas. The form and table
            don't know anything about the "User" entity - they render based purely on
            schema definitions found in <code className="bg-blue-100 px-1 rounded">apps/ui/src/schemas/</code>.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            To create new pages, just create a JSON schema file and use the
            HeadlessForm or HeadlessTable components. No code changes needed!
          </p>
        </div>

        {/* Schema Display */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            📄 Current Schema
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Form Schema</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(formSchema, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Table Schema</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(tableSchema, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Active Component */}
        <div className="bg-white rounded-lg shadow">
          {activeView === 'form' ? (
            <HeadlessForm
              schema={editFormSchema}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              initialData={selectedRow || undefined}
            />
          ) : (
            <div className="p-6">
              <HeadlessTable
                schema={tableSchema as TableSchema}
                onAction={handleAction}
                onRowClick={(row) => console.log('Row clicked:', row)}
              />
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              🎨 Headless Design
            </h3>
            <p className="text-xs text-gray-600">
              UI components are completely decoupled from data models. Change
              schemas without touching component code.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              🔌 Basetool Integration
            </h3>
            <p className="text-xs text-gray-600">
              All data operations go through Basetool service layer,
              providing a unified abstraction over your database.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              🚀 Rapid Development
            </h3>
            <p className="text-xs text-gray-600">
              Create new CRUD interfaces in minutes by defining JSON schemas.
              No repetitive component development needed.
            </p>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-2">
            📚 Learn More
          </h3>
          <p className="text-sm text-green-800">
            See <code className="bg-green-100 px-1 rounded">docs/basetool-integration.md</code>
            {' '}for complete documentation on:
          </p>
          <ul className="mt-2 text-sm text-green-800 list-disc list-inside space-y-1">
            <li>Creating JSON schemas</li>
            <li>Using HeadlessForm and HeadlessTable components</li>
            <li>Visual Query Builder</li>
            <li>AI SQL Generation</li>
            <li>Best practices and examples</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
