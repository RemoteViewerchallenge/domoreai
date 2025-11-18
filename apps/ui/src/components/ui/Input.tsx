import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className={`bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan ${props.className}`}
    />
  );
};
