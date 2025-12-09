import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, Zap, Wrench, Play, Pause, Square, 
  Settings, Plus, Search, MoreVertical, 
  ArrowRight, X, Box, Shield, Cpu, Brain, 
  Globe, Database, AlertCircle, CheckCircle2,
  Layers, GitMerge, Eye, Terminal, MessageSquare
} from 'lucide-react';

// --- TYPES ---

type NodeType = 'role' | 'department';

interface RoleNodeData {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  model: 'openai' | 'anthropic' | 'mistral';
  modelId?: string; // Actual model ID from registry
  tools: string[];
  capabilities: string[];
  position: { x: number; y: number };
  parentId?: string; // For grouping
  expanded?: boolean; // For departments
  status?: 'idle' | 'working' | 'error' | 'done' | 'rate-limited' | 'handoff-pending'; // For Live Mode
  currentOutput?: string; // For Live Mode
  tokensUsed?: number; // Current tokens consumed
  rateLimit?: { current: number; max: number }; // RPM tracking
  modelSwitchCount?: number; // How many times model was swapped
  contextRequired?: number; // Minimum context window needed
  handoffTarget?: string; // ID of role to hand off to when rate limited
  handoffCount?: number; // Number of handoffs performed
  isHighContext?: boolean; // Mark as high-context specialist role
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: 'direct' | 'judge' | 'critique' | 'summary';
  config?: any;
}

interface LogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

// --- SIMULATED DATA (Loaded from models.json for realistic display) ---
// NOTE: All roles will actually use Ollama when executed - these are just for UI visualization

// AGGRESSIVE Rate limits for free tier models (requests per minute) - set low to force handoffs
const RATE_LIMITS: Record<string, { rpm: number; tpm: number; dailyLimit?: number }> = {
  'gemini-2.0-flash': { rpm: 3, tpm: 50000, dailyLimit: 50 },  // Aggressive
  'gemini-1.5-flash': { rpm: 3, tpm: 50000, dailyLimit: 50 },  // Aggressive
  'gemini-1.5-pro': { rpm: 1, tpm: 10000, dailyLimit: 10 },    // Extreme
  'mistral-small': { rpm: 2, tpm: 50000 },                     // Aggressive
  'mistral-large': { rpm: 1, tpm: 20000 },                     // Extreme
  'gpt-4o-mini': { rpm: 4, tpm: 40000 },                       // Aggressive
  'claude-3.5-sonnet': { rpm: 2, tpm: 20000 },                 // Aggressive
  'llama-3-8b': { rpm: 5, tpm: 8000 },                         // Aggressive
  'llama-3.3-70b': { rpm: 3, tpm: 3000 },                      // Aggressive
  'qwen2.5:7b': { rpm: 999, tpm: 999999 },                     // Unlimited for local
};

