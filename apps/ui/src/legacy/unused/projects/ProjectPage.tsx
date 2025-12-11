import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { Loader2, AlertTriangle, ArrowLeft, User, Share2, ChevronsRight } from 'lucide-react';

// Define a type for the Job structure we expect from the API
type Job = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  parallelGroup: string | null;
  role: { id: string; name: string } | null;
};

// This function groups jobs into rows for rendering
const groupJobsIntoWorkflow = (jobs: Job[]) => {
  if (!jobs || jobs.length === 0) return [];

  const workflowRows: Job[][] = [];
  let i = 0;
  while (i < jobs.length) {
    const currentJob = jobs[i];
    // If the job is part of a parallel group, find all other jobs in that group
    if (currentJob.parallelGroup) {
      const parallelRow = jobs.filter(
        (job) => job.parallelGroup === currentJob.parallelGroup
      );
      workflowRows.push(parallelRow);
      // Skip past all the jobs we just grouped
      i += parallelRow.length;
    } else {
      // Otherwise, it's a sequential job, so it gets its own row
      workflowRows.push([currentJob]);
      i++;
    }
  }
  return workflowRows;
};

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, error } = trpc.project.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const workflow = useMemo(() =>
    project ? groupJobsIntoWorkflow(project.jobs as Job[]) : [],
    [project]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-700 p-4 rounded-lg m-4">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <AlertTriangle /> Error loading project
        </h3>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  if (!project) {
    return <div className="p-4">Project not found.</div>;
  }

  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col font-mono">
      {/* Header */}
      <div className="flex-none h-12 bg-zinc-950 border-b border-purple-900/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="p-1 hover:bg-zinc-800 rounded">
            <ArrowLeft className="text-purple-400" size={18} />
          </Link>
          <span className="text-sm font-bold text-white uppercase tracking-widest">{project.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-black p-4 space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">{project.description}</p>

        <div className="space-y-2">
          {workflow.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="flex gap-2 items-stretch">
                {row.map(job => (
                  <div key={job.id} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <h4 className="font-bold text-sm text-white">{job.name}</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-2 line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/20 border border-blue-800 rounded">
                        <User size={9} className="text-blue-400" />
                        <span className="text-[9px] text-blue-300 font-semibold">{job.role?.name || 'Unassigned'}</span>
                      </div>
                       <div className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded">
                         <span className="text-[9px] text-[var(--color-text-secondary)] font-semibold uppercase">{job.status.replace(/_/g, ' ')}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Render connector if not the last row */}
              {rowIndex < workflow.length - 1 && (
                <div className="flex justify-center">
                  <ChevronsRight size={16} className="text-purple-700 rotate-90" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;
