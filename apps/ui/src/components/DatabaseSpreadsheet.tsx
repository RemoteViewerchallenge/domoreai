import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '../utils/trpc.js';
import JSpreadsheetWrapper, { type JSpreadsheetHandle } from './JSpreadsheetWrapper.js';
import { Play, Save, Database, Plus, Search, LayoutGrid } from 'lucide-react';

const DatabaseSpreadsheet: React.FC = () => {
  const spreadsheetRef = useRef<JSpreadsheetHandle>(null);
  const [query, setQuery] = useState('SELECT * FROM "RawDataLake" LIMIT 100');
  const [activeTable, setActiveTable] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [metrics, setMetrics] = useState({ rows: 0, cols: 0, time: '0ms' });

  // TRPC Hooks
  const { data: tables, refetch: refetchTables } = trpc.dataRefinement.listFlattenedTables.useQuery();
  const executeQueryMutation = trpc.dataRefinement.executeQuery.useMutation();
  const saveQueryMutation = trpc.dataRefinement.saveQueryResults.useMutation();
  const getTableDataMutation = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable },
    { enabled: !!activeTable }
  );

  // Load data into spreadsheet when table data arrives
  useEffect(() => {
    if (getTableDataMutation.data && spreadsheetRef.current) {
      const { rows, metadata } = getTableDataMutation.data;
      const instance = spreadsheetRef.current.getInstance();
      
      if (instance) {
        // Transform rows to array of arrays for JSpreadsheet
        // We need to ensure order matches columns
        const columns = (metadata.columns as any[]) || [];
        const headers = columns.map((c: any) => c.name);
        const data = (rows as any[]).map((row: any) => headers.map((h: string) => row[h]));

        instance.setData(data);
        // instance.setHeaders(headers); // JSpreadsheet CE might need re-init for headers, or use nested headers
        
        // Update metrics
        setMetrics({
          rows: (rows as any[]).length,
          cols: headers.length,
          time: '120ms' // Simulated for now
        });
      }
    }
  }, [getTableDataMutation.data]);

  const handleRunQuery = async () => {
    const startTime = performance.now();
    try {
      const result = await executeQueryMutation.mutateAsync({ query });
      const endTime = performance.now();
      
      if (Array.isArray(result) && spreadsheetRef.current) {
        const instance = spreadsheetRef.current.getInstance();
        if (instance && result.length > 0) {
          const headers = Object.keys(result[0] as object);
          const data = result.map((row: any) => headers.map(h => row[h]));
          
          instance.setData(data);
          
          setMetrics({
            rows: result.length,
            cols: headers.length,
            time: `${(endTime - startTime).toFixed(0)}ms`
          });
        }
      }
    } catch (error) {
      console.error("Query failed:", error);
      alert("Query failed. See console for details.");
    }
  };

  const handleSaveTable = async () => {
    if (!newTableName) return;
    try {
      await saveQueryMutation.mutateAsync({
        query,
        newTableName,
        sourceTableId: activeTable
      });
      setIsSaving(false);
      setNewTableName('');
      refetchTables();
      alert(`Table "${newTableName}" saved successfully!`);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save table.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-xs font-mono">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-950 border-b border-cyan-900">
        {/* Table Selector */}
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Database size={12} className="text-cyan-500" />
          </div>
          <select
            className="block w-full pl-8 pr-4 py-1 bg-black border border-cyan-800 text-cyan-100 focus:border-cyan-400 focus:ring-0 text-xs appearance-none"
            value={activeTable}
            onChange={(e) => setActiveTable(e.target.value)}
          >
            <option value="">SELECT TABLE...</option>
            {tables?.map((t) => (
              <option key={t.id} value={t.name}>{t.name} ({t.rowCount} rows)</option>
            ))}
          </select>
        </div>

        {/* Query Bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search size={12} className="text-cyan-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-8 pr-4 py-1 bg-black border border-cyan-800 text-white placeholder-gray-600 focus:border-cyan-400 focus:ring-0 text-xs font-mono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM..."
            />
          </div>
          <button
            onClick={handleRunQuery}
            disabled={executeQueryMutation.isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-cyan-900/30 border border-cyan-500 text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-200 transition-colors disabled:opacity-50 uppercase tracking-wider"
          >
            <Play size={10} />
            Run
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-l border-cyan-900 pl-2">
          <button
            onClick={() => setIsSaving(!isSaving)}
            className={`p-1 border ${isSaving ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300' : 'border-transparent text-gray-500 hover:text-cyan-400'}`}
            title="Save as new table"
          >
            <Save size={14} />
          </button>
          <button className="p-1 text-gray-500 hover:text-cyan-400" title="Add Column">
            <Plus size={14} />
          </button>
          <button className="p-1 text-gray-500 hover:text-cyan-400" title="Layout">
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* Save Bar (Conditional) */}
      {isSaving && (
        <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-cyan-800 animate-in slide-in-from-top-2">
          <span className="text-cyan-500 font-bold uppercase">Save As:</span>
          <input
            type="text"
            className="flex-1 max-w-xs px-2 py-1 bg-black border border-cyan-700 text-white focus:border-cyan-400 focus:outline-none text-xs"
            placeholder="NEW_TABLE_NAME"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
          />
          <button
            onClick={handleSaveTable}
            className="px-3 py-1 bg-cyan-700 text-white text-xs hover:bg-cyan-600 border border-cyan-500"
          >
            CONFIRM
          </button>
        </div>
      )}

      {/* Spreadsheet Area */}
      <div className="flex-1 overflow-hidden relative border border-gray-800 m-1">
        <JSpreadsheetWrapper
          ref={spreadsheetRef}
          className="w-full h-full"
          options={{
            data: [[]],
            minDimensions: [10, 20],
            tableOverflow: true,
            tableWidth: '100%',
            tableHeight: '100%',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-black border-t border-cyan-900 text-[10px] text-gray-400 font-mono">
        <div className="flex gap-4">
          <span className="text-cyan-600">ROWS: <span className="text-cyan-300">{metrics.rows}</span></span>
          <span className="text-cyan-600">COLS: <span className="text-cyan-300">{metrics.cols}</span></span>
        </div>
        <div className="flex gap-4">
          <span>TIME: {metrics.time}</span>
          <span className="text-green-500">READY</span>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSpreadsheet;
