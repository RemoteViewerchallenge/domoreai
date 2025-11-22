import React, { useState, useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import { Check, Server, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

interface ToolSelectorProps {
  selectedTools: string[];
  onChange: (selectedTools: string[]) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ selectedTools, onChange }) => {
  const { data: toolsData, isLoading } = trpc.lootbox.getTools.useQuery();
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Group tools by server
  const toolsByServer = useMemo(() => {
    if (!toolsData) return {};
    const groups: Record<string, typeof toolsData> = {};
    toolsData.forEach(tool => {
      // Assuming tool name format is "server_name:tool_name" or similar, 
      // but the current API returns a flat list of Tool objects.
      // We'll group by the 'serverName' property if available, or fallback to a default.
      // Looking at the API, we might need to adjust based on actual response structure.
      // For now, assuming the tool object has a source or server property, or we parse the name.
      // If the API just returns names, we might need to fetch server info separately.
      // Let's assume the tool object structure from McpOrchestrator: { name, description, inputSchema }
      // We'll simulate server grouping if not explicit.
      
      // actually, let's check the McpOrchestrator.getTools return type.
      // It returns Tool[]. 
      // We'll group by a prefix if present (server__tool) or put in "Global".
      const parts = tool.name.split('__');
      const serverName = parts.length > 1 ? parts[0] : 'Global';
      if (!groups[serverName]) groups[serverName] = [];
      groups[serverName].push(tool);
    });
    return groups;
  }, [toolsData]);

  const toggleServer = (serverName: string) => {
    setExpandedServers(prev => ({ ...prev, [serverName]: !prev[serverName] }));
  };

  const handleServerSelect = (serverName: string, isSelected: boolean) => {
    const serverTools = toolsByServer[serverName].map(t => t.name);
    let newSelection = [...selectedTools];
    
    if (isSelected) {
      // Add all tools from this server that aren't already selected
      serverTools.forEach(toolName => {
        if (!newSelection.includes(toolName)) newSelection.push(toolName);
      });
    } else {
      // Remove all tools from this server
      newSelection = newSelection.filter(t => !serverTools.includes(t));
    }
    onChange(newSelection);
  };

  const handleToolSelect = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      onChange(selectedTools.filter(t => t !== toolName));
    } else {
      onChange([...selectedTools, toolName]);
    }
  };

  const isServerFullySelected = (serverName: string) => {
    const serverTools = toolsByServer[serverName];
    if (!serverTools) return false;
    return serverTools.every(t => selectedTools.includes(t.name));
  };

  const isServerPartiallySelected = (serverName: string) => {
    const serverTools = toolsByServer[serverName];
    if (!serverTools) return false;
    const selectedCount = serverTools.filter(t => selectedTools.includes(t.name)).length;
    return selectedCount > 0 && selectedCount < serverTools.length;
  };

  if (isLoading) return <div className="p-4 text-center text-gray-500">Loading tools...</div>;

  const filteredServers = Object.keys(toolsByServer).filter(serverName => {
    if (serverName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    return toolsByServer[serverName].some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="border border-gray-800 bg-black text-xs font-mono">
      <div className="p-2 bg-gray-950 border-b border-gray-800">
        <input
          type="text"
          placeholder="SEARCH TOOLS..."
          className="w-full px-2 py-1 bg-black border border-gray-800 text-white focus:border-purple-500 focus:outline-none text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {filteredServers.length === 0 ? (
          <div className="p-4 text-center text-gray-600 uppercase">No tools found</div>
        ) : (
          filteredServers.map(serverName => (
            <div key={serverName} className="border-b border-gray-900 last:border-0">
              <div className="flex items-center justify-between p-2 hover:bg-gray-900 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <button 
                    onClick={() => toggleServer(serverName)}
                    className="text-gray-500 hover:text-white"
                  >
                    {expandedServers[serverName] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  
                  <div 
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => handleServerSelect(serverName, !isServerFullySelected(serverName))}
                  >
                    <div className={`w-3 h-3 border flex items-center justify-center transition-colors ${
                      isServerFullySelected(serverName) 
                        ? 'bg-purple-600 border-purple-600 text-white' 
                        : isServerPartiallySelected(serverName)
                        ? 'bg-purple-900/30 border-purple-500 text-purple-500'
                        : 'border-gray-700 bg-black'
                    }`}>
                      {isServerFullySelected(serverName) && <Check size={8} strokeWidth={4} />}
                      {isServerPartiallySelected(serverName) && <div className="w-1 h-1 bg-current" />}
                    </div>
                    <Server size={12} className="text-purple-500" />
                    <span className="font-bold text-gray-300 uppercase">{serverName}</span>
                    <span className="text-[10px] text-gray-600">({toolsByServer[serverName].length})</span>
                  </div>
                </div>
              </div>

              {expandedServers[serverName] && (
                <div className="bg-gray-950/50 border-t border-gray-900">
                  {toolsByServer[serverName].map(tool => (
                    <div 
                      key={tool.name} 
                      className="flex items-center gap-2 py-1 pl-8 pr-2 hover:bg-gray-900 cursor-pointer group"
                      onClick={() => handleToolSelect(tool.name)}
                    >
                      <div className={`w-3 h-3 border flex items-center justify-center transition-colors ${
                        selectedTools.includes(tool.name)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-800 bg-black group-hover:border-blue-500'
                      }`}>
                        {selectedTools.includes(tool.name) && <Check size={8} strokeWidth={4} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Wrench size={10} className="text-gray-600 group-hover:text-blue-400" />
                          <span className={`text-[10px] truncate ${selectedTools.includes(tool.name) ? 'text-blue-300' : 'text-gray-400'}`}>
                            {tool.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ToolSelector;
