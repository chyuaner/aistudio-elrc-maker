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
        <div 
           className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] uppercase font-mono font-bold rounded shadow-lg whitespace-nowrap pointer-events-none transform transition-transform"
           style={{ backgroundColor: 'var(--app-text-primary)', color: 'var(--app-bg-base)' }}
        >
          {title}
          <div 
             className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
             style={{ borderTopColor: 'var(--app-text-primary)' }}
          ></div>
        </div>
      )}
    </div>
  );
}
