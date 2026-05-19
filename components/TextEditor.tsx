'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { parseRawLyrics, exportLrc, splitWordsAegisub } from '@/lib/lyric-utils';
import { ChevronDown } from 'lucide-react';
import { LineNumberedTextarea } from './LineNumberedTextarea';

export function TextEditor() {
  const { lines, setLines, commitLines, exportFormat, setActiveLineIndex, setActiveWordIndex, lrcMetadata, setLrcMetadata } = useEditor();
  const [text, setText] = useState('');
  const [viewMode, setViewMode] = useState<'raw' | 'clean'>('raw');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isDirty = useRef(false);

  useEffect(() => {
    // Initial sync from lines to text if not dirty
    if (!isDirty.current) {
      let newText = '';
      if (viewMode === 'raw') {
         const hasAnyWordTimes = lines.some(l => l.words.some(w => w.start !== null));
         newText = exportLrc(lines, lrcMetadata, hasAnyWordTimes || exportFormat === 'enhanced');
      } else {
         newText = lines.map(l => l.words.map(w=>w.text).join('')).join('\n');
      }
      
      if (text !== newText) {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setText(newText || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, viewMode, exportFormat, lrcMetadata]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    isDirty.current = true;
  };

  const saveChanges = () => {
    if (!isDirty.current) return;
    
    let resultLines;
    if (viewMode === 'raw') {
      const parsed = parseRawLyrics(text);
      resultLines = parsed.lines;
      setLrcMetadata(parsed.metadata);
      commitLines(resultLines, 'Edit Raw Lyrics');
    } else {
      const newLinesText = text.split(/\r?\n/);
      resultLines = newLinesText.map((lineStr, idx) => {
        const existingLine = lines[idx];
        if (existingLine) {
          return {
            ...existingLine,
            words: splitWordsAegisub(lineStr),
            raw: lineStr
          };
        } else {
          return {
            id: Math.random().toString(36).substr(2, 9),
            start: null,
            end: null,
            words: splitWordsAegisub(lineStr),
            raw: lineStr
          };
        }
      });
      commitLines(resultLines, 'Edit Clean Lyrics');
    }
    
    // Auto-detect if all timestamps are cleared, if so, reset the active index to 0
    const hasAnyTimestamps = resultLines.some(l => l.start !== null || l.words.some(w => w.start !== null));
    if (!hasAnyTimestamps) {
        setActiveLineIndex(0);
        setActiveWordIndex(0);
    }
    
    isDirty.current = false;
  };

  const handleTextBlur = () => {
    saveChanges();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-panel-alt)]">
      <div className="p-2 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex items-center shrink-0">
        <div className="relative">
          <div className="flex group shadow-sm rounded">
            <button 
              className="px-3 py-1 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-l text-[10px] font-bold uppercase tracking-widest border border-[var(--app-border-light)] border-r-0 flex items-center gap-2 text-[var(--app-text-secondary)] transition-colors"
            >
              {viewMode === 'raw' ? 'WITH TIMESTAMPS (RAW)' : 'CLEAN LYRICS (NO TIMESTAMPS)'}
            </button>
            <button
               onClick={() => setDropdownOpen(!dropdownOpen)}
               className="px-1.5 py-1 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-r border border-[var(--app-border-light)] text-[var(--app-text-muted)] transition-colors"
            >
               <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          
          {dropdownOpen && (
             <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded shadow-xl z-50 overflow-hidden py-1">
                <button className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors" onClick={() => { setViewMode('raw'); setDropdownOpen(false); }}>
                  With Timestamps (Raw)
                </button>
                <button className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors" onClick={() => { setViewMode('clean'); setDropdownOpen(false); }}>
                  Clean Lyrics (Keep existing sync)
                </button>
             </div>
          )}
        </div>
      </div>
      <LineNumberedTextarea
        className="flex-1 rounded-none border-0 border-t border-[var(--app-border-base)] shadow-inner text-[var(--app-text-secondary)]"
        placeholder={viewMode === 'raw' ? "Paste your raw LRC with timestamps here..." : "Paste your clean lyrics here..."}
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        startLineNumber={viewMode === 'raw' ? 1 : (Object.values(lrcMetadata || {}).filter(Boolean).length + 1)}
      />
    </div>
  );
}
