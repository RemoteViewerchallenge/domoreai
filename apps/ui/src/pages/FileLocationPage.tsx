import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Rocket, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { trpc } from '../utils/trpc.js';

const STORAGE_KEY = 'core_workspace_root';

type OnboardingStep = 'idle' | 'scanning' | 'recruiting' | 'indexing' | 'complete';

export default function FileLocationPage() {
  const navigate = useNavigate();
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('idle');
  const [error, setError] = useState<string>('');

  const onboardMutation = trpc.role.onboardProject.useMutation({
    onSuccess: () => {
      setOnboardingStep('complete');
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, workspaceRoot);
      // Redirect after a brief success message
      setTimeout(() => {
        navigate('/focus');
      }, 1500);
    },
    onError: (err) => {
      setError(err.message);
      setOnboardingStep('idle');
    },
  });

  const startFileWatcherMutation = trpc.vfs.startFileWatcher.useMutation();
  const ingestDirectoryMutation = trpc.vfs.ingestDirectory.useMutation();

  useEffect(() => {
    // Check if workspace root already exists
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWorkspaceRoot(saved);
    } else {
      // Default to common workspace location
      setWorkspaceRoot('/home/guy/mono');
    }
  }, []);

  const handleInitialize = async () => {
    if (!workspaceRoot.trim()) {
      setError('Please enter a workspace root path');
      return;
    }

    setError('');
    setOnboardingStep('scanning');

    try {
      // Step 1: Scan dependencies and create roles
      await onboardMutation.mutateAsync({ rootPath: workspaceRoot });
      
      setOnboardingStep('recruiting');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Start file indexing
      setOnboardingStep('indexing');
      await ingestDirectoryMutation.mutateAsync({ path: workspaceRoot });

      // Step 3: Start file watcher for auto-reindexing
      await startFileWatcherMutation.mutateAsync({ path: workspaceRoot });

      // Success handled by onboardMutation.onSuccess
    } catch (err) {
      console.error('Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
      setOnboardingStep('idle');
    }
  };

  const getStepMessage = () => {
    switch (onboardingStep) {
      case 'scanning':
        return 'Scanning project structure...';
      case 'recruiting':
        return 'Recruiting specialized agents...';
      case 'indexing':
        return 'Indexing codebase for semantic search...';
      case 'complete':
        return 'Domain initialized! Launching workspace...';
      default:
        return '';
    }
  };

  const isLoading = onboardingStep !== 'idle' && onboardingStep !== 'complete';

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden font-mono">
      {/* Header */}
      <div className="flex-none h-12 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
          <FolderOpen size={20} />
          Initialize Domain
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Info Box */}
          <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg p-4 flex gap-3">
            <AlertCircle size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1 text-[var(--color-text)]">Project = Domain</p>
              <p className="text-[var(--color-text-secondary)]">
                C.O.R.E. will scan your project, recruit specialized agents based on your tech stack,
                and index your codebase for semantic search.
              </p>
            </div>
          </div>

          {/* Workspace Root Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">
              Workspace Root Directory
            </label>
            <input
              type="text"
              value={workspaceRoot}
              onChange={(e) => setWorkspaceRoot(e.target.value)}
              disabled={isLoading}
              placeholder="/path/to/your/workspace"
              className="w-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-4 py-3 rounded font-mono focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Enter the absolute path to your project directory
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-950/30 border border-red-800 rounded-lg p-4 flex gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">
                <p className="font-bold mb-1">Initialization Failed</p>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Status */}
          {isLoading && (
            <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-6">
              <div className="flex items-center gap-4">
                <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">{getStepMessage()}</p>
                  <div className="flex gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${onboardingStep === 'scanning' ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-border)]'}`} />
                    <div className={`w-2 h-2 rounded-full ${onboardingStep === 'recruiting' ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-border)]'}`} />
                    <div className={`w-2 h-2 rounded-full ${onboardingStep === 'indexing' ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-border)]'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {onboardingStep === 'complete' && (
            <div className="bg-green-950/30 border border-green-800 rounded-lg p-4 flex gap-3">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200">
                <p className="font-bold mb-1">Domain Initialized!</p>
                <p className="text-green-300">Launching workspace...</p>
              </div>
            </div>
          )}

          {/* Initialize Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleInitialize}
              disabled={isLoading || !workspaceRoot.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-black rounded text-sm font-bold uppercase shadow-[var(--glow-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket size={16} />
              {isLoading ? 'Initializing...' : 'Initialize Domain'}
            </button>
          </div>

          {/* Additional Info */}
          <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">What Happens Next?</h3>
            <ul className="text-xs text-[var(--color-text-secondary)] space-y-1 list-disc list-inside">
              <li>Scans package.json files to detect your tech stack</li>
              <li>Recruits specialized agents (Frontend, Backend, etc.)</li>
              <li>Indexes your codebase for semantic search</li>
              <li>Starts file watcher for automatic re-indexing</li>
              <li>Launches the Focus Workspace with your project loaded</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}