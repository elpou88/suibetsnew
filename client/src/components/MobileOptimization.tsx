import React from 'react';

// Mobile optimization styles and components
export const MobileOptimizedCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`
    w-full 
    border border-[#1e3a3f] 
    bg-[#112225] 
    rounded-lg 
    overflow-hidden
    touch-pan-y
    ${className}
  `}>
    {children}
  </div>
);

export const MobileOptimizedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false
}) => {
  const baseClasses = `
    w-full
    py-3
    px-4
    text-center
    rounded-lg
    font-medium
    transition-colors
    touch-manipulation
    active:scale-95
    disabled:opacity-50
    disabled:cursor-not-allowed
    min-h-[44px]
  `;
  
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    secondary: 'bg-[#1e3a3f] hover:bg-[#2a4a4f] text-cyan-400',
    outline: 'border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black'
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const MobileResponsiveGrid: React.FC<{ 
  children: React.ReactNode; 
  columns?: 1 | 2 | 3;
  gap?: 2 | 4 | 6;
}> = ({ 
  children, 
  columns = 1, 
  gap = 4 
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  };
  
  const gapClasses = {
    2: 'gap-2',
    4: 'gap-4', 
    6: 'gap-6'
  };
  
  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} w-full`}>
      {children}
    </div>
  );
};

export const MobileHeader: React.FC<{
  title: string;
  subtitle?: string;
  backButton?: boolean;
  onBack?: () => void;
}> = ({ title, subtitle, backButton = false, onBack }) => (
  <div className="sticky top-0 z-10 bg-[#0b1618] border-b border-[#1e3a3f] p-4">
    <div className="flex items-center space-x-3">
      {backButton && (
        <button
          onClick={onBack}
          className="p-2 text-cyan-400 hover:text-cyan-300 touch-manipulation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold text-cyan-400">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export const MobileBottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#112225] border-t border-[#1e3a3f] rounded-t-xl max-h-[90vh] overflow-hidden">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-400 rounded-full mx-auto mt-3 mb-4" />
        
        {/* Header */}
        {title && (
          <div className="px-4 pb-4 border-b border-[#1e3a3f]">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const MobileSwipeableCard: React.FC<{
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}> = ({ children, onSwipeLeft, onSwipeRight, className = '' }) => {
  const [startX, setStartX] = React.useState<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;
    
    // Minimum swipe distance
    if (Math.abs(diffX) < 50) return;
    
    if (diffX > 0 && onSwipeLeft) {
      onSwipeLeft();
    } else if (diffX < 0 && onSwipeRight) {
      onSwipeRight();
    }
    
    setStartX(null);
  };
  
  return (
    <div
      className={`touch-pan-y select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

// Mobile-specific CSS classes as a constant
export const MOBILE_STYLES = {
  // Touch targets should be at least 44px
  touchTarget: 'min-h-[44px] min-w-[44px]',
  
  // Safe areas for notched devices
  safeAreaTop: 'pt-safe-area-inset-top',
  safeAreaBottom: 'pb-safe-area-inset-bottom',
  
  // Hide on mobile
  hideMobile: 'hidden md:block',
  
  // Show only on mobile
  showMobile: 'block md:hidden',
  
  // Mobile-optimized text sizes
  textMobile: 'text-sm md:text-base',
  titleMobile: 'text-lg md:text-xl',
  
  // Mobile-optimized spacing
  paddingMobile: 'p-3 md:p-4',
  marginMobile: 'm-3 md:m-4',
  
  // Mobile-optimized grid
  gridMobile: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  
  // Scrollable areas
  scrollMobile: 'overflow-x-auto scrollbar-hide',
  
  // Modal on mobile, popover on desktop
  modalMobile: 'md:relative md:translate-y-0 md:bg-transparent fixed inset-0 bg-black/50 z-50 md:z-auto',
};

// Hook for detecting mobile/tablet
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  
  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};

export default {
  MobileOptimizedCard,
  MobileOptimizedButton,
  MobileResponsiveGrid,
  MobileHeader,
  MobileBottomSheet,
  MobileSwipeableCard,
  MOBILE_STYLES,
  useMobileDetection
};