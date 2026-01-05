import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'cyan';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'cyan' 
}) => {
  // Size mapping
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  // Color mapping
  const colorMap = {
    primary: 'border-cyan-500 border-t-cyan-300',
    white: 'border-white/30 border-t-white',
    cyan: 'border-cyan-700 border-t-cyan-300'
  };
  
  return (
    <div 
      className={`inline-block ${sizeMap[size]} ${colorMap[color]} rounded-full border-4 animate-spin`}
      role="status"
      aria-label="Loading..."
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;