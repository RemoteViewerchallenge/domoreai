import React from 'react';

interface CardProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children }) => {
  return (
    <div className="border border-neutral-800 rounded-lg p-4">
      {children}
    </div>
  );
};
