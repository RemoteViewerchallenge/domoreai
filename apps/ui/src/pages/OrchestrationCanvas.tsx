import { useState } from 'react';
import { Plus, Play, Save, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button.js';

interface OrchestrationCell {
  id: string;
  type: 'input' | 'role' | 'probability' | 'output';
  position: { row: number; col: number };
  span: { cols: number; rows: number };
  config: Record<string, unknown>;
  connections: {
    inputFrom: string[];
    outputTo: string[];
  };
}

interface Orchestration {
  id: string;
  name: string;
  description?: string;
  cells: OrchestrationCell[];
  gridSize: { rows: number; cols: number };
}

export default function OrchestrationCanvas() {
  const [orchestration, setOrchestration] = useState<Orchestration>({
    id: 'new',
    name: 'Untitled Orchestration',
    cells: [],
    gridSize: { rows: 10, cols: 3 }
  });

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleAddCell = (type: OrchestrationCell['type']) => {
    const newCell: OrchestrationCell = {
      id: `cell-${Date.now()}`,
      type,
      position: { row: orchestration.cells.length, col: 0 },
      span: { cols: 1, rows: 1 },
      config: {},
      connections: { inputFrom: [], outputTo: [] }
    };
    
    setOrchestration(prev => ({
      ...prev,
      cells: [...prev.cells, newCell]
    }));
  };

  const handleRun = () => {
    setIsRunning(true);
    // TODO: Execute orchestration
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="flex-none border-b border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-zinc-100">
              {orchestration.name}
            </h1>
            <input
              type="text"
              value={orchestration.name}
              onChange={(e) => setOrchestration(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent border-none text-zinc-400 text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAddCell('input')}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Input
            </Button>
            <Button
              onClick={() => handleAddCell('role')}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Role
            </Button>
            <Button
              onClick={() => handleAddCell('probability')}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Dice
            </Button>
            <Button
              onClick={() => handleAddCell('output')}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Output
            </Button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            <Button
              onClick={() => void handleRun()}
              disabled={isRunning || orchestration.cells.length === 0}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Load
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="flex-1 overflow-auto p-8">
        {orchestration.cells.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎼</div>
              <h2 className="text-2xl font-bold text-zinc-300 mb-2">
                Start Building Your Orchestration
              </h2>
              <p className="text-zinc-500 mb-6">
                Add cells to create your AI workflow
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => handleAddCell('input')} variant="outline">
                  Add Input Cell
                </Button>
                <Button onClick={() => handleAddCell('role')} variant="outline">
                  Add Role Cell
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${orchestration.gridSize.cols}, minmax(250px, 1fr))`,
              gridAutoRows: 'minmax(150px, auto)'
            }}
          >
            {orchestration.cells.map(cell => (
              <div
                key={cell.id}
                className={`
                  border-2 rounded-lg p-4
                  ${selectedCell === cell.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-700'}
                  ${getCellBgColor(cell.type)}
                  cursor-pointer hover:border-zinc-500 transition-colors
                `}
                style={{
                  gridColumn: `span ${cell.span.cols}`,
                  gridRow: `span ${cell.span.rows}`,
                }}
                onClick={() => setSelectedCell(cell.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCellIcon(cell.type)}</span>
                  <span className="font-semibold text-zinc-200">
                    {getCellTitle(cell.type)}
                  </span>
                </div>
                <div className="text-sm text-zinc-400">
                  Click to configure
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getCellIcon(type: OrchestrationCell['type']): string {
  switch (type) {
    case 'input': return '🎤';
    case 'role': return '🤖';
    case 'probability': return '🎲';
    case 'output': return '🔊';
  }
}

function getCellTitle(type: OrchestrationCell['type']): string {
  switch (type) {
    case 'input': return 'Input';
    case 'role': return 'Role';
    case 'probability': return 'Probability';
    case 'output': return 'Output';
  }
}

function getCellBgColor(type: OrchestrationCell['type']): string {
  switch (type) {
    case 'input': return 'bg-blue-500/10';
    case 'role': return 'bg-purple-500/10';
    case 'probability': return 'bg-yellow-500/10';
    case 'output': return 'bg-green-500/10';
  }
}
