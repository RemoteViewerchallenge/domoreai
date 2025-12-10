import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import { FolderOpen, File, X, Plus } from 'lucide-react';

interface VfsConfig {
  selectedPaths: string[];
  maxFileSize?: number;
  excludePatterns?: string[];
}

interface RoleVfsContextSelectorProps {
  roleId?: string;
  initialConfig?: VfsConfig;
  onChange: (config: VfsConfig) => void;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

/**
 * RoleVfsContextSelector - UI component for selecting VFS files for role context
 * 
 * Features:
 * - Browse and select files/directories from VFS
 * - Show estimated context size (token count)
 * - Configure max file size and exclude patterns
 * - Save configuration to role via existing endpoints
 */
export const RoleVfsContextSelector: React.FC<RoleVfsContextSelectorProps> = ({
  roleId,
  initialConfig,
  onChange,
}) => {
  const [config, setConfig] = useState<VfsConfig>(
    initialConfig || {
      selectedPaths: [],
      maxFileSize: 1024 * 1024, // 1MB default
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    }
  );

  const [currentPath, setCurrentPath] = useState<string>('.');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [newExcludePattern, setNewExcludePattern] = useState<string>('');

  // Query VFS for current directory
  const { data: vfsData, isLoading } = trpc.vfs.list.useQuery(
    {
      path: currentPath,
      provider: 'local',
    },
    {
      enabled: true,
    }
  );

  // Build estimated context size (rough approximation)
  const estimatedSize = useMemo(() => {
    const selectedCount = config.selectedPaths.length;
    // Very rough estimate: assuming 1KB per file average
    // Real size will be calculated by backend ContextService
    const estimatedBytes = selectedCount * 1024;
    const estimatedTokens = Math.ceil(estimatedBytes / 4);
    return {
      fileCount: selectedCount,
      estimatedBytes,
      estimatedTokens,
    };
  }, [config.selectedPaths]);

  // Notify parent of changes
  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const togglePath = (path: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedPaths.includes(path);
      return {
        ...prev,
        selectedPaths: isSelected
          ? prev.selectedPaths.filter((p) => p !== path)
          : [...prev.selectedPaths, path],
      };
    });
  };

  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const addExcludePattern = () => {
    if (newExcludePattern.trim()) {
      setConfig((prev) => ({
        ...prev,
        excludePatterns: [...(prev.excludePatterns || []), newExcludePattern.trim()],
      }));
      setNewExcludePattern('');
    }
  };

  const removeExcludePattern = (pattern: string) => {
    setConfig((prev) => ({
      ...prev,
      excludePatterns: (prev.excludePatterns || []).filter((p) => p !== pattern),
    }));
  };

  const removePath = (path: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedPaths: prev.selectedPaths.filter((p) => p !== path),
    }));
  };

  return (
    <div className="space-y-4 bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          VFS Context Configuration
        </h3>
        <div className="text-sm text-gray-400">
          {estimatedSize.fileCount} files · ~{estimatedSize.estimatedTokens.toLocaleString()} tokens
        </div>
      </div>

      {/* Selected Paths */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Selected Paths</label>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {config.selectedPaths.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No paths selected</div>
          ) : (
            config.selectedPaths.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-gray-300">
                  <File className="w-4 h-4" />
                  <span className="font-mono text-xs">{path}</span>
                </div>
                <button
                  onClick={() => removePath(path)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Remove path"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* File Browser */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Browse Files</label>
        <div className="bg-gray-800 rounded p-3 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : vfsData && vfsData.length > 0 ? (
            <div className="space-y-1">
              {vfsData.map((entry) => (
                <div key={entry.path} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.selectedPaths.includes(entry.path)}
                    onChange={() => togglePath(entry.path)}
                    className="w-4 h-4"
                  />
                  {entry.type === 'directory' ? (
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                  ) : (
                    <File className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-300 font-mono">{entry.name}</span>
                  {entry.size && (
                    <span className="text-xs text-gray-500">
                      ({Math.round(entry.size / 1024)}KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No files found</div>
          )}
        </div>
      </div>

      {/* Max File Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Max File Size (bytes)</label>
        <input
          type="number"
          value={config.maxFileSize || ''}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              maxFileSize: parseInt(e.target.value) || undefined,
            }))
          }
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1048576 (1MB)"
        />
      </div>

      {/* Exclude Patterns */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Exclude Patterns</label>
        <div className="space-y-2">
          {(config.excludePatterns || []).map((pattern) => (
            <div
              key={pattern}
              className="flex items-center justify-between bg-gray-800 rounded px-3 py-2"
            >
              <span className="text-sm text-gray-300 font-mono">{pattern}</span>
              <button
                onClick={() => removeExcludePattern(pattern)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove pattern"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newExcludePattern}
              onChange={(e) => setNewExcludePattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExcludePattern()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., *.log, temp/**"
            />
            <button
              onClick={addExcludePattern}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleVfsContextSelector;
