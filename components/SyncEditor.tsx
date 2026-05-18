'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { useSyncHotkeys } from './useSyncHotkeys';
import { formatTime } from '@/lib/lyric-utils';
import { KaraokePreview } from './KaraokePreview';
import { Tooltip } from './Tooltip';
import { Edit2, Trash2, X, ArrowRight } from 'lucide-react';

import { useAutoScroll } from './useAutoScroll';
import { useDialogs } from './DialogProvider';
import { useI18n } from '@/hooks/useI18n';
import { LyricCellContent } from './LyricCell';

export function SyncEditor() {
  const {
    lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef,
    dualLineGapSec, setDualLineGapSec,
    autoScrollEnabled, setAutoScrollEnabled, trackAssignments, paragraphStarts, shiftTimeFromIndex
  } = useEditor();
  
  const dialogs = useDialogs();
  const { handleLineStamp, handleWordStamp, handleWordNextLine } = useSyncHotkeys();
  useAutoScroll();
  const i18n = useI18n();
  
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

  const handleOffsetFromHere = async (globalIndex: number) => {
    const val = await dialogs.prompt(i18n.promptShiftTime, '0');
    if (val !== null) {
      const sec = parseFloat(val);
      if (!isNaN(sec) && sec !== 0) {
        shiftTimeFromIndex(globalIndex, sec);
      }
    }
  };

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
    <div className="flex flex-col h-full bg-[var(--app-bg-base)]">
      <div className="p-3 bg-[var(--app-bg-panel-alt)] border-b border-[var(--app-border-base)] flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSyncMode('line');
              setActiveWordIndex(0);
            }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'line' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.lineByLine}
          </button>
          <button
            onClick={() => setSyncMode('word')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${syncMode === 'word' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.wordByWord}
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
            <span className="uppercase font-bold tracking-widest">{i18n.autoScroll}</span>
          </label>

          <div className="flex items-center gap-2 bg-[var(--app-bg-panel)] p-1.5 rounded border border-[var(--app-border-base)] shadow-sm">
             <span className="uppercase">{i18n.gapToggledAt}</span>
             <input 
               type="number"
               min="1" max="60"
               value={dualLineGapSec}
               onChange={(e) => setDualLineGapSec(Number(e.target.value) || 6)}
               className={`bg-[var(--app-border-base)] px-1 w-12 py-0.5 rounded outline-none border border-[var(--app-border-light)] text-center ${dualLineGapSec < 5.5 ? 'text-red-500' : 'text-[var(--app-accent)]'}`}
             />
             <span>{i18n.sec}</span>
          </div>

          <button onFocus={(e) => e.target.blur()} onClick={() => syncMode === 'line' ? handleLineStamp() : handleWordStamp()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
              <span className="uppercase">{syncMode === 'line' ? i18n.lineTrigger : i18n.wordTrigger}</span>
              <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.stampWord === ' ' ? 'SPACE' : hotkeys.stampWord}</kbd>
          </button>
          {syncMode === 'word' && (
            <button onFocus={(e) => e.target.blur()} onClick={() => handleWordNextLine()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs">
                <span className="uppercase">{i18n.lineAdvance}</span>
                <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.nextLine.toUpperCase()}</kbd>
            </button>
          )}
        </div>
      </div>

      <KaraokePreview />

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full bg-[var(--app-bg-base)]"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--app-bg-panel)] text-[var(--app-text-muted)] border-b border-[var(--app-border-base)] z-10 text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-3 font-medium border-r border-[var(--app-border-base)]">{i18n.lyricsContentEnhanced}</th>
              <th className="p-3 font-medium w-32 text-center">{i18n.action}</th>
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
              className={`transition-colors cursor-pointer group border-b border-[var(--app-border-base)]/50 ${
                isActiveLine ? 'bg-[var(--app-border-base)] text-[var(--app-text-primary)] shadow-[inset_2px_0_0_0_var(--app-accent)]' : 
                (paragraphStarts[idx] ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 text-[var(--app-text-muted)] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)]' : 'hover:bg-[var(--app-bg-panel-alt)] text-[var(--app-text-muted)]') +
                (isPast && !isActiveLine && !paragraphStarts[idx] ? ' opacity-60' : '')
              }`}
            >
              <td className="p-0 align-top border-r border-[var(--app-border-base)]">
                 <LyricCellContent 
                   line={line}
                   globalIndex={idx}
                   isActive={isActiveLine}
                   activeWordIndex={activeWordIndex}
                   syncMode={syncMode}
                   playerRef={playerRef}
                   setActiveLineIndex={setActiveLineIndex}
                   setActiveWordIndex={setActiveWordIndex}
                 />
              </td>
              
              <td className="p-2 align-middle">
                <div className="flex items-center justify-center gap-1 opacity-70 hover:opacity-100">
                   <Tooltip title={i18n.editText} delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleEditText(idx, line.raw || ''); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                   <Tooltip title={i18n.offsetSubsequent} delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleOffsetFromHere(idx); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><ArrowRight className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                   <Tooltip title={i18n.clearTimestamps} delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleClearTime(idx); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
                   </Tooltip>
                   <Tooltip title={i18n.deleteLine} delay={1000}>
                     <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(idx); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
