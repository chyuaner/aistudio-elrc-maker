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
    mode, lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef,
    dualLineGapSec, setDualLineGapSec,
    autoScrollEnabled, setAutoScrollEnabled, trackAssignments, paragraphStarts, shiftTimeFromIndex,
    shiftTime
  } = useEditor();
  
  const dialogs = useDialogs();
  const { handleLineStamp, handleWordStamp, handleWordNextLine } = useSyncHotkeys();
  useAutoScroll();
  const i18n = useI18n();
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  const renderCell = (data: { line: any, index: number } | null, isDual: boolean) => {
    if (!data) {
      return (
        <td className={`p-3 border-r border-[var(--app-border-base)] align-top bg-[var(--app-bg-input)]/30 text-center ${isDual ? 'w-1/2' : 'w-full'}`}>
          <span className="opacity-20 font-mono text-[10px] tracking-widest uppercase">Instrumental Break</span>
        </td>
      );
    }
    
    const { line, index: globalIndex } = data;
    const isActive = globalIndex === activeLineIndex;

    return (
      <td 
        data-line-index={globalIndex}
        onClick={() => {
          setActiveLineIndex(globalIndex);
          setActiveWordIndex(0);
        }}
        className={`p-0 align-top group cursor-pointer border-r border-[var(--app-border-base)] transition-colors relative ${isDual ? 'w-1/2' : 'w-full'}
          ${isActive ? 'bg-[var(--app-border-base)] text-[var(--app-text-primary)] shadow-[inset_2px_0_0_0_var(--app-accent)]' : 
            (paragraphStarts[globalIndex] ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 text-[var(--app-text-muted)] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)]' : 'hover:bg-[var(--app-bg-panel-alt)] text-[var(--app-text-muted)]')}
          ${(!isActive && globalIndex < activeLineIndex && !paragraphStarts[globalIndex]) ? ' opacity-60' : ''}`}
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
              <Tooltip title={i18n.editText} delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleEditText(globalIndex, line.raw || ''); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
              </Tooltip>
              <Tooltip title={i18n.offsetSubsequent} delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleOffsetFromHere(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><ArrowRight className="w-3.5 h-3.5" /></button>
              </Tooltip>
              <Tooltip title={i18n.clearTimestamps} delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleClearTime(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
              </Tooltip>
              <Tooltip title={i18n.deleteLine} delay={1000}>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </Tooltip>
            </>
          }
        />
      </td>
    );
  };

  const isDual = mode === 'dual-sync';
  const uiRows: ({ left: { line: any, index: number } | null, right?: { line: any, index: number } | null })[] = [];
  
  if (isDual) {
    let currentPair: { left: { line: any, index: number } | null, right: { line: any, index: number } | null } = { left: null, right: null };
    const currentPairEmpty = () => currentPair.left === null && currentPair.right === null;

    lines.forEach((line, i) => {
       const track = trackAssignments[i] || 0;
       if (track === 0) {
          if (!currentPairEmpty()) uiRows.push(currentPair);
          currentPair = { left: { line, index: i }, right: null };
       } else {
          currentPair.right = { line, index: i };
          uiRows.push(currentPair);
          currentPair = { left: null, right: null };
       }
    });
    if (!currentPairEmpty()) uiRows.push(currentPair);
  } else {
    lines.forEach((line, i) => {
       uiRows.push({ left: { line, index: i } });
    });
  }

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-base)]">
      <div className="p-3 bg-[var(--app-bg-panel-alt)] border-b border-[var(--app-border-base)] flex flex-wrap items-center justify-between shrink-0 gap-2">
        <div className="flex bg-[var(--app-bg-input)] p-1 rounded-md border border-[var(--app-border-base)] shadow-inner">
          <button
            onClick={() => {
              setSyncMode('line');
              setActiveWordIndex(0);
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${syncMode === 'line' ? 'bg-[var(--app-bg-panel)] text-[var(--app-accent)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.lineByLine}
          </button>
          <button
            onClick={() => setSyncMode('word')}
             className={`px-3 py-1 text-xs font-medium rounded transition-all ${syncMode === 'word' ? 'bg-[var(--app-bg-panel)] text-[var(--app-accent)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.wordByWord}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-[var(--app-text-muted)]">
          <button
            onClick={async () => {
              const val = await dialogs.prompt(i18n.promptShiftTime, '0');
              if (val && !isNaN(parseFloat(val))) {
                 shiftTime(parseFloat(val));
              }
            }}
            className="px-3 py-1.5 bg-[var(--app-bg-panel)] hover:bg-[var(--app-bg-hover)] rounded shadow-sm uppercase font-bold tracking-widest border border-[var(--app-border-light)] flex items-center text-[var(--app-text-secondary)] transition-colors h-[26px]"
          >
            ± Offset
          </button>

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

          <button onFocus={(e) => e.target.blur()} onClick={() => syncMode === 'line' ? handleLineStamp() : handleWordStamp()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs h-[26px]">
              <span className="uppercase">{i18n.timestampWords}</span>
              <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.stampWord === ' ' ? 'SPACE' : hotkeys.stampWord}</kbd>
          </button>
          
          {syncMode === 'word' && (
            <button onFocus={(e) => e.target.blur()} onClick={() => handleWordNextLine()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs h-[26px]">
                <span className="uppercase">{i18n.nextLine}</span>
                <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.nextLine.toUpperCase()}</kbd>
            </button>
          )}
        </div>
      </div>

      <KaraokePreview />

      <div 
        ref={containerRef}
        className="flex-1 md:overflow-y-auto w-full custom-scrollbar"
      >
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead className="md:sticky md:top-0 bg-[var(--app-bg-panel)] text-[var(--app-text-muted)] z-10 text-[10px] uppercase tracking-widest font-bold outline outline-1 outline-b-[var(--app-border-base)]">
            <tr>
              {isDual ? (
                <>
                  <th className="p-3 w-1/2 border-r border-[var(--app-border-base)]">{i18n.leftTrack}</th>
                  <th className="p-3 w-1/2">{i18n.rightTrack}</th>
                </>
              ) : (
                <th className="p-3 w-full border-r border-[var(--app-border-base)]">{i18n.lyricsContentEnhanced}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262D]">
            {uiRows.map((row, idx) => (
              <tr key={idx} className="border-b border-[var(--app-border-base)]/50">
                {renderCell(row.left, isDual)}
                {isDual && renderCell(row.right || null, true)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
