import React, { useState } from 'react';
import { Briefcase, PenTool, Shield, Code } from 'lucide-react';
import { cn } from '@/lib/utils.js';

// Mock data based on typical enterprise roles
const CATEGORIES = [
  { id: 'tech', icon: <Code size={14} />, label: 'Engineering' },
  { id: 'exec', icon: <Briefcase size={14} />, label: 'Executive' },
  { id: 'ops', icon: <Shield size={14} />, label: 'Operations' },
  { id: 'creative', icon: <PenTool size={14} />, label: 'Creative' },
];

const ROLES: Record<string, string[]> = {
  tech: ['Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'Data Scientist'],
  exec: ['CEO', 'CTO', 'Product Manager', 'Strategy Consultant'],
  ops: ['HR Manager', 'Compliance Officer', 'Office Manager'],
  creative: ['UI Designer', 'Copywriter', 'Video Producer'],
};

const CompactRoleSelector = () => {
  const [activeCat, setActiveCat] = useState('tech');

  return (
    <div className="flex h-full min-h-[200px] text-xs">
      {/* COLUMN 1: Categories (Icon Stack) */}
      <div className="w-10 flex flex-col items-center bg-surface border-r border-border py-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={cn(
              "p-2 rounded transition-colors",
              activeCat === cat.id ? "bg-primary/20 text-primary" : "text-text-muted hover:text-text"
            )}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* COLUMN 2: Roles List */}
      <div className="flex-1 bg-background">
        {ROLES[activeCat]?.map(role => (
          <button
            key={role}
            className="w-full text-left px-3 py-2 text-text hover:bg-primary/10 hover:text-primary transition-colors border-b border-border/50 last:border-0 truncate"
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CompactRoleSelector;
