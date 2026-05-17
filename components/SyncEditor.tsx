'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { useSyncHotkeys } from './useSyncHotkeys';
import { formatTime } from '@/lib/lyric-utils';
import { KaraokePreview } from './KaraokePreview';
import { Tooltip } from './Tooltip';
import { Edit2, Trash2, X } from 'lucide-react';

import { useAutoScroll } from './useAutoScroll';
import { useDialogs } from './DialogProvider';

export function SyncEditor() {
  const {
    lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef,
    dualLineGapSec, setDualLineGapSec,
    autoScrollEnabled, setAutoScrollEnabled, trackAssignments, paragraphStarts
  } = useEditor();
  
  const dialogs = useDialogs();
  const { handleLineStamp, handleWordStamp, handleWordNextLine } = useSyncHotkeys();
  useAutoScroll();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current && autoScrollEnabled) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, autoScrollEnabled]);

  const handleEditText = async (globalIndex: number, currentText: string) => {
    const newText = await dialogs.prompt('Edit line text:', currentText);
    if (newText !== null && newText !== currentText) {
       const newLines = [...lines];
       newLines[globalIndex].raw = newText;
       newLines[globalIndex].words = newText.split(' ').map((w, i, arr) => ({
          text: w + (i < arr.length - 1 ? ' ' : ''),
          start: null,
          end: null
       }));
       commitLines(newLines, 'Edit Text');
    }
  };

  const handleClearTime = (globalIndex: number) => {
    const newLines = [...lines];
    newLines[globalIndex].start = null;
    if (newLines[globalIndex].words) {
        newLines[globalIndex].words = newLines[globalIndex].words.map((w: any) => ({...w, start: null, end: null}));
    }
    commitLines(newLines, 'Reset Time');
  };

  const handleDeleteLine = (globalIndex: number) => {
    const newLines = lines.filter((_, i) => i !== globalIndex);
    commitLines(newLines, 'Delete Line');
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1115]">
      <div className="p-3 bg-[#16191E] border-b border-[#2D333B] flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSyncMode('line');
              setActiveWordIndex(0);
            }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'line' ? 'bg-[#2D333B] border-[#F27D26] text-[#F27D26] shadow-inner' : 'border-[#444C56] text-[#7D8590] hover:text-[#E0E0E0]'}`}
          >
            Line-by-Line
          </button>
          <button
            onClick={() => setSyncMode('word')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'word' ? 'bg-[#2D333B] border-[#F27D26] text-[#F27D26] shadow-inner' : 'border-[#444C56] text-[#7D8590] hover:text-[#E0E0E0]'}`}
          >
            Word-by-Word
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#7D8590]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input 
              type="checkbox" 
              checked={autoScrollEnabled} 
              onChange={(e) => setAutoScrollEnabled(e.target.checked)}
              className="accent-[#F27D26]"
            />
            <span className="uppercase font-bold tracking-widest">Auto Scroll</span>
          </label>

          <div className="flex items-center gap-2 bg-[#1A1D23] p-1.5 rounded border border-[#2D333B] shadow-sm">
             <span className="uppercase">Gap Toggled At:</span>
             <input 
               type="number"
               min="1" max="60"
               value={dualLineGapSec}
               onChange={(e) => setDualLineGapSec(Number(e.target.value) || 6)}
               className={`bg-[#2D333B] px-1 w-12 py-0.5 rounded outline-none border border-[#444C56] text-center ${dualLineGapSec < 5.5 ? 'text-red-500' : 'text-[#F27D26]'}`}
             />
             <span>sec</span>
          </div>

          <button onFocus={(e) => e.target.blur()} onClick={() => syncMode === 'line' ? handleLineStamp() : handleWordStamp()} className="bg-[#1A1D23] hover:bg-[#2D333B] transition-colors p-1.5 rounded border border-[#2D333B] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
              <span className="uppercase">{syncMode === 'line' ? 'Line Trigger' : 'Word Trigger'}</span>
              <kbd className="bg-[#0F1115] text-[#F27D26] px-1.5 py-0.5 rounded font-mono border border-[#444C56]">{hotkeys.stampWord === ' ' ? 'SPACE' : hotkeys.stampWord}</kbd>
          </button>
          {syncMode === 'word' && (
            <button onFocus={(e) => e.target.blur()} onClick={() => handleWordNextLine()} className="bg-[#1A1D23] hover:bg-[#2D333B] transition-colors p-1.5 rounded border border-[#2D333B] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
                <span className="uppercase">Line Advance</span>
                <kbd className="bg-[#0F1115] text-[#F27D26] px-1.5 py-0.5 rounded font-mono border border-[#444C56]">{hotkeys.nextLine.toUpperCase()}</kbd>
            </button>
          )}
        </div>
      </div>

      <KaraokePreview />

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full bg-[#0F1115]"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[#1A1D23] text-[#7D8590] border-b border-[#2D333B] z-10 text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-3 font-medium w-24 border-r border-[#2D333B] text-center">Time</th>
              <th className="p-3 font-medium">Lyrics Content (Enhanced Mode)</th>
              <th className="p-3 font-medium w-28 text-center border-l border-[#2D333B]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262D]">
        {lines.map((line, idx) => {
          const isActiveLine = idx === activeLineIndex;
          const isPast = idx < activeLineIndex;
          
          return (
            <tr 
              key={line.id || idx} 
              ref={isActiveLine ? activeLineRef : null}
              className={`transition-colors cursor-pointer group ${
                isActiveLine ? 'bg-[#1C2128] border-l-2 border-l-[#F27D26]' : 
                (paragraphStarts[idx] ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 border-l-2 border-l-[#41A87D]/50' : 'hover:bg-[#16191E]') +
                (isPast && !isActiveLine && !paragraphStarts[idx] ? ' opacity-60' : '')
              }`}
              onClick={() => {
                 setActiveLineIndex(idx);
                 setActiveWordIndex(0);
              }}
            >
              <td 
                className={`p-3 font-mono text-center border-r border-[#2D333B] ${isActiveLine ? 'text-[#F27D26]' : isPast ? 'text-blue-400' : 'text-gray-500 text-[10px]'} cursor-pointer hover:text-white`}
                onClick={(e) => {
                  e.stopPropagation();
                  const player = playerRef?.current;
                  if (player && line.start !== null) {
                    player.currentTime = line.start;
                  }
                }}
                title="Click to seek"
              >
                {line.start !== null ? formatTime(line.start) : '--:--.--'}
              </td>
              
              <td className="p-3 font-medium">
                <div className="flex flex-wrap gap-1 items-center">
                {syncMode === 'word' ? (
                  line.words.map((word, wIdx) => {
                    const isWordActive = isActiveLine && wIdx === activeWordIndex;
                    const isWordPast = isActiveLine && wIdx < activeWordIndex || (isPast && word.start !== null) || (!isActiveLine && word.start !== null);
                    
                    return (
                      <Tooltip key={wIdx} title={word.start !== null ? formatTime(word.start) : 'Not synced'}>
                        <span 
                          className={`px-1 rounded transition-colors cursor-pointer select-none ${
                            isWordActive ? 'bg-[#2D333B] text-white border border-dashed border-[#F27D26] animate-pulse' : 
                            isWordPast ? 'bg-[#F27D26] text-black' : 
                            'opacity-40 text-[#E0E0E0]'
                          }`}
                          onClick={(e) => {
                             e.stopPropagation();
                             setActiveLineIndex(idx);
                             setActiveWordIndex(wIdx);
                             const player = playerRef?.current;
                             if (player && word.start !== null) {
                                player.currentTime = word.start;
                             }
                          }}
                        >
                           {word.text || (wIdx === line.words.length - 1 ? '⏎' : '')}
                        </span>
                      </Tooltip>
                    )
                  })
                ) : (
                   <span className={isActiveLine ? 'text-[#F27D26]' : 'text-[#7D8590]'}>
                     {line.words.map(w => w.text).join('')}
                   </span>
                )}
                </div>
              </td>
              
              <td className="p-2 border-l border-[#2D333B]">
                <div className="flex items-center justify-center gap-1 opacity-70 hover:opacity-100">
                   <Tooltip title="Edit text" delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleEditText(idx, line.raw || ''); }} className="p-1 px-1.5 text-[#7D8590] hover:text-[#E0E0E0] hover:bg-[#3D444D] rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                   <Tooltip title="Clear timestamps" delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleClearTime(idx); }} className="p-1 px-1.5 text-[#7D8590] hover:text-[#F27D26] hover:bg-[#3D444D] rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                   <Tooltip title="Delete line" delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(idx); }} className="p-1 px-1.5 text-[#7D8590] hover:text-red-500 hover:bg-[#3D444D] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                </div>
              </td>
            </tr>
          );
        })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
