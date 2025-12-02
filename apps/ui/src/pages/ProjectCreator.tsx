import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Plus, Trash2, Save, ArrowDown, ArrowRight } from 'lucide-react';

// Temporary type, will be inferred from the router later
interface JobInput {
  name: string;
  description: string;
  roleId: string;
  parallelGroup?: string;
  dependsOn?: number;
}

const ProjectCreator: React.FC = () => {
  const { data: roles } = trpc.role.list.useQuery();
  const createProjectMutation = trpc.project.create.useMutation();

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [jobs, setJobs] = useState<JobInput[]>([
    { name: '', description: '', roleId: '' },
  ]);

  const handleAddJob = () => {
    setJobs([...jobs, { name: '', description: '', roleId: '' }]);
  };

  const handleRemoveJob = (index: number) => {
    const newJobs = jobs.filter((_, i) => i !== index);
    setJobs(newJobs);
  };

  const handleJobChange = (index: number, field: keyof JobInput, value: string | number) => {
    const newJobs = [...jobs];
    if (field === 'dependsOn') {
      newJobs[index][field] = value === '' ? undefined : Number(value);
    } else {
      // @ts-expect-error - 'string' can't be assigned to 'never'
      newJobs[index][field] = value;
    }
    setJobs(newJobs);
  };

  const handleSaveProject = () => {
    if (!projectName.trim()) {
      alert('Project name is required.');
      return;
    }
    createProjectMutation.mutate({
      name: projectName,
      description: projectDescription,
      // @ts-expect-error Zod default is not being picked up
      jobs: jobs.map(j => ({
        name: j.name,
        description: j.description,
        roleId: j.roleId,
        parallelGroup: j.parallelGroup,
        dependsOn: j.dependsOn,
      })),
    });
  };

  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col font-mono text-gray-100">
      {/* Header */}
      <div className="flex-none h-10 bg-zinc-950 border-b border-purple-900/50 flex items-center justify-between px-4">
        <span className="text-sm font-bold text-white uppercase tracking-widest">
          Create New Project
        </span>
        <button
          onClick={handleSaveProject}
          disabled={createProjectMutation.isLoading}
          className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all text-xs"
        >
          <Save size={14} />
          {createProjectMutation.isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Project Details */}
        <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-lg">
          <h2 className="text-lg font-bold text-purple-400 mb-4">Project Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., 'Refactor Authentication Service'"
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-sm focus:border-purple-500 focus:outline-none placeholder-gray-600 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="A brief overview of the project's goals..."
                className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-sm focus:border-purple-500 focus:outline-none placeholder-gray-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* Jobs Editor */}
        <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-400">Jobs & Workflow</h2>
            <button
              onClick={handleAddJob}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500 text-blue-300 hover:bg-blue-900/50 hover:text-white transition-all uppercase tracking-wider text-xs font-bold rounded"
            >
              <Plus size={14} />
              Add Job
            </button>
          </div>

          <div className="space-y-4">
            {jobs.map((job, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-700 p-3 rounded space-y-3">
                <div className="flex items-center justify-between">
                   <span className="font-bold text-gray-300">Job #{index + 1}</span>
                   <button
                    onClick={() => handleRemoveJob(index)}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <input
                  type="text"
                  value={job.name}
                  onChange={(e) => handleJobChange(index, 'name', e.target.value)}
                  placeholder="Job Name (e.g., 'Design Database Schema')"
                  className="w-full px-2 py-1.5 bg-black border border-zinc-600 text-white text-xs focus:border-blue-500 focus:outline-none rounded"
                />
                <textarea
                  rows={2}
                  value={job.description}
                  onChange={(e) => handleJobChange(index, 'description', e.target.value)}
                  placeholder="Job description..."
                  className="w-full px-2 py-1.5 bg-black border border-zinc-600 text-white text-xs focus:border-blue-500 focus:outline-none rounded"
                />
                <select
                  value={job.roleId}
                  onChange={(e) => handleJobChange(index, 'roleId', e.target.value)}
                  className="w-full px-2 py-1.5 bg-black border border-zinc-600 text-white text-xs focus:border-blue-500 focus:outline-none rounded"
                >
                  <option value="">-- Assign a Role --</option>
                  {roles?.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={job.dependsOn ?? ''}
                    onChange={(e) => handleJobChange(index, 'dependsOn', e.target.value)}
                    className="w-full px-2 py-1.5 bg-black border border-zinc-600 text-white text-xs focus:border-blue-500 focus:outline-none rounded"
                    disabled={index === 0}
                  >
                    <option value="">-- Depends On (Sequential) --</option>
                    {jobs.slice(0, index).map((_, i) => (
                      <option key={i} value={i}>Job #{i + 1}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={job.parallelGroup || ''}
                    onChange={(e) => handleJobChange(index, 'parallelGroup', e.target.value)}
                    placeholder="Parallel Group ID"
                    className="w-full px-2 py-1.5 bg-black border border-zinc-600 text-white text-xs focus:border-blue-500 focus:outline-none rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreator;
