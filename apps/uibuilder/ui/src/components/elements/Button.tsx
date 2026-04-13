import { useNode } from '@craftjs/core';
import { Button as MuiButton } from '@mui/material';

export interface ButtonProps {
  text?: string;
  bgColor?: string;
  textColor?: string;
  borderW?: number;
  borderCol?: string;
  radius?: number;
  padX?: number;
  padY?: number;
  fontSize?: number;
}

export const Button = ({ 
  text, 
  bgColor, 
  textColor, 
  borderW, 
  borderCol, 
  radius, 
  padX, 
  padY,
  fontSize 
}: ButtonProps) => {
  const { connectors: { connect, drag } } = useNode();

  return (
    <MuiButton
      ref={(ref: HTMLButtonElement | null) => { if (ref) connect(drag(ref)); }}
      variant="outlined"
      sx={{
        // Variables driven entirely by your SpreadsheetView
        backgroundColor: bgColor,
        color: textColor,
        border: `${borderW}px solid ${borderCol}`,
        borderRadius: `${radius}px`,
        padding: `${padY}px ${padX}px`,
        fontSize: `${fontSize}px`,
        textTransform: 'none', // Keeps text exactly as typed
        
        // Hover logic (can also be exposed to props later)
        '&:hover': {
          filter: 'brightness(1.2)',
          border: `${borderW}px solid ${borderCol}`,
          backgroundColor: bgColor,
        }
      }}
    >
      {text}
    </MuiButton>
  );
};

Button.craft = {
  props: {
    text: 'Click Me',
    bgColor: '#007acc',
    textColor: '#ffffff',
    borderW: 1,
    borderCol: '#005a9e',
    radius: 0, // Sharp corners by default
    padX: 20,
    padY: 10,
    fontSize: 14,
  },
};