/**
 * Example: How to use the Corporate Recruiter from the Frontend
 * 
 * This demonstrates how to call the onboardProject mutation from a React component
 */

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function CorporateRecruiterButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const onboardMutation = trpc.role.onboardProject.useMutation();

  const handleOnboard = async () => {
    setIsLoading(true);
    try {
      // Onboard the current monorepo
      const stats = await onboardMutation.mutateAsync({
        rootPath: '/home/guy/mono' // Or get this from user input
      });
      
      setResult(stats);
      console.log('✅ Onboarding complete:', stats);
      
      // Optionally refresh the roles list
      // await trpc.role.list.refetch();
      
    } catch (error) {
      console.error('❌ Onboarding failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleOnboard}
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Scanning Project...' : '🏢 Run Corporate Recruiter'}
      </button>

      {result && (
        <div className="alert alert-success">
          <h3>Onboarding Complete!</h3>
          <ul>
            <li>📦 Package.json files scanned: {result.scanned}</li>
            <li>🏗️ Departments identified: {result.departments}</li>
            <li>✨ Roles created: {result.rolesCreated}</li>
            <li>♻️ Roles updated: {result.rolesUpdated}</li>
          </ul>
          
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-bold">Errors:</p>
              <ul className="list-disc pl-5">
                {result.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Alternative: Direct tRPC call (non-React)
 */
export async function onboardProjectDirect(rootPath: string) {
  const { trpc } = await import('@/lib/trpc');
  
  const result = await trpc.role.onboardProject.mutate({
    rootPath
  });
  
  return result;
}

/**
 * Alternative: Call from a settings page
 */
export function SettingsPageExample() {
  const [projectPath, setProjectPath] = useState('/home/guy/mono');
  const onboard = trpc.role.onboardProject.useMutation();

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">Corporate Recruiter</h2>
        <p>Automatically create specialized roles based on your project's tech stack.</p>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Project Root Path</span>
          </label>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            className="input input-bordered"
            placeholder="/path/to/your/project"
          />
        </div>

        <button
          onClick={() => onboard.mutate({ rootPath: projectPath })}
          disabled={onboard.isLoading}
          className="btn btn-primary mt-4"
        >
          {onboard.isLoading ? 'Scanning...' : 'Scan & Create Roles'}
        </button>

        {onboard.isSuccess && (
          <div className="alert alert-success mt-4">
            <p>{onboard.data.message}</p>
            <p>Created {onboard.data.rolesCreated} roles, updated {onboard.data.rolesUpdated}</p>
          </div>
        )}

        {onboard.isError && (
          <div className="alert alert-error mt-4">
            <p>Error: {onboard.error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
