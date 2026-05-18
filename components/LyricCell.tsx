import React from 'react';
import { formatTime } from '@/lib/lyric-utils';
import { Tooltip } from './Tooltip';

export function LyricCellContent({ 
  line, 
  globalIndex, 
  isActive, 
  activeWordIndex, 
  syncMode, 
  playerRef, 
  setActiveLineIndex, 
  setActiveWordIndex,
  actions 
}: { 
  line: any, 
  globalIndex: number, 
  isActive: boolean, 
  activeWordIndex: number, 
  syncMode: 'line' | 'word', 
  playerRef: any,
  setActiveLineIndex: (idx: number) => void,
  setActiveWordIndex: (w: number) => void,
  actions?: React.ReactNode
}) {
  const isStamped = line.start !== null;

  return (
    <div className="flex w-full h-full p-2 gap-2 text-xs">
      <div 
        className="w-16 font-mono text-[11px] hover:text-[var(--app-text-primary)] pt-1 shrink-0 cursor-pointer"
        onClick={(e) => {
           e.stopPropagation();
           const { current: player } = playerRef;
           if (player instanceof HTMLMediaElement && line.start !== null) {
              player.currentTime = line.start;
           }
        }}
        title="Click to seek"
      >
        <span className={isStamped ? 'text-[var(--app-accent)]' : 'opacity-30'}>
           {isStamped ? formatTime(line.start) : '--:--.--'}
        </span>
      </div>
      
      <div className={`flex-1 leading-relaxed ${isActive ? 'font-medium' : ''}`}>
        {syncMode === 'line' ? (
          line.raw
         ) : (
          <div className="flex flex-wrap gap-x-1 gap-y-1">
            {line.words && line.words.map((word: any, wIdx: number) => {
              const isWordActive = isActive && wIdx === activeWordIndex;
              const isWordStamped = word.start !== null;
              return (
                <Tooltip key={wIdx} title={word.start !== null ? formatTime(word.start) : 'Not synced'} delay={500}>
                  <span 
                    className={`
                      px-1 py-0.5 rounded transition-all select-none
                      ${isWordActive ? 'bg-[var(--app-accent)] text-black font-bold ring-2 ring-[var(--app-accent)]/50 cursor-pointer' : 'cursor-pointer'}
                      ${isWordStamped && !isWordActive ? 'text-[var(--app-accent)] bg-[var(--app-border-base)]' : ''}
                      ${!isWordStamped && !isWordActive ? 'text-[var(--app-text-muted)] bg-[var(--app-bg-panel)]' : ''}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLineIndex(globalIndex);
                      setActiveWordIndex(wIdx);
                      const { current: player } = playerRef;
                      if (player instanceof HTMLMediaElement && word.start !== null) {
                         player.currentTime = word.start;
                      }
                    }}
                  >
                    {word.text || '⏎'}
                  </span>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>
      {actions && (
        <div className="w-24 shrink-0 flex items-start justify-end gap-1 pt-1 opacity-70 hover:opacity-100">
           {actions}
        </div>
      )}
    </div>
  );
}
