import React from 'react';
import { trpc } from '../utils/trpc.js';
import { Link } from 'react-router-dom';
import { Plus, LayoutGrid, Loader2 } from 'lucide-react';

const ProjectsDashboard: React.FC = () => {
  const { data: projects, isLoading, error } = trpc.project.list.useQuery();

  const statusConfig = {
    not_started: { color: 'text-[var(--color-text-secondary)]', bg: 'bg-gray-900/30' },
    in_progress: { color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
    on_hold: { color: 'text-orange-400', bg: 'bg-orange-900/20' },
    completed: { color: 'text-green-400', bg: 'bg-green-900/20' },
  };

  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col font-mono">
      {/* Header */}
      <div className="flex-none h-10 bg-zinc-950 border-b border-purple-900/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="text-purple-400" size={16} />
          <span className="text-sm font-bold text-white uppercase tracking-widest">Projects</span>
        </div>
        <Link
          to="/project-creator"
          className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white transition-all uppercase tracking-wider text-xs font-bold rounded shadow-[0_0_15px_rgba(168,85,247,0.6)]"
        >
          <Plus size={14} />
          New
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-black p-4">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-900/20 border border-red-700 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Error loading projects</h3>
            <p className="text-xs">{error.message}</p>
          </div>
        )}

        {projects && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {projects.map((project: any) => {
              const statusStyle = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.not_started;
              return (
                <Link to={`/project/${project.id}`} key={project.id} className="block bg-zinc-950 border border-zinc-800 hover:border-purple-900/50 transition-all p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h3 className="text-md font-bold text-white mb-2">{project.name}</h3>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${statusStyle.bg} ${statusStyle.color}`}>
                      {project.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                    {project.description || 'No description available.'}
                  </p>
                  <div className="border-t border-zinc-800 pt-2 flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                    <span className="font-bold">{project.jobs.length} Jobs</span>
                    <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsDashboard;
