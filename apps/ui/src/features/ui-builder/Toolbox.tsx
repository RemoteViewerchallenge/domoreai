import { useEditor } from '@craftjs/core';
import { CraftButton, CraftContainer, CraftText, CraftUniversalDataGrid, CraftMosaicLayout } from './CraftComponents.js';

export const Toolbox = () => {
  const { connectors } = useEditor();

  return (
    <div className="w-60 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-2 border-b border-zinc-800">
        Components
      </h3>
      
      <div className="flex flex-col gap-3">
        {/* Container */}
        <div 
          ref={(ref) => connectors.create(ref as HTMLElement, <CraftContainer background="#18181b" padding={20} />)}
          className="bg-zinc-800 p-3 rounded cursor-move hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 flex items-center gap-2"
        >
          <div className="w-4 h-4 bg-zinc-600 rounded-sm" />
          <span className="text-sm text-zinc-300">Container</span>
        </div>

        {/* Text */}
        <div 
          ref={(ref) => connectors.create(ref as HTMLElement, <CraftText text="Hello World" fontSize={16} color="#ffffff" />)}
          className="bg-zinc-800 p-3 rounded cursor-move hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 flex items-center gap-2"
        >
          <div className="w-4 h-4 text-zinc-400 font-serif font-bold">T</div>
          <span className="text-sm text-zinc-300">Text Block</span>
        </div>

        {/* Button */}
        <div 
          ref={(ref) => connectors.create(ref as HTMLElement, <CraftButton>Click Me</CraftButton>)}
          className="bg-zinc-800 p-3 rounded cursor-move hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 flex items-center gap-2"
        >
          <div className="w-4 h-2 bg-blue-600 rounded-[2px]" />
          <span className="text-sm text-zinc-300">Button</span>
        </div>

        {/* Data Grid */}
        <div 
          ref={(ref) => connectors.create(ref as HTMLElement, <CraftUniversalDataGrid />)}
          className="bg-zinc-800 p-3 rounded cursor-move hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 flex items-center gap-2"
        >
          <div className="w-4 h-4 grid grid-cols-2 gap-[1px] bg-zinc-600">
             <div className="bg-zinc-800" /> <div className="bg-zinc-800" />
             <div className="bg-zinc-800" /> <div className="bg-zinc-800" />
          </div>
          <span className="text-sm text-zinc-300">Data Grid</span>
        </div>

        {/* Layout Engine */}
        <div 
          ref={(ref) => connectors.create(ref as HTMLElement, <CraftMosaicLayout />)}
          className="bg-zinc-800 p-3 rounded cursor-move hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600 flex items-center gap-2"
        >
          <div className="w-4 h-4 border border-zinc-500 flex flex-col">
             <div className="flex-1 border-b border-zinc-500" />
             <div className="flex-1 flex">
                <div className="flex-1 border-r border-zinc-500" />
                <div className="flex-1" />
             </div>
          </div>
          <span className="text-sm text-zinc-300">Layout Engine</span>
        </div>
      </div>
    </div>
  );
};
