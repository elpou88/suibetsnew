import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-4'
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent", 
        sizeClasses[size],
        className
      )} 
      aria-label="Loading"
    />
  );
};