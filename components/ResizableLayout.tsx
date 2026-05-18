'use client';

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { MediaPlayer } from './MediaPlayer';
import { LeftPanelInfo } from './LeftPanelInfo';
import { EditorView } from './EditorView';

export function ResizableLayout() {
  const [leftWidth, setLeftWidth] = useState(25);
  const [isMobile, setIsMobile] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDragging = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const stopDragging = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
  };

  const onDrag = (e: globalThis.MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setLeftWidth(newWidth);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col lg:flex-row md:overflow-hidden border-t border-[var(--app-border-base)]">
      {/* Left side: Media Player Component and Info Tabs */}
      <div 
        style={{ width: isMobile ? '100%' : `calc(${leftWidth}% - 4px)` }} 
        className="flex flex-col border-r border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] shrink-0 lg:h-full lg:overflow-hidden"
      >
        <div className="bg-[var(--app-bg-input)] border-b border-[var(--app-border-base)] p-2 lg:p-4 flex flex-col justify-center shrink-0">
          <MediaPlayer />
        </div>
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
          <LeftPanelInfo />
        </div>
      </div>
      
      {/* Resizer */}
      {!isMobile && (
        <div 
          onMouseDown={startDragging}
          className="w-[8px] bg-transparent hover:bg-[var(--app-accent)] cursor-col-resize z-50 flex items-center justify-center transition-colors group mx-[-4px]"
        >
           <div className="w-0.5 h-8 bg-[var(--app-border-base)] group-hover:bg-[var(--app-text-primary)] text-[var(--app-bg-base)] rounded-full" />
        </div>
      )}
        
      {/* Right side: Editor View */}
      <div 
        style={{ width: isMobile ? '100%' : `calc(${100 - leftWidth}% - 4px)` }} 
        className="flex-1 lg:h-full flex flex-col bg-[var(--app-bg-base)] md:overflow-hidden min-h-0"
      >
         <EditorView />
      </div>
    </div>
  );
}
