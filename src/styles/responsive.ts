import React from 'react';

// Responsive design utilities and breakpoints for animath animations

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200,
} as const;

export const MEDIA_QUERIES = {
  mobile: `@media (max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `@media (max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.desktop}px)`,
  large: `@media (min-width: ${BREAKPOINTS.large}px)`,
  mobileOnly: `@media (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tabletOnly: `@media (min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
} as const;

export const getResponsiveCanvasStyle = (isMobile: boolean = false) => ({
  width: '100%',
  height: '100%',
  minHeight: isMobile ? 'calc(100vh - 100px)' : '100vh',
  maxWidth: '100vw',
  maxHeight: '100vh',
});

export const getResponsiveControlsStyle = (isMobile: boolean = false) => ({
  position: 'absolute' as const,
  zIndex: 10,
  background: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  borderRadius: '6px',
  padding: isMobile ? '8px' : '12px',
  fontSize: isMobile ? '14px' : '16px',
  backdropFilter: 'blur(4px)',
});

export const getResponsiveButtonStyle = (isMobile: boolean = false) => ({
  padding: isMobile ? '6px 12px' : '8px 16px',
  fontSize: isMobile ? '12px' : '14px',
  minHeight: isMobile ? '36px' : '32px',
  minWidth: isMobile ? '60px' : 'auto',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#f0f0f0',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
});

export const getResponsiveInputStyle = (isMobile: boolean = false) => ({
  padding: isMobile ? '6px' : '4px',
  fontSize: isMobile ? '14px' : '12px',
  minHeight: isMobile ? '32px' : '24px',
  border: '1px solid #ccc',
  borderRadius: '3px',
});

export const getResponsiveLayoutStyle = (layout: 'single' | 'split', isMobile: boolean = false) => {
  if (layout === 'split') {
    return {
      display: 'flex',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      width: '100%',
      height: '100vh',
      gap: isMobile ? '8px' : '16px',
      padding: isMobile ? '8px' : '16px',
      boxSizing: 'border-box' as const,
    };
  }
  
  return {
    width: '100%',
    height: '100vh',
    position: 'relative' as const,
    overflow: 'hidden',
  };
};

// Custom hook to detect mobile/tablet screen sizes
export const useResponsive = () => {
  const [screenSize, setScreenSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width <= BREAKPOINTS.mobile);
      setIsTablet(width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  };
};