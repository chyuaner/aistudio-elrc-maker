'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { useSyncHotkeys } from './useSyncHotkeys';
import { Tooltip } from './Tooltip';
import { KaraokePreview } from './KaraokePreview';
import { formatTime } from '@/lib/lyric-utils';
import { useAutoScroll } from './useAutoScroll';
import { Edit2, Trash2, X } from 'lucide-react';
import { useDialogs } from './DialogProvider';

export function DualSyncEditor() {
  const {
    lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef, dualLineGapSec, setDualLineGapSec,
    trackAssignments, paragraphStarts, autoScrollEnabled, setAutoScrollEnabled, currentTime
  } = useEditor();
  
  const dialogs = useDialogs();
  const { handleLineStamp, handleWordStamp, handleWordNextLine } = useSyncHotkeys();
  useAutoScroll();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // When active line changes, focus it
    if (containerRef.current && autoScrollEnabled) {
      const activeEl = containerRef.current.querySelector(`[data-line-index="${activeLineIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeLineIndex, autoScrollEnabled]);

  const uiPairs: { left: { line: any, index: number } | null, right: { line: any, index: number } | null }[] = [];
  let currentPair: { left: { line: any, index: number } | null, right: { line: any, index: number } | null } = { left: null, right: null };
  const currentPairEmpty = () => currentPair.left === null && currentPair.right === null;

  lines.forEach((line, i) => {
     const track = trackAssignments[i] || 0;
     if (track === 0) {
        if (!currentPairEmpty()) {
           uiPairs.push(currentPair);
        }
        currentPair = { left: { line, index: i }, right: null };
     } else {
        currentPair.right = { line, index: i };
        uiPairs.push(currentPair);
        currentPair = { left: null, right: null };
     }
  });
  if (!currentPairEmpty()) {
     uiPairs.push(currentPair);
  }

  const handleEditText = async (globalIndex: number, currentText: string) => {
    const newText = await dialogs.prompt('Edit line text:', currentText);
    if (newText !== null && newText !== currentText) {
       const newLines = [...lines];
       newLines[globalIndex].raw = newText;
       // We should preserve timestamps where possible, but for simplicity here we just preserve line start/end and drop word level timings since text length changed
       // Or map via basic split if we want. Let's just drop words timestamp.
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

  const renderCell = (data: { line: any, index: number } | null) => {
    if (!data) {
      return (
        <td className="p-3 w-1/2 border-r border-[#2D333B] align-top bg-[#08090C]/30 text-center">
          <span className="opacity-20 font-mono text-[10px] tracking-widest uppercase">Intrumental Break</span>
        </td>
      );
    }
    
    const { line, index: globalIndex } = data;
    const isActive = globalIndex === activeLineIndex;
    const isStamped = line.start !== null;

    return (
      <td 
        data-line-index={globalIndex}
        onClick={() => {
          setActiveLineIndex(globalIndex);
          setActiveWordIndex(0);
        }}
        className={`p-0 w-1/2 align-top group cursor-pointer border-r border-[#2D333B] transition-colors relative
          ${isActive ? 'bg-[#2D333B] text-white shadow-[inset_2px_0_0_0_#F27D26]' : 
            (paragraphStarts[globalIndex] ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 text-[#7D8590] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)]' : 'hover:bg-[#1A1D23] text-[#7D8590]')}`}
      >
        <div className="flex w-full h-full p-2 gap-2">
          <div 
            className="w-16 font-mono text-[11px] hover:text-white pt-1 shrink-0"
            onClick={(e) => {
               e.stopPropagation();
               const player = playerRef?.current;
               if (player && line.start !== null) {
                  player.currentTime = line.start;
               }
            }}
            title="Click to seek"
          >
            <span className={isStamped ? 'text-[#F27D26]' : 'opacity-30'}>
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
                    <Tooltip key={wIdx} title={word.start !== null ? formatTime(word.start) : 'Not synced'}>
                      <span 
                        className={`
                          px-1 py-0.5 rounded transition-all select-none
                          ${isWordActive ? 'bg-[#F27D26] text-black font-bold ring-2 ring-[#F27D26]/50 cursor-pointer' : 'cursor-pointer'}
                          ${isWordStamped && !isWordActive ? 'text-[#F27D26] bg-[#2D333B]' : ''}
                          ${!isWordStamped && !isWordActive ? 'text-[#7D8590] bg-[#1A1D23]' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLineIndex(globalIndex);
                          setActiveWordIndex(wIdx);
                          const player = playerRef?.current;
                          if (player && word.start !== null) {
                             player.currentTime = word.start;
                          }
                        }}
                      >
                        {word.text || '⏎'}
                      </span>
                    </Tooltip>
                  );
                })}
              </div>
             )}
          </div>
          
          <div className="w-24 shrink-0 flex items-start justify-end gap-1 pt-1 opacity-70 hover:opacity-100">
            <Tooltip title="Edit text" delay={1000}>
              <button onClick={(e) => { e.stopPropagation(); handleEditText(globalIndex, line.raw || ''); }} className="p-1 px-1.5 text-[#7D8590] hover:text-[#E0E0E0] hover:bg-[#3D444D] rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
            </Tooltip>
            <Tooltip title="Clear timestamps" delay={1000}>
              <button onClick={(e) => { e.stopPropagation(); handleClearTime(globalIndex); }} className="p-1 px-1.5 text-[#7D8590] hover:text-[#F27D26] hover:bg-[#3D444D] rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
            </Tooltip>
            <Tooltip title="Delete line" delay={1000}>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(globalIndex); }} className="p-1 px-1.5 text-[#7D8590] hover:text-red-500 hover:bg-[#3D444D] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </Tooltip>
          </div>
        </div>
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1115]">
      <div className="p-3 bg-[#16191E] border-b border-[#2D333B] flex flex-wrap items-center justify-between shrink-0 gap-4">
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
        className="flex-1 overflow-y-auto custom-scrollbar" 
        ref={containerRef}
      >
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-[#1A1D23] sticky top-0 z-10 text-[10px] uppercase font-bold text-[#7D8590] tracking-widest outline outline-1 outline-b-[#2D333B]">
            <tr>
              <th className="p-3 w-1/2 border-r border-[#2D333B]">Left Track</th>
              <th className="p-3 w-1/2">Right Track</th>
            </tr>
          </thead>
          <tbody>
            {uiPairs.map((pair, idx) => (
               <tr key={idx} className="border-b border-[#2D333B]/50">
                  {renderCell(pair.left)}
                  {renderCell(pair.right)}
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

