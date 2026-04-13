import { useNode, useEditor } from '@craftjs/core';
import { useAllInheritedVars } from '../../core/vars';

export const Canvas = ({ children }: any) => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();
  const vars = useAllInheritedVars(id);

  const borderColor = String(vars['color.border'] || '#ffffff');
  const bgColor = String(vars['color.background'] || '#121212');

  return (
    <div
      ref={(r) => { if (r) connect(drag(r)); }}
      data-craft-node-id={id}
      onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
      style={{
        width: '100vw',
        height: '100vh',
        background: bgColor,
        padding: '0',
        margin: '0',
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

Canvas.craft = {
  displayName: 'Canvas',
};
