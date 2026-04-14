import { useNode, useEditor } from '@craftjs/core';
import { useAllInheritedVars } from '../../core/vars';

export const Canvas = ({ children }: any) => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();
  const vars = useAllInheritedVars(id);

  const borderColor = String(vars['color.border'] || '#444444');
  const bgColor = String(vars['color.background'] || '#000000');

  return (
    <div
      ref={(r) => { if (r) connect(drag(r)); }}
      data-craft-node-id={id}
      onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
      style={{
        // Use 100% to adapt to the flex container (sidebar pushes this)
        width: '100%',
        height: '100%',
        background: bgColor,
        padding: '20px', // Add some breathing room so it feels like a workspace
        margin: '0',
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Internal "Stage" wrapper to help maintain visual centering if needed */}
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        border: `1px dashed rgba(255,255,255,0.05)`
      }}>
        {children}
      </div>
    </div>
  );
};

Canvas.craft = {
  displayName: 'Canvas',
};
