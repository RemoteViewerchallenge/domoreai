

import { useState, useEffect } from 'react';

// Mock data definition
export interface ProjectData {
  id: string;
  name: string;
  tree: Record<string, unknown>; 
}

const MOCK_PROJECTS: Record<string, ProjectData> = {
  'crm': {
    id: 'crm',
    name: 'CRM System',
    tree: {
      root: {
        id: 'root',
        type: 'div',
        props: { className: 'p-4' },
        children: ['header', 'content']
      },
      header: {
        id: 'header',
        type: 'h1',
        props: { children: 'CRM Dashboard' }
      },
      content: {
        id: 'content',
        type: 'div',
        props: { children: 'Content goes here' }
      }
    }
  },
  'new-app': {
    id: 'new-app',
    name: 'New Application',
    tree: {
      root: {
        id: 'root',
        type: 'div',
        props: { className: 'h-full flex items-center justify-center' },
        children: ['welcome']
      },
      welcome: {
        id: 'welcome',
        type: 'h2',
        props: { children: 'Welcome to your new app!' }
      }
    }
  }
};

export const useProjectData = (projectId?: string) => {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [_error, _setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const project = MOCK_PROJECTS[projectId];
      if (project) {
        setData(project);
      } else {
        // Fallback or empty state for unknown projects
         setData({
            id: projectId,
            name: `Project ${projectId}`,
            tree: {}
         });
      }
      setLoading(false);
    }, 500);
  }, [projectId]);

  const save = async (newTree: Record<string, unknown>) => {
    console.log(`Saving project ${projectId} with tree:`, newTree);
    if (data) {
        setData({ ...data, tree: newTree });
    }
    // Implement actual save logic here (e.g. API call)
    await Promise.resolve();
  };

  return { data, loading, error: _error, save };
};
