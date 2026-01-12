

import { useParams } from "react-router-dom";
import { NebulaBuilder } from "../features/builder/NebulaBuilder.js"; 
import { useProjectData } from "../../hooks/useProjectData.js"; 

export const BuilderPage = () => {
  const { projectId } = useParams(); 
  const { data, save } = useProjectData(projectId); // Loads crm.json or new-app.json

  if (!data) return <div className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white">Loading Project Cartridge...</div>;

  return (
    <div className="h-screen w-screen bg-neutral-900 text-white flex">
      {/* The Builder takes the JSON data and allows visual manipulation */}
      <NebulaBuilder 
        initialTree={data.tree} 
        onSave={(newTree) => { void save(newTree); }} 
      />
    </div>
  );
};
