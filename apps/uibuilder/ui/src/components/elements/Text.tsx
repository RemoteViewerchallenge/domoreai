import { useNode } from '@craftjs/core';
import { Typography } from '@mui/material';
import ContentEditable from 'react-contenteditable';
import React from 'react';

export interface TextProps {
  text: string;
  fontSize: number;
  color: string;
  fontWeight: string;
  textAlign: string;
}

export const Text = ({ text, fontSize, color, fontWeight, textAlign }: Partial<TextProps>) => {
  const { connectors: { connect, drag }, actions } = useNode();

  return (
    <div
      ref={(ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)); }}
      style={{ width: '100%' }}
    >
      <Typography
        component={ContentEditable as React.ElementType}
        html={text || ''} 
        disabled={false} // Change to true if you want to lock it to spreadsheet-only
        onChange={(e: { target: { value: string } }) => 
          actions.setProp((props: Record<string, unknown>) => (props.text = e.target.value), 500)
        }
        sx={{
          fontSize: `${fontSize}px`,
          color: color,
          fontWeight: fontWeight,
          textAlign: textAlign as React.CSSProperties['textAlign'], // typography allows multiple values but ts restricts some
          outline: 'none',
          width: '100%',
          '&:focus': {
            bgcolor: 'rgba(255, 255, 255, 0.05)',
          }
        }}
      />
    </div>
  );
};

Text.craft = {
  props: {
    text: 'New Text Element',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '400',
    textAlign: 'left',
  },
  rules: {
    canDrag: () => true,
  },
};