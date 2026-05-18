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
import { useI18n } from '@/hooks/useI18n';

import { LyricCellContent } from './LyricCell';

export function DualSyncEditor() {
  const {
    lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef, dualLineGapSec, setDualLineGapSec,
    trackAssignments, paragraphStarts, autoScrollEnabled, setAutoScrollEnabled, currentTime
  } = useEditor();
  
  const dialogs = useDialogs();
  const i18n = useI18n();
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
        <td className="p-3 w-1/2 border-r border-[var(--app-border-base)] align-top bg-[var(--app-bg-input)]/30 text-center">
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
        className={`p-0 w-1/2 align-top group cursor-pointer border-r border-[var(--app-border-base)] transition-colors relative
          ${isActive ? 'bg-[var(--app-border-base)] text-[var(--app-text-primary)] shadow-[inset_2px_0_0_0_#F27D26]' : 
            (paragraphStarts[globalIndex] ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 text-[var(--app-text-muted)] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)]' : 'hover:bg-[var(--app-bg-panel)] text-[var(--app-text-muted)]')}`}
      >
        <LyricCellContent
          line={line}
          globalIndex={globalIndex}
          isActive={isActive}
          activeWordIndex={activeWordIndex}
          syncMode={syncMode}
          playerRef={playerRef}
          setActiveLineIndex={setActiveLineIndex}
          setActiveWordIndex={setActiveWordIndex}
          actions={
            <>
              <Tooltip title="Edit text" delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleEditText(globalIndex, line.raw || ''); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
              </Tooltip>
              <Tooltip title="Clear timestamps" delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleClearTime(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
              </Tooltip>
              <Tooltip title="Delete line" delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </Tooltip>
            </>
          }
        />
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-base)]">
      <div className="p-3 bg-[var(--app-bg-panel-alt)] border-b border-[var(--app-border-base)] flex flex-wrap items-center justify-between shrink-0 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSyncMode('line');
              setActiveWordIndex(0);
            }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'line' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.syncModeLine}
          </button>
          <button
            onClick={() => setSyncMode('word')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'word' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.syncModeWord}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-[var(--app-text-muted)]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--app-text-primary)] transition-colors">
            <input 
              type="checkbox" 
              checked={autoScrollEnabled} 
              onChange={(e) => setAutoScrollEnabled(e.target.checked)}
              className="accent-[var(--app-accent)]"
            />
            <span className="uppercase font-bold tracking-widest">Auto Scroll</span>
          </label>

          <div className="flex items-center gap-2 bg-[var(--app-bg-panel)] p-1.5 rounded border border-[var(--app-border-base)] shadow-sm">
             <span className="uppercase">Gap Toggled At:</span>
             <input 
               type="number"
               min="1" max="60"
               value={dualLineGapSec}
               onChange={(e) => setDualLineGapSec(Number(e.target.value) || 6)}
               className={`bg-[var(--app-border-base)] px-1 w-12 py-0.5 rounded outline-none border border-[var(--app-border-light)] text-center ${dualLineGapSec < 5.5 ? 'text-red-500' : 'text-[var(--app-accent)]'}`}
             />
             <span>sec</span>
          </div>

          <button onFocus={(e) => e.target.blur()} onClick={() => syncMode === 'line' ? handleLineStamp() : handleWordStamp()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
              <span className="uppercase">{syncMode === 'line' ? i18n.timestampWords : i18n.timestampWords}</span>
              <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.stampWord === ' ' ? 'SPACE' : hotkeys.stampWord}</kbd>
          </button>
          {syncMode === 'word' && (
            <button onFocus={(e) => e.target.blur()} onClick={() => handleWordNextLine()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
                <span className="uppercase">{i18n.nextLine}</span>
                <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.nextLine.toUpperCase()}</kbd>
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
          <thead className="bg-[var(--app-bg-panel)] sticky top-0 z-10 text-[10px] uppercase font-bold text-[var(--app-text-muted)] tracking-widest outline outline-1 outline-b-[var(--app-border-base)]">
            <tr>
              <th className="p-3 w-1/2 border-r border-[var(--app-border-base)]">Left Track</th>
              <th className="p-3 w-1/2">Right Track</th>
            </tr>
          </thead>
          <tbody>
            {uiPairs.map((pair, idx) => (
               <tr key={idx} className="border-b border-[var(--app-border-base)]/50">
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

