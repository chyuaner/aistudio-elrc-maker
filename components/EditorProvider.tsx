'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useReducer } from 'react';
import { LyricLine, LyricWord, parseRawLyrics, splitWordsAegisub } from '@/lib/lyric-utils';

interface Hotkeys {
  stampWord: string;
  nextLine: string;
}

export type EditorMode = 'text' | 'sync' | 'dual-sync' | 'raw';
export type SyncMode = 'line' | 'word';
export type ExportFormat = 'standard' | 'enhanced';

export interface HistoryState {
  past: { lines: LyricLine[]; action: string; cursor: { line: number, word: number } }[];
  present: LyricLine[];
  future: { lines: LyricLine[]; action: string; cursor: { line: number, word: number } }[];
}

type Action = 
  | { type: 'SET'; payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[]) }
  | { type: 'RESET'; payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[]) }
  | { type: 'COMMIT'; payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[]); actionName?: string; cursor?: { line: number, word: number } }
  | { type: 'UNDO'; payload?: number }
  | { type: 'REDO'; payload?: number };

function historyReducer(state: HistoryState, action: Action & { currentCursor: { line: number, word: number } }): HistoryState {
  switch (action.type) {
    case 'SET': {
      const newPresent = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      return { ...state, present: newPresent };
    }
    case 'RESET': {
      const newPresent = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      return { present: newPresent, past: [], future: [] };
    }
    case 'COMMIT': {
      const newPresent = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      return {
        past: [...state.past, { lines: state.present, action: action.actionName || 'Update', cursor: action.currentCursor }],
        present: newPresent,
        future: [],
      };
    }
    case 'UNDO': {
      const steps = action.payload || 1;
      if (state.past.length === 0) return state;
      const actualSteps = Math.min(steps, state.past.length);
      const newPast = state.past.slice(0, state.past.length - actualSteps);
      const newPresentObj = state.past[state.past.length - actualSteps];
      
      const undoneStates = state.past.slice(state.past.length - actualSteps + 1);
      const futureItems = [
        ...undoneStates,
        { lines: state.present, action: newPresentObj.action, cursor: action.currentCursor },
        ...state.future
      ];
      
      return { past: newPast, present: newPresentObj.lines, future: futureItems };
    }
    case 'REDO': {
      const steps = action.payload || 1;
      if (state.future.length === 0) return state;
      const actualSteps = Math.min(steps, state.future.length);
      const newPresentObj = state.future[actualSteps - 1];
      
      const redoneStates = state.future.slice(0, actualSteps - 1);
      const pastItems = [
        ...state.past,
        { lines: state.present, action: state.future[0]?.action || 'Update', cursor: action.currentCursor },
        ...redoneStates
      ];
      
      const newFuture = state.future.slice(actualSteps);
      return { past: pastItems, present: newPresentObj.lines, future: newFuture };
    }
    default:
      return state;
  }
}

export interface FileMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  comment?: string;
  track?: string;
  lyric?: string;
  format?: string;
  picture?: any;
  rawTags?: Record<string, any>;
}

interface EditorContextType {
  file: File | null;
  fileUrl: string | null;
  audioFileName: string | null;
  lyricFileName: string | null;
  setLyricFileName: (name: string | null) => void;
  setFile: (file: File | null) => void;
  metadata: FileMetadata | null;
  setMetadata: (meta: FileMetadata | null) => void;

