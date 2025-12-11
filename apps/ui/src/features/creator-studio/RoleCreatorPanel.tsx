import React from 'react';

interface Props {
  className?: string;
}

export default function RoleCreatorPanel({ className }: Props) {
  return (
    <div className={`p-8 text-center ${className}`}>
      <h2 className="text-xl font-bold mb-4">Role Creator</h2>
      <p className="text-zinc-400">Create and manage AI agent roles here.</p>
    </div>
  );
}
