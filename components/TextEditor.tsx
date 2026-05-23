'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { parseRawLyrics, exportLrc, splitWordsAegisub } from '@/lib/lyric-utils';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { useI18n } from '@/hooks/useI18n';
import { useDialogs } from './DialogProvider';

export function TextEditor() {
  const { lines, setLines, commitLines, exportFormat, setActiveLineIndex, setActiveWordIndex, lrcMetadata, setLrcMetadata, activeLineIndex } = useEditor();
  const [text, setText] = useState('');
  const isDirty = useRef(false);
  const i18n = useI18n();
  const dialogs = useDialogs();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initial sync from lines to text if not dirty
    if (!isDirty.current) {
      let newText = exportLrc(lines, lrcMetadata, true, false); // force ELRC
      
      if (text !== newText) {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setText(newText || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, exportFormat, lrcMetadata]);

  useEffect(() => {
     const handler = (e: any) => {
         const lineIndex = e.detail?.lineIndex;
         if (lineIndex !== undefined && textareaRef.current) {
             const metadataLinesCount = Object.values(lrcMetadata || {}).filter(Boolean).length;
             const targetRow = metadataLinesCount + lineIndex;
             
             let pos = 0;
             const splitLines = text.split('\n');
             for (let i = 0; i < targetRow && i < splitLines.length; i++) {
                 pos += splitLines[i].length + 1;
             }
             
             const textarea = textareaRef.current;
             textarea.focus();
             textarea.setSelectionRange(pos, pos + (splitLines[targetRow]?.length || 0));
             
             // Hack to scroll into view
             const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight || '24') || 24;
             textarea.scrollTop = Math.max(0, targetRow * lineHeight - textarea.clientHeight / 2);
         }
     };
     window.addEventListener('focus-raw-text-line', handler);
     return () => window.removeEventListener('focus-raw-text-line', handler);
  }, [text, lrcMetadata]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    isDirty.current = true;
  };

  const saveChanges = (forceText?: string) => {
    if (!isDirty.current && forceText === undefined) return;
    
    const textToParse = forceText !== undefined ? forceText : text;
    const parsed = parseRawLyrics(textToParse);
    let resultLines = parsed.lines;
    setLrcMetadata(parsed.metadata);
    commitLines(resultLines, 'Edit Raw Lyrics');
    
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
      <div className="p-2 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex flex-wrap gap-2 items-center justify-between shrink-0">
        <div className="flex items-center">
            <span className="px-3 py-1 bg-[var(--app-border-base)] rounded text-[10px] font-bold uppercase tracking-widest border border-[var(--app-border-light)] text-[var(--app-text-secondary)]">
              WITH TIMESTAMPS (ELRC)
            </span>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={async () => {
                 const { convertToTraditional } = await import('@/lib/chinese-conv');
                 setText(t => {
                     const next = convertToTraditional(t);
                     isDirty.current = true;
                     setTimeout(() => saveChanges(next), 0);
                     return next;
                 });
             }}
             className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-white transition-colors"
           >
             轉成繁體
           </button>
           <button 
             onClick={async () => {
                 const { convertToSimplified } = await import('@/lib/chinese-conv');
                 setText(t => {
                     const next = convertToSimplified(t);
                     isDirty.current = true;
                     setTimeout(() => saveChanges(next), 0);
                     return next;
                 });
             }}
             className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-white transition-colors"
           >
             轉成簡體
           </button>
           
           <div className="w-px bg-[var(--app-border-light)] opacity-50 my-1 mx-1"></div>

           <button 
             onClick={() => {
                setText(t => {
                  const parsed = parseRawLyrics(t);
                  const next = exportLrc(parsed.lines, parsed.metadata, false, false);
                  isDirty.current = true;
                  setTimeout(() => saveChanges(next), 0);
                  return next;
                });
             }}
             className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-orange-400 transition-colors"
           >
             轉成 標準LRC (逐行同步)
           </button>
           <button 
             onClick={() => {
                setText(t => {
                  const parsed = parseRawLyrics(t);
                  let metaStr = '';
                  for (const [key, value] of Object.entries(parsed.metadata)) {
                    if (value) metaStr += `[${key}:${value}]\n`;
                  }
                  const next = metaStr + parsed.lines.map(l => l.words.map(w=>w.text).join('')).join('\n');
                  isDirty.current = true;
                  setTimeout(() => saveChanges(next), 0);
                  return next;
                });
             }}
             className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-red-900/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
           >
             轉成 簡易歌詞 (無時間戳)
           </button>
        </div>
      </div>
      <LineNumberedTextarea
        ref={textareaRef}
        className="flex-1 rounded-none border-0 border-t border-[var(--app-border-base)] shadow-inner text-[var(--app-text-secondary)]"
        placeholder="Paste your raw LRC with timestamps here..."
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        startLineNumber={Object.values(lrcMetadata || {}).filter(Boolean).length + 1}
      />
    </div>
  );
}
