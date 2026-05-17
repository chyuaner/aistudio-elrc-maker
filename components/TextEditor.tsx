'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { parseRawLyrics, exportLrc, splitWordsAegisub } from '@/lib/lyric-utils';
import { ChevronDown } from 'lucide-react';

export function TextEditor() {
  const { lines, setLines, commitLines, exportFormat, setActiveLineIndex, setActiveWordIndex } = useEditor();
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
         newText = exportLrc(lines, hasAnyWordTimes || exportFormat === 'enhanced');
      } else {
         newText = lines.map(l => l.words.map(w=>w.text).join('')).join('\n');
      }
      
      if (text !== newText) {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setText(newText || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, viewMode, exportFormat]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    isDirty.current = true;
  };

  const saveChanges = () => {
    if (!isDirty.current) return;
    
    let resultLines;
    if (viewMode === 'raw') {
      resultLines = parseRawLyrics(text);
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
    <div className="flex flex-col h-full bg-[#16191E]">
      <div className="p-2 bg-[#1A1D23] border-b border-[#2D333B] flex items-center shrink-0">
        <div className="relative">
          <div className="flex group shadow-sm rounded">
            <button 
              className="px-3 py-1 bg-[#2D333B] hover:bg-[#3D444D] rounded-l text-[10px] font-bold uppercase tracking-widest border border-[#444C56] border-r-0 flex items-center gap-2 text-[#E0E0E0] transition-colors"
            >
              {viewMode === 'raw' ? 'WITH TIMESTAMPS (RAW)' : 'CLEAN LYRICS (NO TIMESTAMPS)'}
            </button>
            <button
               onClick={() => setDropdownOpen(!dropdownOpen)}
               className="px-1.5 py-1 bg-[#2D333B] hover:bg-[#3D444D] rounded-r border border-[#444C56] text-[#7D8590] transition-colors"
            >
               <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          
          {dropdownOpen && (
             <div className="absolute top-full left-0 mt-1 w-56 bg-[#1A1D23] border border-[#2D333B] rounded shadow-xl z-50 overflow-hidden py-1">
                <button className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors" onClick={() => { setViewMode('raw'); setDropdownOpen(false); }}>
                  With Timestamps (Raw)
                </button>
                <button className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors" onClick={() => { setViewMode('clean'); setDropdownOpen(false); }}>
                  Clean Lyrics (Keep existing sync)
                </button>
             </div>
          )}
        </div>
      </div>
      <textarea
        className="flex-1 w-full p-6 bg-transparent text-[#E0E0E0] outline-none font-mono text-sm leading-relaxed resize-none custom-scrollbar"
        placeholder={viewMode === 'raw' ? "Paste your raw LRC with timestamps here..." : "Paste your clean lyrics here..."}
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
      />
    </div>
  );
}
