import React, { useEffect, useRef, memo, useCallback, useState } from 'react';
import { useEditor } from './EditorProvider';
import { useSyncHotkeys } from './useSyncHotkeys';
import { formatTime } from '@/lib/lyric-utils';
import { KaraokePreview } from './KaraokePreview';
import { Tooltip } from './Tooltip';
import { Edit2, Trash2, X, ArrowRight, MoreVertical, ArrowUpFromLine, Copy, Play, SplitSquareVertical, Clock, Scissors, Type, Plus, FileText, Eraser, SlidersHorizontal, Settings2 } from 'lucide-react';

import { useAutoScroll } from './useAutoScroll';
import { useDialogs } from './DialogProvider';
import { useI18n } from '@/hooks/useI18n';
import { LyricCellContent } from './LyricCell';

const SyncCell = memo(({ 
  data, isDual, isActive, isPassed, activeWordIndex, syncMode, paragraphStart, playerRef, i18n, 
  setActiveLineIndex, setActiveWordIndex, handleEditText, handleOffsetFromHere, handleClearTime, handleDeleteLine,
  onMergeToPrevious, onLineContextMenu, onWordContextMenu, onTimeContextMenu, openMoreMenu
}: any) => {
  if (!data) {
    return (
      <td className={`p-3 border-r border-[var(--app-border-base)] align-top bg-[var(--app-bg-input)]/30 text-center ${isDual ? 'w-1/2' : 'w-full'}`}>
        <span className="opacity-20 font-mono text-[10px] tracking-widest uppercase">Instrumental Break</span>
      </td>
    );
  }
  
  const { line, index: globalIndex } = data;

  return (
    <td 
      data-line-index={globalIndex}
      onClick={() => {
        setActiveLineIndex(globalIndex);
        setActiveWordIndex(0);
        const { current: player } = playerRef;
        if (player instanceof HTMLMediaElement && line.start !== null) {
            player.currentTime = line.start;
        }
      }}
      className={`p-0 align-top group cursor-pointer border-r border-[var(--app-border-base)] transition-colors relative ${isDual ? 'w-1/2' : 'w-full'}
        ${isActive ? 'bg-[var(--app-border-base)] text-[var(--app-text-primary)] shadow-[inset_2px_0_0_0_var(--app-accent)]' : 
          (paragraphStart ? 'bg-[#293B33]/40 hover:bg-[#293B33]/60 text-[var(--app-text-muted)] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)]' : 'hover:bg-[var(--app-bg-panel-alt)] text-[var(--app-text-muted)]')}
        ${(!isActive && isPassed && !paragraphStart) ? ' opacity-60' : ''}`}
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
        onLineContextMenu={onLineContextMenu}
        onWordContextMenu={onWordContextMenu}
        onTimeContextMenu={onTimeContextMenu}
        actions={
          <>
            <Tooltip title="編輯這行字RAW" delay={500}>
              <button onClick={(e) => { e.stopPropagation(); handleEditText(globalIndex); }} className={`p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors ${isDual ? 'hidden 2xl:block' : 'hidden xl:block'}`}><Edit2 className="w-3.5 h-3.5" /></button>
            </Tooltip>
            {globalIndex > 0 && (
              <Tooltip title="合併到上一行" delay={500}>
                <button onClick={(e) => { e.stopPropagation(); onMergeToPrevious(globalIndex); }} className={`p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors ${isDual ? 'hidden 2xl:block' : 'hidden xl:block'}`}><ArrowUpFromLine className="w-3.5 h-3.5" /></button>
              </Tooltip>
            )}
            <Tooltip title={i18n.clearTimestamps} delay={500}>
              <button onClick={(e) => { e.stopPropagation(); handleClearTime(globalIndex); }} className={`p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-bg-hover)] rounded transition-colors ${isDual ? 'hidden 2xl:block' : 'hidden xl:block'}`}><X className="w-3.5 h-3.5" /></button>
            </Tooltip>
            <Tooltip title={i18n.deleteLine} delay={500}>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteLine(globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </Tooltip>
            <Tooltip title="其他選項" delay={500}>
              <button onClick={(e) => { e.stopPropagation(); openMoreMenu(e, globalIndex); }} className="p-1 px-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"><MoreVertical className="w-3.5 h-3.5" /></button>
            </Tooltip>
          </>
        }
      />
    </td>
  );
});
SyncCell.displayName = 'SyncCell';

const getLineRawText = (line: any) => {
    let result = '';
    if (line?.start !== null) {
        result += `[${formatTime(line.start, true)}]`;
    }
    if (line?.words) {
        result += line.words.map((w: any) => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
    }
    return result;
};

const getLineText = (line: any) => {
    if (!line?.words) return '';
    return line.words.map((w: any) => w.text).join('');
};

export function SyncEditor() {
  const {
    mode, lines, activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    syncMode, setSyncMode, setMode, hotkeys, commitLines, playerRef,
    dualLineGapSec, setDualLineGapSec,
    autoScrollEnabled, setAutoScrollEnabled, trackAssignments, paragraphStarts, shiftTimeFromIndex,
    shiftTime, touchUIMode
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

  const [ctxMenu, setCtxMenu] = React.useState<{
    x: number; y: number; type: 'line' | 'word' | 'time'; globalIndex: number; wordIndex?: number;
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setCtxMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const [editingText, setEditingText] = useState<{ globalIndex: number, text: string, type: 'raw' | 'text' } | null>(null);

  const handleEditRawText = useCallback((globalIndex: number) => {
    const defaultRaw = getLineRawText(lines[globalIndex]);
    setEditingText({ globalIndex, text: defaultRaw, type: 'raw' });
  }, [lines]);

  const handleEditTextOnly = useCallback((globalIndex: number) => {
     const textOnly = getLineText(lines[globalIndex]);
     setEditingText({ globalIndex, text: textOnly, type: 'text' });
  }, [lines]);

  const handleOffsetFromHere = useCallback(async (globalIndex: number) => {
    const val = await dialogs.prompt(i18n.promptShiftTime, '0');
    if (val !== null) {
      const sec = parseFloat(val);
      if (!isNaN(sec) && sec !== 0) {
        shiftTimeFromIndex(globalIndex, sec);
      }
    }
  }, [dialogs, i18n, shiftTimeFromIndex]);

  const handleClearTime = useCallback((globalIndex: number) => {
    commitLines(prev => {
      const newLines = [...prev];
      newLines[globalIndex] = { ...newLines[globalIndex], start: null };
      if (newLines[globalIndex].words) {
          newLines[globalIndex].words = newLines[globalIndex].words.map((w: any) => ({...w, start: null, end: null}));
      }
      return newLines;
    }, 'Reset Time');
  }, [commitLines]);

  const handleDeleteLine = useCallback((globalIndex: number) => {
    commitLines(prev => prev.filter((_, i) => i !== globalIndex), 'Delete Line');
  }, [commitLines]);

  const handleMergeToPrevious = useCallback((globalIndex: number) => {
      if (globalIndex === 0) return;
      commitLines(prev => {
          const newLines = [...prev];
          const curr = newLines[globalIndex];
          const prevLine = newLines[globalIndex - 1];
          const newWords = [...prevLine.words];
          
          if (newWords.length > 0 && !newWords[newWords.length - 1].text.match(/\s$/)) {
              newWords.push({ text: ' ', start: null, end: null });
          }
          newWords.push(...curr.words);
          
          const { formatTime } = require('@/lib/lyric-utils');
          const newRaw = newWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
          
          newLines[globalIndex - 1] = { ...prevLine, raw: newRaw, words: newWords };
          newLines.splice(globalIndex, 1);
          return newLines;
      }, 'Merge to Previous Line');
  }, [commitLines]);

  const handleEditTimeOnly = useCallback(async (globalIndex: number) => {
      const line = lines[globalIndex];
      const val = await dialogs.prompt('Edit timestamp (ss.xx or mm:ss.xx):', line.start !== null ? formatTime(line.start, true) : '');
      if (val !== null) {
         const { parseSeconds } = require('@/lib/lyric-utils');
         const num = parseSeconds(val);
         if (!isNaN(num)) {
            commitLines(prev => {
               const newLines = [...prev];
               newLines[globalIndex] = { ...newLines[globalIndex], start: num };
               return newLines;
            }, 'Edit Time');
         }
      }
  }, [lines, dialogs, commitLines]);

  const handleJumpTo = useCallback((globalIndex: number, wordIndex?: number) => {
      const line = lines[globalIndex];
      if (!line) return;
      const { current: player } = playerRef;
      if (player instanceof HTMLMediaElement) {
          let t = line.start;
          if (wordIndex !== undefined && line.words[wordIndex]?.start !== null) {
               t = line.words[wordIndex].start;
          }
          if (t !== null) player.currentTime = t;
      }
  }, [lines, playerRef]);

  const handleSplitWordToNextLine = useCallback((globalIndex: number, wordIndex: number) => {
      commitLines(prev => {
          const newLines = [...prev];
          const line = newLines[globalIndex];
          const words = line.words;
          const lineHasEndStamp = words.length > 0 && words[words.length - 1].text === '' && words[words.length - 1].start !== null;

          const leftWords = words.slice(0, wordIndex);
          const rightWords = words.slice(wordIndex);
          const rightStart = rightWords[0]?.start || null;

          if (lineHasEndStamp) {
              if (leftWords.length === 0 || leftWords[leftWords.length - 1].text !== '') {
                  leftWords.push({ text: '', start: rightStart, end: null });
              }
          }

          const leftRaw = leftWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
          const leftStart = leftWords.find(w => w.start !== null)?.start || line.start;
          const rightRaw = rightWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
          
          const { generateId } = require('@/lib/lyric-utils');
  
          newLines[globalIndex] = { ...line, words: leftWords, raw: leftRaw, start: leftStart };
          newLines.splice(globalIndex + 1, 0, {
              id: generateId(),
              start: rightStart,
              end: null,
              words: rightWords,
              raw: rightRaw
          });
          return newLines;
      }, 'Split Line');
  }, [commitLines]);

  const handleDeleteWord = useCallback((globalIndex: number, wordIndex: number) => {
      commitLines(prev => {
          const newLines = [...prev];
          const line = newLines[globalIndex];
          const newWords = [...line.words];
          newWords.splice(wordIndex, 1);
          const newRaw = newWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
          newLines[globalIndex] = { ...line, words: newWords, raw: newRaw };
          return newLines;
      }, 'Delete Word');
  }, [commitLines]);

  const handleInsertLineBefore = useCallback((globalIndex: number) => {
      commitLines(prev => {
          const newLines = [...prev];
          const { generateId } = require('@/lib/lyric-utils');
          newLines.splice(globalIndex, 0, { id: generateId(), start: null, end: null, words: [], raw: '' });
          return newLines;
      }, 'Insert Line Before');
  }, [commitLines]);

  const handleInsertLineAfter = useCallback((globalIndex: number) => {
      commitLines(prev => {
          const newLines = [...prev];
          const { generateId } = require('@/lib/lyric-utils');
          newLines.splice(globalIndex + 1, 0, { id: generateId(), start: null, end: null, words: [], raw: '' });
          return newLines;
      }, 'Insert Line After');
  }, [commitLines]);

  const handleEditWordRaw = useCallback(async (globalIndex: number, wordIndex: number) => {
      const line = lines[globalIndex];
      const word = line.words[wordIndex];
      const currentText = word.start !== null ? `<${formatTime(word.start, true)}>${word.text}` : word.text;
      const val = await dialogs.prompt('Edit word RAW:', currentText);
      if (val !== null && val !== currentText) {
          commitLines(prev => {
              const newLines = [...prev];
              const newWords = [...newLines[globalIndex].words];
              const { parseRawLyrics } = require('@/lib/lyric-utils');
              const parsedWordLine = parseRawLyrics(val).lines[0];
              const resultWords = parsedWordLine ? parsedWordLine.words : [{text: val, start: null, end: null}];
              newWords.splice(wordIndex, 1, ...resultWords);
              const newRaw = newWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
              newLines[globalIndex] = { ...newLines[globalIndex], words: newWords, raw: newRaw };
              return newLines;
          }, 'Edit Word RAW');
      }
  }, [lines, dialogs, commitLines]);

  const handleEditWordText = useCallback(async (globalIndex: number, wordIndex: number) => {
      const line = lines[globalIndex];
      const word = line.words[wordIndex];
      const val = await dialogs.prompt('Edit word text:', word.text);
      if (val !== null && val !== word.text) {
          commitLines(prev => {
              const newLines = [...prev];
              const newWords = [...newLines[globalIndex].words];
              newWords[wordIndex] = { ...newWords[wordIndex], text: val };
              const newRaw = newWords.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
              newLines[globalIndex] = { ...newLines[globalIndex], words: newWords, raw: newRaw };
              return newLines;
          }, 'Edit Word');
      }
  }, [lines, dialogs, commitLines]);

  const renderCellWrapper = (data: { line: any, index: number } | null, isDual: boolean) => {
    return (
      <SyncCell 
        key={data ? data.index : 'empty'}
        data={data}
        isDual={isDual}
        isActive={data ? data.index === activeLineIndex : false}
        isPassed={data ? data.index < activeLineIndex : false}
        activeWordIndex={data?.index === activeLineIndex ? activeWordIndex : 0}
        syncMode={syncMode}
        paragraphStart={data ? paragraphStarts[data.index] : false}
        playerRef={playerRef}
        i18n={i18n}
        setActiveLineIndex={setActiveLineIndex}
        setActiveWordIndex={setActiveWordIndex}
        handleEditText={handleEditRawText}
        handleOffsetFromHere={handleOffsetFromHere}
        handleClearTime={handleClearTime}
        handleDeleteLine={handleDeleteLine}
        onMergeToPrevious={handleMergeToPrevious}
        onLineContextMenu={(e: React.MouseEvent, globalIndex: number) => {
            if (touchUIMode) return;
            e.preventDefault();
            setActiveLineIndex(globalIndex);
            setActiveWordIndex(0);
            const { current: player } = playerRef;
            if (player instanceof HTMLMediaElement && lines[globalIndex]?.start !== null) {
                if (player.paused) {
                    player.currentTime = lines[globalIndex].start!;
                }
            }
            setCtxMenu({ type: 'line', x: e.clientX, y: e.clientY, globalIndex });
        }}
        onWordContextMenu={(e: React.MouseEvent, globalIndex: number, wordIndex: number) => {
            if (touchUIMode) return;
            e.preventDefault();
            setActiveLineIndex(globalIndex);
            setActiveWordIndex(wordIndex);
            const { current: player } = playerRef;
            if (player instanceof HTMLMediaElement && lines[globalIndex]?.words[wordIndex]?.start !== null) {
                if (player.paused) {
                    player.currentTime = lines[globalIndex].words[wordIndex].start!;
                }
            }
            setCtxMenu({ type: 'word', x: e.clientX, y: e.clientY, globalIndex, wordIndex });
        }}
        onTimeContextMenu={(e: React.MouseEvent, globalIndex: number) => {
            if (touchUIMode) return;
            e.preventDefault();
            setActiveLineIndex(globalIndex);
            setActiveWordIndex(0);
            const { current: player } = playerRef;
            if (player instanceof HTMLMediaElement && lines[globalIndex]?.start !== null) {
                if (player.paused) {
                    player.currentTime = lines[globalIndex].start!;
                }
            }
            setCtxMenu({ type: 'time', x: e.clientX, y: e.clientY, globalIndex });
        }}
        openMoreMenu={(e: React.MouseEvent, globalIndex: number) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setActiveLineIndex(globalIndex);
            setActiveWordIndex(0);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = Math.min(rect.left, window.innerWidth - 250);
            const y = Math.min(rect.bottom, window.innerHeight - 300);
            setTimeout(() => {
                setCtxMenu({ type: 'line', x, y, globalIndex });
            }, 0);
        }}
      />
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

  const handleLineConvertToTraditional = async (globalIndex: number) => {
    const { convertToTraditional } = await import('@/lib/chinese-conv');
    commitLines(prev => {
      const newLines = [...prev];
      newLines[globalIndex] = {
        ...newLines[globalIndex],
        words: newLines[globalIndex].words.map(w => ({ ...w, text: convertToTraditional(w.text) }))
      };
      newLines[globalIndex].raw = newLines[globalIndex].words.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
      return newLines;
    }, '這行字轉繁體');
  };

  const handleLineConvertToSimplified = async (globalIndex: number) => {
    const { convertToSimplified } = await import('@/lib/chinese-conv');
    commitLines(prev => {
      const newLines = [...prev];
      newLines[globalIndex] = {
        ...newLines[globalIndex],
        words: newLines[globalIndex].words.map(w => ({ ...w, text: convertToSimplified(w.text) }))
      };
      newLines[globalIndex].raw = newLines[globalIndex].words.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
      return newLines;
    }, '這行字轉簡體');
  };

  const handleWordConvertToTraditional = async (globalIndex: number, wordIndex: number) => {
    const { convertToTraditional } = await import('@/lib/chinese-conv');
    commitLines(prev => {
      const newLines = [...prev];
      const newWords = [...newLines[globalIndex].words];
      newWords[wordIndex] = { ...newWords[wordIndex], text: convertToTraditional(newWords[wordIndex].text) };
      newLines[globalIndex] = { ...newLines[globalIndex], words: newWords };
      newLines[globalIndex].raw = newLines[globalIndex].words.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
      return newLines;
    }, '這段字轉繁體');
  };

  const handleWordConvertToSimplified = async (globalIndex: number, wordIndex: number) => {
    const { convertToSimplified } = await import('@/lib/chinese-conv');
    commitLines(prev => {
      const newLines = [...prev];
      const newWords = [...newLines[globalIndex].words];
      newWords[wordIndex] = { ...newWords[wordIndex], text: convertToSimplified(newWords[wordIndex].text) };
      newLines[globalIndex] = { ...newLines[globalIndex], words: newWords };
      newLines[globalIndex].raw = newLines[globalIndex].words.map(w => w.start !== null ? `<${formatTime(w.start, true)}>${w.text}` : w.text).join('');
      return newLines;
    }, '這段字轉簡體');
  };

  return (
    <div className="contents lg:flex lg:flex-col lg:h-full lg:bg-[var(--app-bg-base)]">
      <div className="p-3 bg-[var(--app-bg-panel-alt)] flex flex-wrap items-center justify-between shrink-0 gap-2 lg:static z-40">
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
          <Tooltip title={<span className="text-xs font-mono">移除所有時間戳</span>}>
            <button
              onClick={async () => {
                const confirmed = await dialogs.confirm('確定要移除所有時間戳嗎？');
                if (confirmed) {
                    const newLines = lines.map(line => ({
                        ...line,
                        start: null,
                        words: line.words.map(w => ({ ...w, start: null, end: null }))
                    }));
                    commitLines(newLines, '移除所有時間戳');
                }
              }}
              className="px-3 py-1.5 bg-[var(--app-bg-panel)] hover:bg-[var(--app-bg-hover)] hover:text-red-400 rounded shadow-sm border border-[var(--app-border-light)] flex items-center text-[var(--app-text-secondary)] transition-colors h-[30px]"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </Tooltip>
          
          <div className="flex items-center shadow-sm rounded border border-[var(--app-border-light)] h-[30px] overflow-hidden bg-[var(--app-bg-panel)]">
            <Tooltip title={<span className="text-xs font-mono">將所有時間提前 0.1 秒</span>}>
              <button
                onClick={() => shiftTime(-0.1)}
                className="px-2 h-full hover:bg-[var(--app-bg-hover)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors border-r border-[var(--app-border-light)] font-mono text-xs"
              >
                -0.1s
              </button>
            </Tooltip>
            <Tooltip title={<span className="text-xs font-mono">整份歌詞時間平移 (輸入數值)</span>}>
              <button
                onClick={async () => {
                  const val = await dialogs.prompt(i18n.promptShiftTime, '0');
                  if (val && !isNaN(parseFloat(val))) {
                     shiftTime(parseFloat(val));
                  }
                }}
                className="px-3 h-full hover:bg-[var(--app-bg-hover)] flex items-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip title={<span className="text-xs font-mono">將所有時間延後 0.1 秒</span>}>
              <button
                onClick={() => shiftTime(0.1)}
                className="px-2 h-full hover:bg-[var(--app-bg-hover)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors border-l border-[var(--app-border-light)] font-mono text-xs"
              >
                +0.1s
              </button>
            </Tooltip>
          </div>

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

          <button onFocus={(e) => e.target.blur()} onClick={() => syncMode === 'line' ? handleLineStamp() : handleWordStamp()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs h-[30px]">
              <span className="uppercase">{i18n.timestampWords}</span>
              <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.stampWord === ' ' ? 'SPACE' : hotkeys.stampWord}</kbd>
          </button>
          
          {syncMode === 'word' && (
            <button onFocus={(e) => e.target.blur()} onClick={() => handleWordNextLine()} className="bg-[var(--app-bg-panel)] hover:bg-[var(--app-border-base)] transition-colors p-1.5 rounded border border-[var(--app-border-base)] flex items-center gap-2 shadow-sm cursor-pointer select-none text-xs h-[30px]">
                <span className="uppercase">{i18n.nextLine}</span>
                <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded font-mono border border-[var(--app-border-light)]">{hotkeys.nextLine.toUpperCase()}</kbd>
            </button>
          )}
        </div>
      </div>

      <KaraokePreview />

      <div 
        ref={containerRef}
        id="sync-editor-scroll-container"
        className="flex-1 lg:overflow-y-auto w-full custom-scrollbar"
      >
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead className="lg:sticky lg:top-0 bg-[var(--app-bg-panel)] text-[var(--app-text-muted)] z-10 text-[10px] uppercase tracking-widest font-bold outline outline-1 outline-b-[var(--app-border-base)]">
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
                {renderCellWrapper(row.left, isDual)}
                {isDual && renderCellWrapper(row.right || null, true)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ctxMenu && (
        <div 
          className="fixed z-[9999] bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] shadow-lg rounded-md min-w-[200px] text-xs font-sans max-h-[85vh] overflow-y-auto py-1"
          ref={(el) => {
              if (el && ctxMenu) {
                  const rect = el.getBoundingClientRect();
                  if (ctxMenu.y + rect.height > window.innerHeight) {
                      el.style.top = 'auto';
                      el.style.bottom = '10px';
                  } else {
                      el.style.top = `${ctxMenu.y}px`;
                      el.style.bottom = 'auto';
                  }
                  if (ctxMenu.x + rect.width > window.innerWidth) {
                      el.style.left = 'auto';
                      el.style.right = '10px';
                  } else {
                      el.style.left = `${ctxMenu.x}px`;
                      el.style.right = 'auto';
                  }
              }
          }}
          style={{ visibility: 'visible' }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.type === 'line' && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleJumpTo(ctxMenu.globalIndex); setCtxMenu(null); }}><Play className="w-3.5 h-3.5" /> 歌曲跳轉至該行開頭</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(getLineText(lines[ctxMenu.globalIndex])); setCtxMenu(null); }}><Copy className="w-3.5 h-3.5" /> 複製這行字</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(lines[ctxMenu.globalIndex]?.start !== null ? formatTime(lines[ctxMenu.globalIndex].start!) : ''); setCtxMenu(null); }}><Clock className="w-3.5 h-3.5" /> 複製時間戳</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(getLineRawText(lines[ctxMenu.globalIndex])); setCtxMenu(null); }}><Copy className="w-3.5 h-3.5 opacity-70" /> 複製這行字RAW（含時間戳）</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleEditTextOnly(ctxMenu.globalIndex); setCtxMenu(null); }}><Type className="w-3.5 h-3.5" /> 編輯這行字</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleEditRawText(ctxMenu.globalIndex); setCtxMenu(null); }}><Edit2 className="w-3.5 h-3.5" /> 編輯這行字RAW（含時間戳）</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleLineConvertToTraditional(ctxMenu.globalIndex); setCtxMenu(null); }}><span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">繁</span>這行字轉繁體</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleLineConvertToSimplified(ctxMenu.globalIndex); setCtxMenu(null); }}><span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">簡</span>這行字轉簡體</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { 
                const targetIndex = ctxMenu.globalIndex;
                setCtxMenu(null);
                setMode('text');
                setTimeout(() => window.dispatchEvent(new CustomEvent('focus-raw-text-line', { detail: { lineIndex: targetIndex } })), 50);
              }}><FileText className="w-3.5 h-3.5" /> 到編輯原始文字</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleInsertLineBefore(ctxMenu.globalIndex); setCtxMenu(null); }}><Plus className="w-3.5 h-3.5" /> 插入上一行</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleInsertLineAfter(ctxMenu.globalIndex); setCtxMenu(null); }}><Plus className="w-3.5 h-3.5" /> 插入下一行</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleMergeToPrevious(ctxMenu.globalIndex); setCtxMenu(null); }}><ArrowUpFromLine className="w-3.5 h-3.5" /> 合併到上一行</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleOffsetFromHere(ctxMenu.globalIndex); setCtxMenu(null); }}><ArrowRight className="w-3.5 h-3.5" /> 平移後續時間</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors text-red-400 flex items-center gap-2" onClick={() => { handleClearTime(ctxMenu.globalIndex); setCtxMenu(null); }}><X className="w-3.5 h-3.5" /> 清除時間戳</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors text-red-500 flex items-center gap-2" onClick={() => { handleDeleteLine(ctxMenu.globalIndex); setCtxMenu(null); }}><Trash2 className="w-3.5 h-3.5" /> 刪除行</button>
              <div className="px-3 py-2 flex flex-col gap-0.5 border-t border-[var(--app-border-base)]/50 mb-1">
                 <div className="flex items-center justify-between gap-4">
                     <span className="text-[10px] text-[var(--app-text-muted)] font-bold uppercase tracking-widest">目前選擇的行</span>
                     <span className="text-[11px] font-mono text-[var(--app-text-muted)] opacity-60">
                         {lines[ctxMenu.globalIndex]?.start !== null ? formatTime(lines[ctxMenu.globalIndex].start!) : '--:--.--'}
                     </span>
                 </div>
                 <span className="text-sm font-bold text-[var(--app-text-primary)] truncate max-w-[200px]">{getLineText(lines[ctxMenu.globalIndex]) || '(空白行)'}</span>
              </div>
            </>
          )}

          {ctxMenu.type === 'word' && ctxMenu.wordIndex !== undefined && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleJumpTo(ctxMenu.globalIndex, ctxMenu.wordIndex); setCtxMenu(null); }}><Play className="w-3.5 h-3.5" /> 歌曲跳轉至該字</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(lines[ctxMenu.globalIndex].words[ctxMenu.wordIndex!].text); setCtxMenu(null); }}><Copy className="w-3.5 h-3.5" /> 複製這字</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { const word = lines[ctxMenu.globalIndex].words[ctxMenu.wordIndex!]; navigator.clipboard.writeText(word.start !== null ? formatTime(word.start, true) : ''); setCtxMenu(null); }}><Clock className="w-3.5 h-3.5" /> 複製字的時間戳</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { const word = lines[ctxMenu.globalIndex].words[ctxMenu.wordIndex!]; navigator.clipboard.writeText(word.start !== null ? `<${formatTime(word.start, true)}>${word.text}` : word.text); setCtxMenu(null); }}><Copy className="w-3.5 h-3.5 opacity-70" /> 複製這字RAW（含時間戳）</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleEditWordText(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><Type className="w-3.5 h-3.5" /> 編輯這段字</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleEditWordRaw(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><Edit2 className="w-3.5 h-3.5" /> 編輯這段字RAW（含時間戳）</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleWordConvertToTraditional(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">繁</span>這段字轉繁體</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleWordConvertToSimplified(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">簡</span>這段字轉簡體</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleSplitWordToNextLine(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><SplitSquareVertical className="w-3.5 h-3.5" /> 從該字分割斷行到下一行</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleOffsetFromHere(ctxMenu.globalIndex); setCtxMenu(null); }}><ArrowRight className="w-3.5 h-3.5" /> 平移後續時間</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors text-red-500 flex items-center gap-2" onClick={() => { handleDeleteWord(ctxMenu.globalIndex, ctxMenu.wordIndex!); setCtxMenu(null); }}><Scissors className="w-3.5 h-3.5" /> 刪除該段字</button>
              <div className="px-3 py-2 flex flex-col gap-0.5 border-t border-[var(--app-border-base)]/50 mb-1">
                 <div className="flex items-center justify-between gap-4">
                     <span className="text-[10px] text-[var(--app-text-muted)] font-bold uppercase tracking-widest">目前選擇的字</span>
                     <span className="text-[11px] font-mono text-[var(--app-text-muted)] opacity-60">
                         {lines[ctxMenu.globalIndex]?.words[ctxMenu.wordIndex!]?.start !== null ? formatTime(lines[ctxMenu.globalIndex].words[ctxMenu.wordIndex!].start!, true) : '--:--.--'}
                     </span>
                 </div>
                 <span className="text-sm font-bold text-[var(--app-text-primary)] truncate max-w-[200px]">{lines[ctxMenu.globalIndex]?.words[ctxMenu.wordIndex!]?.text || '(無)'}</span>
              </div>
            </>
          )}

          {ctxMenu.type === 'time' && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleJumpTo(ctxMenu.globalIndex); setCtxMenu(null); }}><Play className="w-3.5 h-3.5" /> 歌曲跳轉至該行開頭</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(lines[ctxMenu.globalIndex].start !== null ? formatTime(lines[ctxMenu.globalIndex].start!) : ''); setCtxMenu(null); }}><Clock className="w-3.5 h-3.5" /> 複製時間戳</button>
              <div className="h-px bg-[var(--app-border-base)] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleEditTimeOnly(ctxMenu.globalIndex); setCtxMenu(null); }}><Edit2 className="w-3.5 h-3.5" /> 編輯這行時間戳（手打輸入）</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--app-bg-hover)] transition-colors flex items-center gap-2" onClick={() => { handleOffsetFromHere(ctxMenu.globalIndex); setCtxMenu(null); }}><ArrowRight className="w-3.5 h-3.5" /> 平移後續時間</button>
              <div className="px-3 py-2 flex flex-col gap-0.5 border-t border-[var(--app-border-base)]/50 mb-1">
                 <div className="flex items-center justify-between gap-4">
                     <span className="text-[10px] text-[var(--app-text-muted)] font-bold uppercase tracking-widest">時間戳操作</span>
                     <span className="text-[11px] font-mono text-[var(--app-text-muted)] opacity-60">
                         {lines[ctxMenu.globalIndex]?.start !== null ? formatTime(lines[ctxMenu.globalIndex].start!) : '--:--.--'}
                     </span>
                 </div>
              </div>
            </>
          )}
        </div>
      )}

      {editingText && (
         <div 
           className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
           style={{
             paddingLeft: 'max(1rem, env(safe-area-inset-left))',
             paddingRight: 'max(1rem, env(safe-area-inset-right))',
             paddingTop: 'max(1rem, env(safe-area-inset-top))',
             paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
           }}
         >
            <div className="bg-[var(--app-bg-panel)] rounded-xl shadow-2xl w-full max-w-xl border border-[var(--app-border-base)] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--app-border-base)] flex items-center justify-between bg-[var(--app-bg-panel-alt)]">
                    <h3 className="font-bold text-[var(--app-text-primary)]">
                        {editingText.type === 'raw' ? '編輯這行字 RAW (含時間戳)' : '編輯這行字'}
                    </h3>
                    <button onClick={() => setEditingText(null)} className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <textarea 
                        autoFocus
                        style={{ fieldSizing: 'content' }}
                        className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded-lg p-3 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] min-h-[100px] resize-none font-mono"
                        value={editingText.text}
                        onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                    />
                    <div className="text-xs text-[var(--app-text-muted)] font-bold uppercase tracking-widest mt-2 px-1">拆字預覽</div>
                    <div className="flex flex-wrap gap-1 p-3 bg-[var(--app-bg-input)] rounded-lg border border-[var(--app-border-light)] min-h-[3rem] items-center">
                        {(() => {
                           const { parseRawLyrics, splitWordsAegisub } = require('@/lib/lyric-utils');
                           const words = editingText.type === 'raw' 
                               ? (parseRawLyrics(editingText.text).lines[0]?.words || [])
                               : splitWordsAegisub(editingText.text);
                           
                           if (words.length === 0) return <span className="opacity-50 text-xs">無內容</span>;
                           
                           return words.map((w: any, i: number) => (
                               <span key={i} className="px-2 py-0.5 bg-[var(--app-bg-panel-alt)] border border-[var(--app-border-dark)] rounded text-sm group relative">
                                   {w.text || '⏎'}
                                   {w.start !== null && <span className="absolute -top-2 -right-2 text-[8px] bg-[var(--app-accent)] text-black px-1 rounded font-bold">{formatTime(w.start, true)}</span>}
                               </span>
                           ));
                        })()}
                    </div>
                </div>
                <div className="p-4 pt-0 flex justify-end gap-2 text-sm mt-2">
                    <button onClick={() => setEditingText(null)} className="px-4 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)] rounded-lg transition-colors font-bold">
                        取消
                    </button>
                    <button 
                        onClick={() => {
                            commitLines(prev => {
                                const newLines = [...prev];
                                const currentLine = newLines[editingText.globalIndex];
                                const { parseRawLyrics, splitWordsAegisub } = require('@/lib/lyric-utils');
                                if (editingText.type === 'raw') {
                                    const parsed = parseRawLyrics(editingText.text).lines[0];
                                    newLines[editingText.globalIndex] = { ...currentLine, raw: editingText.text, words: parsed ? parsed.words : [] };
                                } else {
                                    newLines[editingText.globalIndex] = { ...currentLine, raw: editingText.text, words: splitWordsAegisub(editingText.text), start: null };
                                }
                                return newLines;
                            }, 'Edit Text');
                            setEditingText(null);
                        }}
                        className="px-6 py-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black rounded-lg transition-colors font-bold shadow"
                    >
                        儲存
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}
