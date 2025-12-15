/* eslint-disable react/prop-types */
import { useNode } from '@craftjs/core';
import { UniversalDataGrid } from '../../components/UniversalDataGrid.js';

// =============================================================================
// 1. WRAPPER FOR UNIVERSAL DATA GRID
// =============================================================================

export const CraftUniversalDataGrid = ({ data, headers, columnMapping }: { data?: Record<string, unknown>[], headers?: string[], columnMapping?: Record<string, string> }) => {
  const { connectors: { connect, drag } } = useNode();
  
  // Default sample data if none provided to visualize in editor
  const sampleData = data || [
    { id: 1, name: 'Sample Item', status: 'Active' },
    { id: 2, name: 'Another Item', status: 'Pending' }
  ];

  return (
    <div 
      ref={(ref) => { connect(drag(ref as HTMLElement)); }} 
      className="w-full h-full min-h-[100px] border border-dashed border-zinc-700 p-2 relative group"
    >
      <div className="absolute top-0 right-0 p-1 bg-zinc-800 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none">
        Data Grid
      </div>
      <UniversalDataGrid 
        data={sampleData} 
        headers={headers || Object.keys(sampleData[0] || {})}
        columnMapping={columnMapping}
      />
    </div>
  );
};

CraftUniversalDataGrid.craft = {
  displayName: 'Data Grid',
  props: {
    data: [],
    headers: [],
    columnMapping: {}
  },
  related: {
    settings: () => <div className="p-2 text-xs">Settings for Data Grid (To Be Implemented)</div>
  }
};

// =============================================================================
// 2. BASIC CONTAINER
// =============================================================================

export const CraftContainer = ({ children, background, padding = 20 }: { children?: React.ReactNode, background?: string, padding?: number }) => {
  const { connectors: { connect, drag } } = useNode();
  return (
    <div 
      ref={(ref) => { connect(drag(ref as HTMLElement)); }} 
      className="min-h-[50px] border border-dashed border-zinc-700"
      style={{ background, padding: `${padding}px` }}
    >
      {children}
    </div>
  );
};

CraftContainer.craft = {
  displayName: 'Container',
  props: {
    background: 'transparent',
    padding: 20
  }
};

// =============================================================================
// 3. TEXT COMPONENT
// =============================================================================

interface CraftTextProps {
    text: string;
    fontSize: number;
    color: string;
}

const TextSettings = () => {
    const { actions: { setProp }, fontSize, color, text } = useNode((node) => {
        const nodeProps = (node.data.props as unknown) as CraftTextProps;
        return {
            text: nodeProps.text,
            fontSize: nodeProps.fontSize,
            color: nodeProps.color
        };
    });
    
    return (
       <div className="flex flex-col gap-2 p-2">
          <label className="text-xs">Text</label>
          <input 
             className="bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white"
             value={text || ''} 
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProp((props: CraftTextProps) => props.text = e.target.value)} 
          />
          <label className="text-xs">Font Size</label>
          <input 
             type="number"
             className="bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white"
             value={fontSize || 12} 
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProp((props: CraftTextProps) => props.fontSize = parseInt(e.target.value))} 
          />
           <label className="text-xs">Color</label>
          <input 
             type="color"
             className="bg-zinc-800 border border-zinc-700 h-8 w-full cursor-pointer"
             value={color || '#ffffff'} 
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProp((props: CraftTextProps) => props.color = e.target.value)} 
          />
       </div>
    );
};

export const CraftText = ({ text, fontSize, color }: CraftTextProps) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
     <div 
        ref={(ref) => { connect(drag(ref as HTMLElement)); }}
        className="cursor-default"
        style={{ fontSize: `${fontSize}px`, color: color }}
     >
        {text}
     </div>
  );
};

CraftText.craft = {
   displayName: 'Text',
   props: {
      text: 'Click to edit text',
      fontSize: 16,
      color: '#ffffff'
   },
   related: {
      settings: TextSettings
   }
};

// =============================================================================
// 4. BUTTON COMPONENT
// =============================================================================

export const CraftButton = ({ children, variant = 'primary' }: { children?: React.ReactNode, variant?: 'primary' | 'secondary' }) => {
    const { connectors: { connect, drag } } = useNode();
    
    const bg = variant === 'primary' ? 'bg-blue-600' : 'bg-zinc-700';

    return (
        <button 
           ref={(ref) => { connect(drag(ref as HTMLElement)); }}
           className={`px-4 py-2 text-sm font-medium text-white rounded hover:opacity-90 transition-opacity ${bg}`}
        >
           {children}
        </button>
    );
};

CraftButton.craft = {
    displayName: 'Button',
    props: {
        variant: 'primary'
    }
};
