import React from 'react';
import RoleCreatorPanel from '../components/RoleCreatorPanel.js';

export default function RoleCreator() {
  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col">
       <RoleCreatorPanel className="flex-1 overflow-hidden" />
    </div>
  );
}
