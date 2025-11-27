import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Plus,
  Filter,
  Search,
  ChevronDown,
  Trash2,
  Edit2,
  User,
  Tag,
  ArrowUpDown
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: string;
  tags: string[];
  createdAt: string;
}

const Planner: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Implement Model Selector Logic',
      description: 'Add fallback mechanism for free tier models',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Brain Agent',
      dueDate: '2025-02-15',
      tags: ['backend', 'core'],
      createdAt: '2025-01-10'
    },
    {
      id: '2',
      title: 'Fix Docker Networking',
      description: 'Resolve service name resolution issues',
      status: 'blocked',
      priority: 'critical',
      assignee: 'DevOps',
      dueDate: '2025-02-10',
      tags: ['infrastructure', 'urgent'],
      createdAt: '2025-01-12'
    },
    {
      id: '3',
      title: 'Update LSP Integration',
      description: 'Enhance code visualization in UI',
      status: 'todo',
      priority: 'medium',
      assignee: 'Eyes Agent',
      dueDate: '2025-02-20',
      tags: ['frontend', 'ui'],
      createdAt: '2025-01-15'
    },
    {
      id: '4',
      title: 'Optimize Rate Limiting',
      description: 'Implement per-provider rate limit tracking',
      status: 'done',
      priority: 'high',
      assignee: 'Brain Agent',
      dueDate: '2025-02-05',
      tags: ['backend', 'optimization'],
      createdAt: '2025-01-08'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status'>('dueDate');

  const statusConfig = {
    'todo': { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-900/30', border: 'border-gray-700' },
    'in-progress': { icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-700' },
    'blocked': { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700' },
    'done': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-700' }
  };

  const priorityConfig = {
    'low': { color: 'text-gray-500', bg: 'bg-gray-900/30', border: 'border-gray-700' },
    'medium': { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-700' },
    'high': { color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700' },
    'critical': { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700' }
  };

  const filteredTasks = tasks
    .filter(task => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  const statusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length
  };

  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col font-mono">
      
      {/* Header */}
      <div className="flex-none h-12 bg-zinc-950 border-b border-purple-900/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-purple-400" size={18} />
          <span className="text-sm font-bold text-white uppercase tracking-widest">Task Planner</span>
          <div className="flex items-center gap-2 ml-4">
            {Object.entries(statusCounts).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig];
              const Icon = config.icon;
              return (
                <div key={status} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800">
                  <Icon size={10} className={config.color} />
                  <span className="text-[9px] text-gray-500 uppercase">{status}</span>
                  <span className="text-[9px] font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-500 text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all uppercase tracking-wider text-xs font-bold"
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex-none bg-zinc-900 border-b border-zinc-800 p-2 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH TASKS..."
            className="flex-1 bg-black border border-zinc-800 text-white text-xs px-2 py-1 focus:border-purple-500 focus:outline-none placeholder:text-gray-600"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black border border-zinc-800 text-white text-xs px-2 py-1 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">ALL STATUS</option>
            <option value="todo">TODO</option>
            <option value="in-progress">IN PROGRESS</option>
            <option value="blocked">BLOCKED</option>
            <option value="done">DONE</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-black border border-zinc-800 text-white text-xs px-2 py-1 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">ALL PRIORITY</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>

          <button
            onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-white hover:border-purple-500 transition-all text-xs"
          >
            <ArrowUpDown size={12} />
            <span className="uppercase text-[10px]">{sortBy === 'dueDate' ? 'Date' : 'Priority'}</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto bg-black">
        <div className="p-2 space-y-1">
          {filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon;
            const priorityStyle = priorityConfig[task.priority];
            
            return (
              <div
                key={task.id}
                className="bg-zinc-950 border border-zinc-800 hover:border-purple-900/50 transition-all p-2"
              >
                <div className="flex items-start gap-2">
                  {/* Status Icon */}
                  <button className="mt-0.5">
                    <StatusIcon size={14} className={statusConfig[task.status].color} />
                  </button>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xs font-bold text-white truncate">{task.title}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button className="p-0.5 text-gray-600 hover:text-cyan-400 transition-colors">
                          <Edit2 size={12} />
                        </button>
                        <button className="p-0.5 text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Badge */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 ${priorityStyle.bg} border ${priorityStyle.border}`}>
                        <div className={`w-1 h-1 rounded-full ${priorityStyle.color.replace('text-', 'bg-')}`}></div>
                        <span className={`text-[9px] font-bold uppercase ${priorityStyle.color}`}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 ${statusConfig[task.status].bg} border ${statusConfig[task.status].border}`}>
                        <span className={`text-[9px] font-bold uppercase ${statusConfig[task.status].color}`}>
                          {task.status}
                        </span>
                      </div>

                      {/* Assignee */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/20 border border-blue-800">
                        <User size={9} className="text-blue-400" />
                        <span className="text-[9px] text-blue-300">{task.assignee}</span>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800">
                        <Calendar size={9} className="text-gray-500" />
                        <span className="text-[9px] text-gray-400">{task.dueDate}</span>
                      </div>

                      {/* Tags */}
                      {task.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-900/20 border border-purple-800">
                          <Tag size={8} className="text-purple-400" />
                          <span className="text-[9px] text-purple-300">{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Task Form Modal */}
      {showNewTaskForm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-purple-900/50 w-full max-w-2xl mx-4">
            <div className="border-b border-zinc-800 p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">New Task</span>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none"
                  placeholder="TASK TITLE"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none"
                  placeholder="Task description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Status</label>
                  <select className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none">
                    <option>TODO</option>
                    <option>IN PROGRESS</option>
                    <option>BLOCKED</option>
                    <option>DONE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Priority</label>
                  <select className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none">
                    <option>LOW</option>
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Assignee</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none"
                    placeholder="AGENT NAME"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 bg-black border border-zinc-800 text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNewTaskForm(false)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-gray-400 hover:text-white transition-all uppercase tracking-wider text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNewTaskForm(false)}
                  className="px-3 py-1.5 bg-purple-900/30 border border-purple-500 text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all uppercase tracking-wider text-xs font-bold"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Planner;