'use client';

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { MediaPlayer } from './MediaPlayer';
import { LeftPanelInfo } from './LeftPanelInfo';
import { EditorView } from './EditorView';

export function ResizableLayout() {
  const [leftWidth, setLeftWidth] = useState(380);
  const [isMobile, setIsMobile] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDragging = (e: React.PointerEvent) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('is-dragging-resizer');
  };

  const stopDragging = (e?: globalThis.PointerEvent) => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
    document.body.classList.remove('is-dragging-resizer');
  };

  const onDrag = (e: globalThis.PointerEvent) => {
    if (!isDragging.current) return;
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < window.innerWidth - 200) {
      setLeftWidth(newWidth);
    }
  };

  useEffect(() => {
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    return () => {
      window.removeEventListener('pointermove', onDrag);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, []);

  return (
    <div 
      className={`flex-1 flex flex-col lg:flex-row lg:overflow-hidden border-t border-[var(--app-border-base)] relative ${isMobile ? 'overflow-y-auto custom-scrollbar' : ''}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      {/* Left side: Media Player Component and Info Tabs */}
      <div 
        style={isMobile ? undefined : { width: `${leftWidth}px`, minWidth: `${leftWidth}px` }} 
        className={isMobile ? 'contents' : 'flex flex-col lg:border-r border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] shrink-0 w-full lg:w-auto z-10 lg:h-full lg:overflow-hidden relative'}
      >
        <div className={isMobile ? 'contents' : 'bg-[var(--app-bg-input)] lg:border-b border-[var(--app-border-base)] p-0 flex flex-col justify-center shrink-0'}>
          <MediaPlayer />
        </div>
        {!isMobile && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <LeftPanelInfo />
          </div>
        )}
      </div>
      
      {/* Resizer */}
      {!isMobile && (
        <div 
          onPointerDown={startDragging}
          className="w-[8px] bg-transparent hover:bg-[var(--app-accent)] cursor-col-resize z-50 flex items-center justify-center transition-colors group mx-[-4px] touch-none"
        >
           <div className="w-0.5 h-8 bg-[var(--app-border-base)] group-hover:bg-[var(--app-text-primary)] text-[var(--app-bg-base)] rounded-full" />
        </div>
      )}
        
      {/* Right side: Editor View */}
      <div 
        className={isMobile ? 'contents' : 'flex-1 lg:h-full flex flex-col bg-[var(--app-bg-base)] lg:overflow-hidden min-w-0 relative z-30 lg:w-auto w-full'}
      >
         <EditorView />
      </div>
    </div>
  );
}
