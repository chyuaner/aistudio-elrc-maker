'use client';

import React, { useEffect, useCallback } from 'react';
import { useEditor } from './EditorProvider';

export function useSyncHotkeys() {
  const {
    lines, commitLines,
    syncMode,
    activeLineIndex, setActiveLineIndex,
    activeWordIndex, setActiveWordIndex,
    currentTime, playerRef,
    hotkeys, mode
  } = useEditor();

  const handleLineStamp = useCallback(() => {
    if (activeLineIndex >= lines.length) return;
    
    commitLines(prev => {
      const newLines = [...prev];
      newLines[activeLineIndex] = {
        ...newLines[activeLineIndex],
        start: currentTime
      };
      return newLines;
    }, `Stamp Line ${activeLineIndex + 1}`);
    
    setActiveLineIndex(activeLineIndex + 1);
  }, [activeLineIndex, lines.length, currentTime, commitLines, setActiveLineIndex]);

  const handleWordStamp = useCallback(() => {
    if (activeLineIndex >= lines.length) return;
    const currentLine = lines[activeLineIndex];
    if (!currentLine.words || activeWordIndex >= currentLine.words.length) {
       if (activeLineIndex < lines.length - 1) {
          setActiveLineIndex(activeLineIndex + 1);
          setActiveWordIndex(0);
       }
       return;
    }

    const wordText = currentLine.words[activeWordIndex].text || '⏎';

    commitLines(prev => {
      const newLines = [...prev];
      const newWords = [...newLines[activeLineIndex].words];
      newWords[activeWordIndex] = {
        ...newWords[activeWordIndex],
        start: currentTime
      };
      
      newLines[activeLineIndex] = {
        ...newLines[activeLineIndex],
        words: newWords,
        // Optionally stamp the line if it's the first word
        start: activeWordIndex === 0 ? currentTime : newLines[activeLineIndex].start
      };
      
      return newLines;
    }, `Stamp Word '${wordText}'`);

    if (activeWordIndex === currentLine.words.length - 1) {
      if (activeLineIndex < lines.length - 1) {
        setActiveLineIndex(activeLineIndex + 1);
        setActiveWordIndex(0);
      } else {
        setActiveWordIndex(activeWordIndex + 1);
      }
    } else {
      setActiveWordIndex(activeWordIndex + 1);
    }
  }, [activeLineIndex, activeWordIndex, lines, currentTime, commitLines, setActiveLineIndex, setActiveWordIndex]);

  const handleWordNextLine = useCallback(() => {
    if (activeLineIndex < lines.length - 1) {
      setActiveLineIndex(activeLineIndex + 1);
      setActiveWordIndex(0);
    }
  }, [activeLineIndex, lines.length, setActiveLineIndex, setActiveWordIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      if (e.key.toLowerCase() === hotkeys.stampWord.toLowerCase()) {
        e.preventDefault();
        if (syncMode === 'line') {
          handleLineStamp();
        } else {
          handleWordStamp();
        }
      } else if (e.key.toLowerCase() === hotkeys.nextLine.toLowerCase() && syncMode === 'word') {
        e.preventDefault();
        handleWordNextLine();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [syncMode, hotkeys, handleLineStamp, handleWordStamp, handleWordNextLine]);

  return { handleLineStamp, handleWordStamp, handleWordNextLine };
}
