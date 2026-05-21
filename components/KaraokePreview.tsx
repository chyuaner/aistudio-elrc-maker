'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSyncHotkeys } from './useSyncHotkeys';

export function KaraokePreview({ hideTouchUI = false }: { hideTouchUI?: boolean }) {
  const { lines, activeLineIndex, activeWordIndex, trackAssignments, paragraphStarts, dualLineGapSec, syncMode, autoScrollEnabled, playerRef, isPlaying, touchUIMode } = useEditor();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { handleLineStamp, handleWordStamp, handleWordNextLine } = useSyncHotkeys();

  useEffect(() => {
    let rafId: number;
    const updateTime = () => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.currentTime);
      }
      rafId = requestAnimationFrame(updateTime);
    };
    rafId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafId);
  }, [playerRef]);

  let topIndex = -1;
  let bottomIndex = -1;
  let previewLineIndex = activeLineIndex;

    if (lines.length > 0) {
        let firstStampedIndex = -1;
        for (let i = 0; i < lines.length; i++) {
           if (lines[i].start !== null) {
              firstStampedIndex = i;
              break;
           }
        }

        if (firstStampedIndex !== -1 && currentTime <= lines[firstStampedIndex].start!) {
            previewLineIndex = firstStampedIndex;
        } else if (activeLineIndex + 1 < lines.length) {
           const nextLine = lines[activeLineIndex + 1];
           if (paragraphStarts[activeLineIndex + 1] && nextLine.start !== null) {
               const gap = nextLine.start - currentTime;
               if (gap > 0 && gap <= dualLineGapSec) {
                   previewLineIndex = activeLineIndex + 1;
               }
           }
        }
    }

  if (lines.length > 0) {
      let paraStart = previewLineIndex;
      while (paraStart > 0 && !paragraphStarts[paraStart]) paraStart--;

      let paraEnd = previewLineIndex + 1;
      while (paraEnd < lines.length && !paragraphStarts[paraEnd]) paraEnd++;

      const activeTrack = trackAssignments[previewLineIndex] || 0;

      if (activeTrack === 0) {
          const pairIndex = previewLineIndex + 1;
          if (pairIndex < paraEnd) {
              topIndex = previewLineIndex;
              bottomIndex = pairIndex;
          } else {
              topIndex = -1;
              bottomIndex = previewLineIndex;
          }
      } else {
          bottomIndex = previewLineIndex;
          const nextTop = previewLineIndex + 1;
          
          if (nextTop < paraEnd) {
              const nextTopIsAlone = (nextTop + 1 >= paraEnd);
              if (nextTopIsAlone) {
                  topIndex = previewLineIndex - 1;
              } else {
                  topIndex = nextTop;
              }
          } else {
              topIndex = previewLineIndex - 1;
          }
      }
  }

  const isTopOnly = topIndex !== -1 && bottomIndex === -1;
  const isBottomOnly = bottomIndex !== -1 && topIndex === -1;

  const topIsActive = topIndex === previewLineIndex;
  const bottomIsActive = bottomIndex === previewLineIndex;

  const [touchBtnWidth, setTouchBtnWidth] = useState(140);
  const dragRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      // We are dragging the left edge of the right panel, so window.innerWidth - clientX is the width.
      // But actually, we shouldn't rely on window.innerWidth strictly because of the left panel width.
      // Easiest is to measure delta from previous, or just e.clientX.
      // Right panel width = window.innerWidth - e.clientX
      // Let's constrain it between 80px and 70% of the screen width
      e.preventDefault();
      const newWidth = document.body.clientWidth - e.clientX - 16; // minus padding
      setTouchBtnWidth(Math.max(80, Math.min(document.body.clientWidth * 0.7, newWidth)));
    };
    
    const onMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = false;
        document.body.style.cursor = 'default';
        document.body.classList.remove('is-dragging-resizer');
      }
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const getWordColor = (lineIdx: number, wordIdx: number) => {
      if (lineIdx < activeLineIndex) {
          return "text-[var(--app-accent)] drop-shadow-[0_0_8px_rgba(242,125,38,0.8)] border-b-4 border-transparent pb-1 transition-all";
      } else if (lineIdx === activeLineIndex) {
          const isLineSynced = lines[lineIdx].words.every(w => w.start === null);
          if (syncMode === 'line' || isLineSynced) {
              return "text-[var(--app-text-primary)] border-b-4 border-[var(--app-accent)] pb-1 transition-all relative transform scale-105 origin-bottom z-10";
          }
          if (wordIdx < activeWordIndex) {
              return "text-[var(--app-accent)] drop-shadow-[0_0_8px_rgba(242,125,38,0.8)] border-b-4 border-transparent pb-1 transition-all";
          } else if (wordIdx === activeWordIndex) {
              return "text-[var(--app-text-primary)] border-b-4 border-[var(--app-accent)] pb-1 transition-all relative transform scale-105 origin-bottom z-10";
          } else {
              return "text-[var(--app-text-muted)] border-b-4 border-transparent pb-1 transition-colors";
          }
      } else {
          return "text-[var(--app-text-muted)] border-b-4 border-transparent pb-1 transition-colors";
      }
  };

  let dotsCount = 0;

  if (autoScrollEnabled && lines.length > 0 && lines[previewLineIndex]?.start !== null && paragraphStarts[previewLineIndex]) {
      const start = lines[previewLineIndex].start!;
      const timeLeft = start - currentTime;
      if (timeLeft > 0) {
          dotsCount = Math.max(0, Math.min(4, Math.ceil(timeLeft - 1)));
      }
  }

  const DotNode = (
      <svg width="1em" height="1em" viewBox="0 0 24 24" className="drop-shadow-sm overflow-visible inline-block align-text-bottom mx-1">
         <circle cx="12" cy="12" r="15" fill="white" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--app-border-light)' }} />
      </svg>
  );

  return (
    <div className="flex flex-col border-b border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] shrink-0">
      <div className="flex justify-center items-center px-4 py-2 relative">
        <label className="text-[10px] text-[var(--app-text-muted)] uppercase font-bold tracking-widest text-center cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          Karaoke Preview
        </label>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute right-4 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors p-1">
           {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="flex px-4 pb-4 gap-4 relative">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className={`px-4 py-3 relative min-h-[4.5rem] flex items-center w-full ${isTopOnly ? 'justify-center' : 'justify-start'} ${topIsActive ? '' : 'opacity-70'}`}>
              <div className="relative w-full">
                {lines[topIndex] ? (
                  <>
                    {topIsActive && dotsCount > 0 && (
                        <span className={`absolute bottom-full mb-3 flex gap-2 ${isTopOnly ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}>
                           {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                        </span>
                    )}
                    <div className="overflow-hidden w-full">
                      <p className={`text-xl md:text-2xl font-bold tracking-wide flex gap-1 flex-nowrap whitespace-nowrap ${isTopOnly ? 'justify-center text-center' : 'justify-start text-left'}`}>
                        {lines[topIndex].words.map((w, i) => (
                          <span key={i} className={getWordColor(topIndex, i)}>
                            {w.text || (i === lines[topIndex].words.length - 1 ? '⏎' : '')}
                          </span>
                        ))}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {topIsActive && dotsCount > 0 && (
                        <span className="absolute bottom-full mb-3 left-0 flex gap-2">
                           {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                        </span>
                    )}
                    <div className="overflow-hidden w-full">
                      <p className="text-xl md:text-2xl font-bold w-full h-full flex items-center justify-start flex-nowrap whitespace-nowrap">
                        &nbsp;
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
  
            <div className={`px-4 py-3 relative min-h-[4.5rem] flex items-center w-full ${isBottomOnly ? 'justify-center' : 'justify-end'} ${bottomIsActive ? '' : 'opacity-70'}`}>
              <div className="relative w-full">
                {lines[bottomIndex] ? (
                  <>
                    {bottomIsActive && dotsCount > 0 && (
                         <span className={`absolute bottom-full mb-3 flex gap-2 ${isBottomOnly ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}>
                            {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                         </span>
                    )}
                    <div className="overflow-hidden w-full">
                      <p className={`text-xl md:text-2xl font-bold tracking-wide flex gap-1 flex-nowrap whitespace-nowrap ${isBottomOnly ? 'justify-center text-center' : 'justify-end text-right'}`}>
                        {lines[bottomIndex].words.map((w, i) => (
                           <span key={i} className={getWordColor(bottomIndex, i)}>
                             {w.text || (i === lines[bottomIndex].words.length - 1 ? '⏎' : '')}
                           </span>
                        ))}
                      </p>
                    </div>
                  </>
                ) : (
                   <>
                     {bottomIsActive && dotsCount > 0 && (
                         <span className={`absolute bottom-full mb-3 flex gap-2 ${isBottomOnly ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}>
                            {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                         </span>
                     )}
                     <div className="overflow-hidden w-full">
                       <p className={`text-xl md:text-2xl font-bold w-full h-full flex items-center flex-nowrap whitespace-nowrap ${isBottomOnly ? 'justify-center' : 'justify-end'}`}>
                         &nbsp;
                       </p>
                     </div>
                   </>
                )}
              </div>
            </div>
          </div>
          
          {touchUIMode && !hideTouchUI && (
            <>
              <div 
                className="w-4 -ml-2 -mr-2 cursor-col-resize flex justify-center items-center hover:bg-[var(--app-border-light)] hover:opacity-50 transition-colors z-10"
                onMouseDown={() => {
                  dragRef.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.classList.add('is-dragging-resizer');
                }}
              >
                <div className="w-1 h-8 rounded-full bg-[var(--app-text-muted)] opacity-30"></div>
              </div>
              <div style={{ width: touchBtnWidth }} className="shrink-0 flex flex-col gap-2">
                 <button 
                   autoFocus={false}
                   onClick={(e) => {
                       e.preventDefault();
                       e.currentTarget.blur();
                       syncMode === 'line' ? handleLineStamp() : handleWordStamp();
                   }} 
                   onTouchStart={(e) => {
                       e.preventDefault();
                       syncMode === 'line' ? handleLineStamp() : handleWordStamp();
                   }}
                   className="flex-1 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent-hover)] text-black rounded-lg shadow font-extrabold text-xl md:text-3xl select-none transition-all flex items-center justify-center -outline-offset-2 touch-manipulation focus:outline-none"
                 >
                   打點
                 </button>
                 {syncMode === 'word' && (
                   <button 
                     autoFocus={false}
                     onClick={(e) => {
                         e.preventDefault();
                         e.currentTarget.blur();
                         handleWordNextLine();
                     }} 
                     onTouchStart={(e) => {
                         e.preventDefault();
                         handleWordNextLine();
                     }}
                     className="h-[3rem] bg-[var(--app-bg-panel)] hover:bg-[var(--app-bg-hover)] active:bg-[var(--app-border-base)] text-[var(--app-text-primary)] rounded-lg shadow font-extrabold text-lg md:text-xl border border-[var(--app-border-base)] select-none transition-all flex items-center justify-center -outline-offset-2 touch-manipulation focus:outline-none"
                   >
                     換行
                   </button>
                 )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