  trackAssignments: number[];
  paragraphStarts: boolean[];
  autoScrollEnabled: boolean;
  setAutoScrollEnabled: (enabled: boolean) => void;

  
  lines: LyricLine[];
  setLines: (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])) => void;
  resetHistory: (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])) => void;
  commitLines: (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[]), actionName?: string) => void;
  undo: (steps?: number) => void;
  redo: (steps?: number) => void;
  shiftTime: (offsetSec: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  pastActions: { action: string }[];
  futureActions: { action: string }[];
  
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  dualLineGapSec: number;
  setDualLineGapSec: (sec: number) => void;
  
  syncMode: SyncMode;
  setSyncMode: (mode: SyncMode) => void;
  
  activeLineIndex: number;
  setActiveLineIndex: (idx: number) => void;
  activeWordIndex: number;
  setActiveWordIndex: (idx: number) => void;
  
  hotkeys: Hotkeys;
  setHotkeys: (hk: Hotkeys) => void;
  
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  
  duration: number;
  setDuration: (time: number) => void;
  
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  playerRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  
  handleFormatWords: () => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [lyricFileName, setLyricFileName] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('standard');
  const [dualLineGapSec, setDualLineGapSec] = useState<number>(6);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [mode, setMode] = useState<EditorMode>('sync');
  const [syncMode, setSyncMode] = useState<SyncMode>('line');
  
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  
  const [hotkeys, setHotkeys] = useState<Hotkeys>({
    stampWord: ' ',
    nextLine: 'm',
  });
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const [historyState, dispatchLinesRaw] = useReducer(historyReducer, {
    past: [],
    present: [],
    future: []
  });

  const dispatchLines = (action: Action) => {
    dispatchLinesRaw({ ...action, currentCursor: { line: activeLineIndex, word: activeWordIndex } } as any);
    if (action.type === 'UNDO') {
      const steps = action.payload || 1;
      const actualSteps = Math.min(steps, historyState.past.length);
      const pastState = historyState.past[historyState.past.length - actualSteps];
      if (pastState?.cursor) {
        setActiveLineIndex(pastState.cursor.line);
        setActiveWordIndex(pastState.cursor.word);
      }
    } else if (action.type === 'REDO') {
      const steps = action.payload || 1;
      const actualSteps = Math.min(steps, historyState.future.length);
      const futureState = historyState.future[actualSteps - 1];
      if (futureState?.cursor) {
        setActiveLineIndex(futureState.cursor.line);
        setActiveWordIndex(futureState.cursor.word);
      }
    }
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileUrl(url);
      setAudioFileName(file.name);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
      setAudioFileName(null);
    }
  }, [file]);

  const lines = historyState.present;

  useEffect(() => {
    if (lines.length > 0 && activeLineIndex >= lines.length) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setActiveLineIndex(0);
       setActiveWordIndex(0);
    }
  }, [lines.length, activeLineIndex]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lines.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [lines]);

  const trackAssignments = React.useMemo(() => {
    const tracks: number[] = [];
    const pStarts: boolean[] = [];
    let currentTrack = 0;
    
    let firstStampedFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        tracks.push(0);
        pStarts.push(true);
        if (line.start !== null) firstStampedFound = true;
        continue;
      }

      if (line.start !== null && !firstStampedFound) {
        firstStampedFound = true;
        currentTrack = 0;
        tracks.push(0);
        pStarts.push(true);
        continue;
      }

      const prevLine = lines[i-1];
      let prevEnd = prevLine.end;
      if (prevEnd === null && prevLine.words?.length > 0) {
          const lastWordWithStart = [...prevLine.words].reverse().find(w => w.start !== null);
          if (lastWordWithStart) prevEnd = lastWordWithStart.start; 
      }
      if (prevEnd === null) prevEnd = prevLine.start;

      let gapSec = -1;
      if (prevEnd !== null && line.start !== null) {
          gapSec = line.start - prevEnd;
      }

      if (gapSec >= dualLineGapSec) {
          currentTrack = 0;
          pStarts.push(true);
      } else {
          currentTrack = currentTrack === 0 ? 1 : 0;
          pStarts.push(false);
      }
      tracks.push(currentTrack);
    }
    return { tracks, pStarts };
  }, [lines, dualLineGapSec]);

  const setLines = (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])) => {
    dispatchLines({ type: 'SET', payload });
  };
  const resetHistory = (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])) => {
    dispatchLines({ type: 'RESET', payload });
    setActiveLineIndex(0);
    setActiveWordIndex(0);
  };
  const commitLines = (payload: LyricLine[] | ((prev: LyricLine[]) => LyricLine[]), actionName?: string) => {
    dispatchLines({ type: 'COMMIT', payload, actionName });
  };
  const undo = (steps = 1) => dispatchLines({ type: 'UNDO', payload: steps });
  const redo = (steps = 1) => dispatchLines({ type: 'REDO', payload: steps });

  const shiftTime = (offsetSec: number) => {
     commitLines(prev => prev.map(line => {
       const start = line.start !== null ? Math.max(0, line.start + offsetSec) : null;
       const end = line.end !== null ? Math.max(0, line.end + offsetSec) : null;
       const words = line.words.map(w => ({
         ...w,
         start: w.start !== null ? Math.max(0, w.start + offsetSec) : null,
         end: w.end !== null ? Math.max(0, w.end + offsetSec) : null,
       }));
       return { ...line, start, end, words };
     }), `Shift Time ${offsetSec > 0 ? '+' : ''}${offsetSec}s`);
  };

  const handleFormatWords = () => {
    commitLines(prev => prev.map(line => ({
      ...line,
      words: splitWordsAegisub(line.words.map(w => w.text).join(''))
    })), 'Format Words');
  };

  return (
    <EditorContext.Provider value={{
      file, setFile, fileUrl, audioFileName, lyricFileName, setLyricFileName, metadata, setMetadata,
      lines, setLines, resetHistory, commitLines, undo, redo, shiftTime, trackAssignments: trackAssignments.tracks, paragraphStarts: trackAssignments.pStarts, autoScrollEnabled, setAutoScrollEnabled,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      pastCount: historyState.past.length,
      futureCount: historyState.future.length,
      pastActions: historyState.past,
      futureActions: historyState.future,
      mode, setMode, syncMode, setSyncMode, exportFormat, setExportFormat, dualLineGapSec, setDualLineGapSec,
      activeLineIndex, setActiveLineIndex,
      activeWordIndex, setActiveWordIndex,
      hotkeys, setHotkeys,
      currentTime, setCurrentTime,
      duration, setDuration,
      isPlaying, setIsPlaying,
      playerRef,
      handleFormatWords,
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
