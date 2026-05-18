'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

export function Tooltip({ children, title, delay = 50 }: { children: ReactNode, title: string, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] uppercase font-mono font-bold text-[var(--app-text-primary)] bg-[var(--app-text-primary)] text-[var(--app-bg-base)] bg-opacity-90 rounded border border-[var(--app-border-light)] shadow-lg whitespace-nowrap pointer-events-none transform -translate-y-1 transition-transform">
          {title}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--app-border-light)]"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-black translate-y-[-1px]"></div>
        </div>
      )}
    </div>
  );
}
