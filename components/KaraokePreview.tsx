'use client';

import React, { useState, useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function KaraokePreview() {
  const { lines, activeLineIndex, activeWordIndex, trackAssignments, paragraphStarts, dualLineGapSec, syncMode, autoScrollEnabled, playerRef, isPlaying } = useEditor();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

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

  const getWordColor = (lineIdx: number, wordIdx: number) => {
      if (lineIdx < activeLineIndex) {
          return "text-[var(--app-accent)] drop-shadow-[0_0_8px_rgba(242,125,38,0.8)] transition-all";
      } else if (lineIdx === activeLineIndex) {
          const isLineSynced = lines[lineIdx].words.every(w => w.start === null);
          if (syncMode === 'line' || isLineSynced) {
              return "text-[var(--app-text-primary)] underline decoration-[var(--app-accent)] decoration-4 underline-offset-8 transition-all relative transform scale-105 origin-bottom z-10";
          }
          if (wordIdx < activeWordIndex) {
              return "text-[var(--app-accent)] drop-shadow-[0_0_8px_rgba(242,125,38,0.8)] transition-all";
          } else if (wordIdx === activeWordIndex) {
              return "text-[var(--app-text-primary)] underline decoration-[var(--app-accent)] decoration-4 underline-offset-8 transition-all relative transform scale-105 origin-bottom z-10";
          } else {
              return "text-[var(--app-text-muted)] transition-colors";
          }
      } else {
          return "text-[var(--app-text-muted)] transition-colors";
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
         <circle cx="12" cy="12" r="10" fill="white" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--app-border-light)' }} />
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
        <div className="p-4 pt-0 flex flex-col gap-4">
          <div className={`bg-[var(--app-bg-base)] px-4 py-3 rounded border relative shadow-inner min-h-[4.5rem] flex items-center ${isTopOnly ? 'justify-center' : 'justify-start'} ${topIsActive ? 'border-[var(--app-accent)] shadow-[0_0_10px_rgba(242,125,38,0.2)]' : 'border-[var(--app-border-base)] opacity-70'}`}>
            {lines[topIndex] ? (
               <p className={`text-xl md:text-2xl font-bold tracking-wide flex gap-1 flex-wrap relative ${isTopOnly ? 'justify-center text-center' : 'text-left'}`}>
                 {topIsActive && dotsCount > 0 && (
                     <span className={`absolute bottom-full mb-3 flex gap-2 ${isTopOnly ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}>
                        {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                     </span>
                 )}
                 {lines[topIndex].words.map((w, i) => (
                   <span key={i} className={getWordColor(topIndex, i)}>
                     {w.text || (i === lines[topIndex].words.length - 1 ? '⏎' : '')}
                   </span>
                 ))}
               </p>
            ) : (
               <p className="text-xl md:text-2xl font-bold relative w-full h-full flex items-center justify-start">
                 {topIsActive && dotsCount > 0 && (
                     <span className="absolute bottom-1/2 left-0 flex gap-2">
                        {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                     </span>
                 )}
                 &nbsp;
               </p>
            )}
          </div>

          <div className={`bg-[var(--app-bg-base)] px-4 py-3 rounded border relative shadow-inner min-h-[4.5rem] flex items-center ${isBottomOnly ? 'justify-center' : 'justify-end'} ${bottomIsActive ? 'border-[var(--app-accent)] shadow-[0_0_10px_rgba(242,125,38,0.2)]' : 'border-[var(--app-border-base)] opacity-70'}`}>
            {lines[bottomIndex] ? (
              <p className={`text-xl md:text-2xl font-bold tracking-wide flex gap-1 flex-wrap relative ${isBottomOnly ? 'justify-center text-center' : 'justify-end text-right'}`}>
                {bottomIsActive && dotsCount > 0 && (
                     <span className={`absolute bottom-full mb-3 flex gap-2 ${isBottomOnly ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}>
                        {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                     </span>
                )}
                {lines[bottomIndex].words.map((w, i) => (
                   <span key={i} className={getWordColor(bottomIndex, i)}>
                     {w.text || (i === lines[bottomIndex].words.length - 1 ? '⏎' : '')}
                   </span>
               ))}
              </p>
            ) : (
               <p className={`text-xl md:text-2xl font-bold relative w-full h-full flex items-center ${isBottomOnly ? 'justify-center' : 'justify-end'}`}>
                 {bottomIsActive && dotsCount > 0 && (
                     <span className={`absolute bottom-1/2 flex gap-2 ${isBottomOnly ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}>
                        {[...Array(dotsCount)].map((_, i) => <React.Fragment key={i}>{DotNode}</React.Fragment>)}
                     </span>
                 )}
                 &nbsp;
               </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