// Load models from the real registry (for display purposes)
const SIMULATED_MODELS = [
  { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash', contextWindow: 1000000, isFree: true, type: 'multimodal', rpm: 15, tpm: 1000000 },
  { id: 'gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash', contextWindow: 1000000, isFree: true, type: 'multimodal', rpm: 15, tpm: 1000000 },
  { id: 'gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro', contextWindow: 2000000, isFree: false, type: 'multimodal', rpm: 2, tpm: 32000 },
  { id: 'mistral-small', provider: 'mistral', name: 'Mistral Small', contextWindow: 32000, isFree: true, type: 'text', rpm: 5, tpm: 1000000 },
  { id: 'mistral-large', provider: 'mistral', name: 'Mistral Large', contextWindow: 128000, isFree: false, type: 'text', rpm: 1, tpm: 1000000 },
  { id: 'gpt-4o-mini', provider: 'openrouter', name: 'GPT-4o Mini', contextWindow: 128000, isFree: true, type: 'multimodal', rpm: 20, tpm: 200000 },
  { id: 'claude-3.5-sonnet', provider: 'openrouter', name: 'Claude 3.5 Sonnet', contextWindow: 200000, isFree: false, type: 'text', rpm: 5, tpm: 80000 },
  { id: 'llama-3-8b', provider: 'groq', name: 'Llama 3 8B', contextWindow: 8192, isFree: true, type: 'text', rpm: 30, tpm: 14000 },
  { id: 'llama-3.3-70b', provider: 'groq', name: 'Llama 3.3 70B', contextWindow: 128000, isFree: true, type: 'text', rpm: 30, tpm: 6000 },
  { id: 'qwen2.5:7b', provider: 'ollama', name: 'Qwen 2.5 7B', contextWindow: 32768, isFree: true, type: 'text', rpm: 999, tpm: 999999 },
];

// Simulated role templates (will use Ollama for actual execution)
// Now with context requirements and high-context specialist roles
const AVAILABLE_ROLES = [
  { id: 'tmpl_researcher', title: 'Deep Researcher', model: 'google', modelId: 'gemini-2.0-flash', modelName: 'Gemini 2.0 Flash', tools: ['Web Search', 'Vector DB'], actualRuntime: 'ollama', contextRequired: 50000 },
  { id: 'tmpl_writer', title: 'Content Writer', model: 'openrouter', modelId: 'gpt-4o-mini', modelName: 'GPT-4o Mini', tools: ['File System'], actualRuntime: 'ollama', contextRequired: 20000 },
  { id: 'tmpl_critic', title: 'Senior Editor', model: 'openrouter', modelId: 'claude-3.5-sonnet', modelName: 'Claude 3.5 Sonnet', tools: [], actualRuntime: 'ollama', contextRequired: 80000 },
  { id: 'tmpl_coder', title: 'Python Engineer', model: 'mistral', modelId: 'mistral-large', modelName: 'Mistral Large', tools: ['Python Interpreter'], actualRuntime: 'ollama', contextRequired: 40000 },
  { id: 'tmpl_analyst', title: 'Data Analyst', model: 'groq', modelId: 'llama-3.3-70b', modelName: 'Llama 3.3 70B', tools: ['SQL', 'Python'], actualRuntime: 'ollama', contextRequired: 60000 },
  { id: 'tmpl_qa', title: 'QA Specialist', model: 'google', modelId: 'gemini-1.5-flash', modelName: 'Gemini 1.5 Flash', tools: ['Testing Framework'], actualRuntime: 'ollama', contextRequired: 30000 },
  // HIGH-CONTEXT SPECIALIST ROLES - These are handoff targets
  { id: 'tmpl_context_master', title: '🎯 Context Master', model: 'google', modelId: 'gemini-1.5-pro', modelName: 'Gemini 1.5 Pro (2M)', tools: ['Memory Manager'], actualRuntime: 'ollama', contextRequired: 500000, isHighContext: true },
  { id: 'tmpl_deep_analyst', title: '🎯 Deep Context Analyst', model: 'openrouter', modelId: 'claude-3.5-sonnet', modelName: 'Claude 3.5 Sonnet (200K)', tools: ['Analysis Suite'], actualRuntime: 'ollama', contextRequired: 100000, isHighContext: true },
  { id: 'tmpl_archive_processor', title: '🎯 Archive Processor', model: 'google', modelId: 'gemini-2.0-flash', modelName: 'Gemini 2.0 Flash (1M)', tools: ['Archival Tools'], actualRuntime: 'ollama', contextRequired: 200000, isHighContext: true },
];

const PROTOCOLS = {
  direct: { label: 'Direct Handoff', icon: ArrowRight, color: '#60a5fa' },
  judge: { label: 'Pass/Fail Gate', icon: Shield, color: '#fbbf24' },
  critique: { label: 'Critique Loop', icon: MessageSquare, color: '#a78bfa' },
  summary: { label: 'Summarize', icon: FileText, color: '#34d399' },
};

import { FileText } from 'lucide-react';

// --- THEME ---
const colors = {
  bg: '#0a0e14',
  bgCard: '#13171f',
  bgHeader: '#1a1f2e',
  border: '#2d3748',
  primary: '#60a5fa',
  accent: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
};

// --- COMPONENTS ---

export default function CorporateStructureBuilder() {
  const [viewMode, setViewMode] = useState<'build' | 'live'>('build');
  const [nodes, setNodes] = useState<RoleNodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Canvas State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingLine, setDrawingLine] = useState<{ sourceId: string; mouse: { x: number; y: number } } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Live Mode State
  const [executionState, setExecutionState] = useState<'stopped' | 'running' | 'paused'>('stopped');

  // --- ACTIONS ---

  const addNode = (template: any, position: { x: number, y: number }) => {
    const modelInfo = SIMULATED_MODELS.find(m => m.id === template.modelId);
    const limits = RATE_LIMITS[template.modelId] || { rpm: 10, tpm: 100000 };
    
    const newNode: RoleNodeData = {
      id: `node_${Date.now()}`,
      type: 'role',
      title: template.title,
      subtitle: `${template.modelName} (via Ollama)`, // Show it will use Ollama
      model: template.model as any,
      modelId: template.modelId,
      tools: template.tools,
      capabilities: [],
      position,
      status: 'idle',
      tokensUsed: 0,
      rateLimit: { current: 0, max: limits.rpm },
      modelSwitchCount: 0,
      contextRequired: template.contextRequired || 10000,
      handoffCount: 0,
      isHighContext: template.isHighContext || false
    };
    setNodes(prev => [...prev, newNode]);
  };

  const addDepartment = () => {
    const newNode: RoleNodeData = {
      id: `dept_${Date.now()}`,
      type: 'department',
      title: 'New Department',
      subtitle: 'Research & Development',
      model: 'openai', // N/A
      tools: [],
      capabilities: [],
      position: { x: 300, y: 300 },
      expanded: true,
      status: 'idle'
    };
    setNodes(prev => [...prev, newNode]);
  };

  // --- EVENT HANDLERS ---

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const templateId = e.dataTransfer.getData('templateId');
    if (templateId) {
      const template = AVAILABLE_ROLES.find(t => t.id === templateId);
      if (template && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        addNode(template, {
          x: e.clientX - rect.left - 100, // Center on mouse roughly
          y: e.clientY - rect.top - 50
        });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (viewMode === 'live') return;
    if ((e.target as HTMLElement).closest('.nodrag')) return;
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingId(nodeId);
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      setNodes(prev => prev.map(n => 
        n.id === draggingId 
          ? { ...n, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
          : n
      ));
    }
    if (drawingLine) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDrawingLine(prev => prev ? { ...prev, mouse: { x: e.clientX - rect.left, y: e.clientY - rect.top } } : null);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setDrawingLine(null);
  };

  const handleConnect = (targetId: string) => {
    if (drawingLine && drawingLine.sourceId !== targetId) {
      // Check for existing connection
      const exists = connections.find(c => c.sourceId === drawingLine.sourceId && c.targetId === targetId);
      if (!exists) {
        setConnections(prev => [...prev, {
          id: `conn_${Date.now()}`,
          sourceId: drawingLine.sourceId,
          targetId,
          protocol: 'direct'
        }]);
      }
    }
    setDrawingLine(null);
  };

  // --- AGGRESSIVE SIMULATION ENGINE WITH INTELLIGENT HANDOFF (LIVE MODE) ---
  useEffect(() => {
    if (executionState !== 'running') return;

    const interval = setInterval(() => {
      // Update nodes with aggressive rate limiting and intelligent handoff
      setNodes(prev => {
        let updated = [...prev];
        
        return updated.map(n => {
          if (n.type === 'department') return n;
          
          const limits = RATE_LIMITS[n.modelId || 'gemini-2.0-flash'];
          const currentModel = SIMULATED_MODELS.find(m => m.id === n.modelId);
          const tokenBurst = Math.floor(Math.random() * 8000) + 5000; // 5k-13k tokens per request (larger bursts)
          
          // Idle → Working (start processing - happens frequently)
          if (n.status === 'idle' && Math.random() > 0.5) {
            return { 
              ...n, 
              status: 'working', 
              currentOutput: `🔄 Processing (${n.modelId})... Context: ${n.contextRequired?.toLocaleString() || 'N/A'}`,
              rateLimit: { current: (n.rateLimit?.current || 0) + 1, max: limits.rpm }
            };
          }
          
          // Working → AGGRESSIVE rate limit check (70%+ triggers limit)
          if (n.status === 'working') {
            const newTokens = (n.tokensUsed || 0) + tokenBurst;
            const newRateCurrent = (n.rateLimit?.current || 0);
            
            // AGGRESSIVE: Hit rate limit at 70%+ and token limit at 60%+
            const hitRateLimit = newRateCurrent >= limits.rpm * 0.7;
            const hitTokenLimit = newTokens >= limits.tpm * 0.6;
            
            if ((hitRateLimit || hitTokenLimit) && Math.random() > 0.3) {
              // FIRST: Try to find a high-context specialist role to hand off to
              const needsHighContext = (n.contextRequired || 0) > 50000;
              
              if (needsHighContext && !n.isHighContext) {
                // Find available high-context roles with more context capacity
                const highContextRoles = updated.filter(otherNode => 
                  otherNode.id !== n.id &&
                  otherNode.isHighContext &&
                  (otherNode.contextRequired || 0) > (n.contextRequired || 0) &&
                  otherNode.status !== 'rate-limited' &&
                  otherNode.status !== 'handoff-pending'
                );
                
                if (highContextRoles.length > 0) {
                  // Hand off to highest context available role
                  const targetRole = highContextRoles.sort((a, b) => 
                    (b.contextRequired || 0) - (a.contextRequired || 0)
                  )[0];
                  
                  // Create handoff connection if it doesn't exist
                  const handoffExists = connections.find(c => 
                    c.sourceId === n.id && c.targetId === targetRole.id
                  );
                  
                  if (!handoffExists) {
                    setConnections(prev => [...prev, {
                      id: `handoff_${Date.now()}`,
                      sourceId: n.id,
                      targetId: targetRole.id,
                      protocol: 'direct'
                    }]);
                  }
                  
                  return {
                    ...n,
                    status: 'rate-limited',
                    handoffTarget: targetRole.id,
                    handoffCount: (n.handoffCount || 0) + 1,
                    currentOutput: `🔀 HANDOFF: Rate limited! Transferring to "${targetRole.title}" (${currentModel?.contextWindow?.toLocaleString() || 'N/A'} → ${SIMULATED_MODELS.find(m => m.id === targetRole.modelId)?.contextWindow?.toLocaleString() || 'N/A'} context)`,
                    rateLimit: { ...n.rateLimit!, current: limits.rpm }
                  };
                }
              }
              
              // FALLBACK: Try to switch model within same provider
              const alternativeModels = SIMULATED_MODELS.filter(m => 
                m.provider === currentModel?.provider &&
                m.isFree && 
                m.id !== n.modelId &&
                (m.contextWindow || 0) >= (n.contextRequired || 0)
              );
              
              if (alternativeModels.length > 0 && Math.random() > 0.5) {
                const newModel = alternativeModels[Math.floor(Math.random() * alternativeModels.length)];
                return {
                  ...n,
                  status: 'working',
                  modelId: newModel.id,
                  subtitle: `${newModel.name} (Auto-switched)`,
                  currentOutput: `⚡ SWITCHED: ${currentModel?.name} → ${newModel.name}`,
                  tokensUsed: newTokens,
                  rateLimit: { current: 0, max: RATE_LIMITS[newModel.id].rpm },
                  modelSwitchCount: (n.modelSwitchCount || 0) + 1
                };
              }
              
              // LAST RESORT: Just mark as rate-limited
              return {
                ...n,
                status: 'rate-limited',
                currentOutput: `⛔ BLOCKED: ${hitRateLimit ? 'RPM' : 'TPM'} limit hit. No alternatives available.`,
                rateLimit: { ...n.rateLimit!, current: limits.rpm },
                tokensUsed: newTokens
              };
            }
            
            // Continue working
            if (Math.random() > 0.8) {
              return { 
                ...n, 
                status: 'done', 
                currentOutput: `✅ Complete. ${newTokens.toLocaleString()} tokens | ${newRateCurrent}/${limits.rpm} RPM`,
                tokensUsed: newTokens
              };
            }
            
            return {
              ...n,
              currentOutput: `🔄 Working... ${newTokens.toLocaleString()}T | ${newRateCurrent}/${limits.rpm} RPM`,
              tokensUsed: newTokens
            };
          }
          
          // Handoff-pending → Activate target role
          if (n.status === 'handoff-pending' && n.handoffTarget) {
            const targetRole = updated.find(node => node.id === n.handoffTarget);
            if (targetRole && targetRole.status === 'idle') {
              // Activate the target role
              const targetIndex = updated.findIndex(node => node.id === n.handoffTarget);
              if (targetIndex >= 0) {
                updated[targetIndex] = {
                  ...updated[targetIndex],
                  status: 'working',
                  currentOutput: `🎯 RECEIVED HANDOFF from "${n.title}"`,
                  tokensUsed: n.tokensUsed // Transfer token usage
                };
              }
              
              return {
                ...n,
                status: 'idle',
                currentOutput: '✅ Handoff complete',
                handoffTarget: undefined
              };
            }
          }
          
          // Rate-limited → Recover after short cooldown
          if (n.status === 'rate-limited' && Math.random() > 0.7) {
            return {
              ...n,
              status: 'idle',
              currentOutput: '✅ Cooldown complete',
              rateLimit: { ...n.rateLimit!, current: 0 }
            };
          }
          
          // Done → Reset to idle
          if (n.status === 'done' && Math.random() > 0.85) {
            return { 
              ...n, 
              status: 'idle', 
              currentOutput: undefined,
              rateLimit: { current: Math.max(0, (n.rateLimit?.current || 0) - 1), max: limits.rpm }
            };
          }
          
          return n;
        });
      });

      // Generate logs including handoff events
      if (Math.random() > 0.5) {
        const activeNodes = nodes.filter(n => 
          n.status === 'working' || 
          n.status === 'rate-limited' || 
          n.status === 'handoff-pending'
        );
        const randomNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        if (randomNode) {
          const limits = RATE_LIMITS[randomNode.modelId || 'gemini-2.0-flash'];
          const messages = [
            `${randomNode.title}: ${randomNode.tokensUsed?.toLocaleString() || 0} / ${limits.tpm.toLocaleString()} TPM consumed`,
            `${randomNode.title}: ${randomNode.rateLimit?.current || 0}/${randomNode.rateLimit?.max || 0} RPM (${Math.floor(((randomNode.rateLimit?.current || 0) / (randomNode.rateLimit?.max || 1)) * 100)}%)`,
            `${randomNode.title}: Model switches: ${randomNode.modelSwitchCount || 0} | Handoffs: ${randomNode.handoffCount || 0}`,
            `${randomNode.title}: ${randomNode.status === 'rate-limited' ? '⛔ RATE LIMITED' : randomNode.status === 'handoff-pending' ? '🔀 HANDOFF PENDING' : '🔄 Processing'}`,
            ...(randomNode.handoffTarget ? [`🎯 HANDOFF: "${randomNode.title}" → "${nodes.find(n => n.id === randomNode.handoffTarget)?.title || 'Unknown'}"`] : []),
            ...(randomNode.isHighContext ? [`🎯 High-Context Specialist: ${randomNode.contextRequired?.toLocaleString() || 'N/A'} context available`] : [])
          ];
          
          setLogs(prev => [...prev, {
            id: `log_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            nodeId: randomNode.id,
            message: messages[Math.floor(Math.random() * messages.length)],
            type: (randomNode.status === 'rate-limited' || randomNode.status === 'handoff-pending' ? 'error' : 'info') as 'error' | 'info'
          }].slice(-30)); // Keep last 30 for more context
        }
      }
    }, 800); // Faster updates for aggressive rate limiting simulation

    return () => clearInterval(interval);
  }, [executionState, nodes]);


  return (
    <div className="flex h-screen w-full flex-col font-sans overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      
      {/* TOP BAR */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 z-20" style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}>
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/20">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">Corporate Structure Architect</h1>
            <span className="text-[10px] text-gray-500 font-mono">v2.4.0 • Simulated Mode (Ollama Runtime)</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* VIEW SWITCHER */}
           <div className="flex items-center bg-black/30 rounded-lg p-1 border border-gray-800">
              <button 
                onClick={() => setViewMode('build')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'build' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                <Wrench size={12} /> Architect
              </button>
              <button 
                onClick={() => setViewMode('live')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'live' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                <Eye size={12} /> Mission Control
              </button>
           </div>
           
           {/* Global Stats (Live Mode) */}
           {viewMode === 'live' && (
             <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 rounded-lg border border-gray-800 text-[10px] font-mono">
               <div className="flex items-center gap-1.5">
                 <span className="text-gray-500">Total Tokens:</span>
                 <span className="text-blue-400 font-bold">
                   {nodes.reduce((sum, n) => sum + (n.tokensUsed || 0), 0).toLocaleString()}
                 </span>
               </div>
               <div className="h-3 w-px bg-gray-700" />
               <div className="flex items-center gap-1.5">
                 <span className="text-gray-500">Avg RPM:</span>
                 <span className="text-green-400 font-bold">
                   {Math.floor(nodes.filter(n => n.rateLimit).reduce((sum, n) => sum + (n.rateLimit?.current || 0), 0) / Math.max(nodes.filter(n => n.rateLimit).length, 1))}
                 </span>
               </div>
               <div className="h-3 w-px bg-gray-700" />
               <div className="flex items-center gap-1.5">
                 <span className="text-gray-500">Model Swaps:</span>
                 <span className="text-purple-400 font-bold">
                   {nodes.reduce((sum, n) => sum + (n.modelSwitchCount || 0), 0)}
                 </span>
               </div>
               <div className="h-3 w-px bg-gray-700" />
               <div className="flex items-center gap-1.5">
                 <span className="text-gray-500">Throttled:</span>
                 <span className={`font-bold ${nodes.filter(n => n.status === 'rate-limited').length > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                   {nodes.filter(n => n.status === 'rate-limited').length}
                 </span>
               </div>
             </div>
           )}
           
           <div className="h-6 w-px bg-gray-800" />
           
           {viewMode === 'live' && (
             <div className="flex items-center gap-2">
                {executionState === 'stopped' ? (
                   <button onClick={() => setExecutionState('running')} className="h-8 w-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                     <Play size={14} fill="currentColor" />
                   </button>
                ) : (
                  <button onClick={() => setExecutionState('stopped')} className="h-8 w-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                    <Pause size={14} fill="currentColor" />
                  </button>
                )}
             </div>
           )}

           <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 text-gray-300 text-xs font-bold hover:bg-white/10 transition-all border border-white/5">
             <Settings size={14} /> Output Settings
           </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR (BUILD MODE ONLY) */}
        <div className={`w-72 bg-[#0d1117] border-r border-gray-800 flex flex-col transition-all duration-300 ${viewMode === 'live' ? '-ml-72' : ''}`}>
           <div className="p-4 border-b border-gray-800">
             <div className="relative">
               <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
               <input type="text" placeholder="Search Roles..." className="w-full bg-black/20 border border-gray-700 rounded py-2 pl-9 pr-4 text-xs text-gray-300 focus:border-blue-500 outline-none" />
             </div>
             {/* Simulation Mode Badge */}
             <div className="mt-3 p-2 rounded bg-yellow-900/20 border border-yellow-600/30 flex items-center gap-2">
               <AlertCircle size={12} className="text-yellow-400 shrink-0" />
               <div className="text-[9px] text-yellow-300">
                 <div className="font-bold">Simulated Mode</div>
                 <div className="text-yellow-400/70">All roles execute via Ollama</div>
               </div>
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Role Templates */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Available Roles</h3>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map(role => {
                    const providerColors: Record<string, string> = {
                      google: 'text-blue-400',
                      mistral: 'text-orange-400',
                      openrouter: 'text-purple-400',
                      groq: 'text-green-400',
                      ollama: 'text-yellow-400'
                    };
                    return (
                      <div 
                        key={role.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('templateId', role.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="p-3 rounded bg-[#161b22] border border-gray-800 hover:border-blue-500/50 cursor-grab active:cursor-grabbing group transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-gray-200">{role.title}</span>
                          <Brain size={14} className={providerColors[role.model]} />
                        </div>
                        <div className="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
                          <span className="opacity-60">Display:</span>
                          <span className={providerColors[role.model]}>{role.modelName}</span>
                          <span className="mx-1">→</span>
                          <span className="text-yellow-400">Runs on Ollama</span>
                        </div>
                        
                        {/* Rate Limit Info */}
                        <div className="mb-2 p-1.5 rounded bg-black/40 border border-gray-700">
                          <div className="flex items-center justify-between text-[9px] mb-1">
                            <span className="text-gray-600">Free Tier Limits</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[8px]">
                            <div>
                              <span className="text-gray-600">RPM: </span>
                              <span className="text-blue-400 font-mono">{RATE_LIMITS[role.modelId]?.rpm || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">TPM: </span>
                              <span className="text-green-400 font-mono">{(RATE_LIMITS[role.modelId]?.tpm || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                           {role.tools.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-black/30 border border-gray-700 text-[9px] text-gray-500">{t}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Departments */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Organization</h3>
                <button 
                  onClick={addDepartment}
                  className="w-full py-6 border border-dashed border-gray-700 rounded text-xs text-gray-500 font-bold hover:bg-white/5 hover:border-gray-500 transition-all flex flex-col items-center gap-2"
                >
                  <Layers size={16} />
                  New Department Group
                </button>
              </div>
           </div>
        </div>

        {/* CANVAS AREA */}
        <div 
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-[#0a0e14]"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={() => { /* Pan logic could go here */ }}
        >
           {/* Background Grid */}
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
              backgroundImage: `linear-gradient(${colors.border} 1px, transparent 1px), linear-gradient(90deg, ${colors.border} 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
           }} />

           {/* Connection Lines (SVG Layer) */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="5" orient="auto">
                  <path d="M0,0 L10,5 L0,10" fill={colors.textMuted} />
                </marker>
              </defs>
              {connections.map(conn => {
                const source = nodes.find(n => n.id === conn.sourceId);
                const target = nodes.find(n => n.id === conn.targetId);
                if (!source || !target) return null;
                
                // Calculate center points (assuming width 220, height 120 approx)
                const sx = source.position.x + (source.type === 'department' ? 150 : 110);
                const sy = source.position.y + (source.type === 'department' ? 150 : 60);
                const tx = target.position.x + (target.type === 'department' ? 150 : 110);
                const ty = target.position.y + (target.type === 'department' ? 150 : 60);
                
                const midX = (sx + tx) / 2;
                const midY = (sy + ty) / 2;

                const protocol = PROTOCOLS[conn.protocol];
                const isActive = executionState === 'running';

                return (
                  <g key={conn.id} className="group">
                    {/* The Line */}
                    <path 
                      d={`M ${sx} ${sy} C ${sx + 50} ${sy}, ${tx - 50} ${ty}, ${tx} ${ty}`} 
                      fill="none" 
                      stroke={isActive ? protocol.color : colors.border} 
                      strokeWidth={isActive ? 3 : 2}
                      strokeDasharray={isActive ? "5,5" : "0"}
                      className={isActive ? "animate-[dash_1s_linear_infinite]" : ""}
                      markerEnd="url(#arrow)"
                    />
                    
                    {/* The Protocol "Pill" (Clickable) */}
                    <foreignObject x={midX - 60} y={midY - 15} width="120" height="30" className="overflow-visible pointer-events-auto">
                       <div 
                         onClick={() => {
                            // Cycle protocols for demo
                            const types: any[] = ['direct', 'judge', 'critique', 'summary'];
                            const next = types[(types.indexOf(conn.protocol) + 1) % types.length];
                            setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, protocol: next } : c));
                         }}
                         className="flex items-center justify-center gap-2 px-2 py-1 rounded-full bg-[#1a1f2e] border border-gray-700 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                         style={{ borderColor: protocol.color }}
                       >
                         <protocol.icon size={10} style={{ color: protocol.color }} />
                         <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wide">{protocol.label}</span>
                       </div>
                    </foreignObject>
                  </g>
                );
              })}
              
              {/* Drawing Line Temp */}
              {drawingLine && (
                <path 
                  d={`M ${nodes.find(n=>n.id===drawingLine.sourceId)?.position.x! + 110} ${nodes.find(n=>n.id===drawingLine.sourceId)?.position.y! + 60} L ${drawingLine.mouse.x} ${drawingLine.mouse.y}`} 
                  stroke={colors.primary} 
                  strokeWidth="2" 
                  strokeDasharray="5,5" 
                />
              )}
           </svg>

           {/* Nodes Layer */}
           <div className="absolute inset-0 z-10">
              {nodes.map(node => (
                <div
                  key={node.id}
                  className={`absolute transition-shadow duration-200 ${draggingId === node.id ? 'z-50 cursor-grabbing' : 'z-10 cursor-grab'}`}
                  style={{
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                    width: node.type === 'department' ? '300px' : '220px',
                    height: node.type === 'department' ? (node.expanded ? '300px' : '60px') : 'auto'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                >
                  {/* DEPARTMENT NODE */}
                  {node.type === 'department' && (
                    <div className="w-full h-full rounded-xl border-2 border-dashed border-gray-700 bg-black/40 backdrop-blur-sm flex flex-col">
                       <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-gray-900/50 rounded-t-xl">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{node.title}</span>
                          <button onClick={() => setNodes(nodes.map(n => n.id === node.id ? {...n, expanded: !n.expanded} : n))}>
                            {node.expanded ? <Box size={14}/> : <Plus size={14}/>}
                          </button>
                       </div>
                       {node.expanded && (
                         <div className="flex-1 p-2 flex items-center justify-center text-gray-700 text-[10px] font-mono">
                            Drop Roles Here
                         </div>
                       )}
                    </div>
                  )}

                  {/* ROLE NODE */}
                  {node.type === 'role' && (
                    <div className={`
                      w-full rounded-lg bg-[#13171f] border transition-all relative group
                      ${node.status === 'rate-limited' ? 'border-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse' :
                        node.status === 'handoff-pending' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse' :
                        node.status === 'error' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
                        node.status === 'working' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 
                        node.isHighContext ? 'border-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.2)]' :
                        'border-gray-700 hover:border-gray-500'}
                    `}>
                       {/* Connection Handles */}
                       <div 
                         className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1a1f2e] border border-gray-600 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-blue-500 hover:border-blue-500 transition-all z-20 nodrag"
                         onMouseDown={(e) => { e.stopPropagation(); setDrawingLine({ sourceId: node.id, mouse: { x: e.clientX, y: e.clientY } }); }}
                         onMouseUp={() => handleConnect(node.id)}
                       >
                         <Plus size={14} className="text-white" />
                       </div>
                       
                       {/* Connection Target (Invisible but larger hit area) */}
                       <div className="absolute -left-4 top-0 bottom-0 w-8 z-0" onMouseUp={() => handleConnect(node.id)} />

                       {/* Header */}
                       <div className="p-3 border-b border-gray-800 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center shadow-inner ${
                             node.status === 'rate-limited' ? 'bg-orange-900/20 text-orange-400' :
                             node.status === 'error' ? 'bg-red-900/20 text-red-500' :
                             node.status === 'working' ? 'bg-blue-900/20 text-blue-400 animate-pulse' :
                             'bg-gray-800 text-gray-400'
                          }`}>
                             {node.model === 'anthropic' ? <Brain size={16} /> : <Cpu size={16} />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                             <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1">
                               {node.title}
                               {node.isHighContext && (
                                 <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-700">
                                   🎯 HC
                                 </span>
                               )}
                               {(node.modelSwitchCount || 0) > 0 && (
                                 <span className="text-[8px] px-1 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-700">
                                   {node.modelSwitchCount}x
                                 </span>
                               )}
                               {(node.handoffCount || 0) > 0 && (
                                 <span className="text-[8px] px-1 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-700">
                                   ↪{node.handoffCount}
                                 </span>
                               )}
                             </div>
                             <div className="text-[9px] text-gray-500 truncate uppercase tracking-wider">
                               {node.modelId} • {node.contextRequired?.toLocaleString() || '?'}ctx
                             </div>
                          </div>
                          {node.status === 'rate-limited' && <AlertCircle size={14} className="text-orange-500" />}
                          {node.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                          {node.status === 'done' && <CheckCircle2 size={14} className="text-green-500" />}
                       </div>

                       {/* Body */}
                       <div className="p-3 space-y-2">
                          {/* Rate Limit & Token Meters (Live Mode) */}
                          {viewMode === 'live' && (
                            <div className="space-y-1.5 mb-2">
                              {/* Rate Limit Bar */}
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[8px] text-gray-500">
                                  <span>Rate Limit (RPM)</span>
                                  <span className={node.rateLimit && node.rateLimit.current >= node.rateLimit.max * 0.9 ? 'text-orange-400 font-bold' : ''}>
                                    {node.rateLimit?.current || 0}/{node.rateLimit?.max || 0}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${
                                      (node.rateLimit?.current || 0) >= (node.rateLimit?.max || 1) * 0.9 ? 'bg-orange-500' :
                                      (node.rateLimit?.current || 0) >= (node.rateLimit?.max || 1) * 0.7 ? 'bg-yellow-500' :
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(100, ((node.rateLimit?.current || 0) / (node.rateLimit?.max || 1)) * 100)}%` }}
                                  />
                                </div>
                              </div>
                              
                              {/* Token Usage */}
                              {node.tokensUsed !== undefined && node.tokensUsed > 0 && (
                                <div className="flex items-center justify-between text-[8px] text-gray-500">
                                  <span>Tokens Used</span>
                                  <span className="text-blue-400 font-mono">
                                    {node.tokensUsed.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1">
                             {node.tools.map(t => (
                               <span key={t} className="px-1.5 py-0.5 rounded bg-black/40 border border-gray-800 text-[9px] text-gray-500 flex items-center gap-1">
                                 <Wrench size={8} /> {t}
                               </span>
                             ))}
                          </div>
                          
                          {/* Live Output Preview */}
                          {viewMode === 'live' && node.currentOutput && (
                             <div className={`mt-2 p-2 rounded border text-[10px] font-mono leading-tight ${
                               node.status === 'rate-limited' ? 'bg-orange-900/20 border-orange-700 text-orange-300' :
                               node.status === 'error' ? 'bg-red-900/20 border-red-700 text-red-300' :
                               'bg-black/50 border-gray-800 text-gray-400'
                             }`}>
                                <span className={node.status === 'rate-limited' ? 'text-orange-500 font-bold' : 'text-blue-500 font-bold'}>$</span> {node.currentOutput}
                             </div>
                          )}
                       </div>

                       {/* Live Action Bar (Only on Hover/Issue) */}
                       {viewMode === 'live' && (node.status === 'error' || node.status === 'done' || node.status === 'rate-limited') && (
                          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                             <button className="px-3 py-1 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-lg hover:bg-blue-500">
                                View Logs
                             </button>
                             {(node.status === 'error' || node.status === 'rate-limited') && (
                               <button className="px-3 py-1 rounded-full bg-purple-600 text-white text-[9px] font-bold shadow-lg hover:bg-purple-500 flex items-center gap-1">
                                 <Zap size={8} /> Switch Model
                               </button>
                             )}
                          </div>
                       )}
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>

        {/* MISSION CONTROL SIDEBAR (LIVE MODE ONLY) */}
        {viewMode === 'live' && (
           <div className="w-80 bg-[#0d1117] border-l border-gray-800 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                 <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                   <Terminal size={12} className="text-green-500" /> Live Execution Log
                 </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px]">
                 {logs.length === 0 && <div className="text-gray-600 italic text-center mt-10">System Idle. Press Play to start.</div>}
                 {logs.map(log => (
                    <div key={log.id} className="flex gap-2">
                       <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                       <span className={log.type === 'error' ? 'text-red-400' : 'text-gray-300'}>
                         {log.message}
                       </span>
                    </div>
                 ))}
                 <div className="h-4" /> {/* Spacer */}
              </div>
              
              {/* Emergency Override */}
              <div className="p-4 border-t border-gray-800 bg-red-900/5">
                 <button className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
                    <AlertCircle size={14} /> STOP & DEBUG
                 </button>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}