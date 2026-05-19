'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from './EditorProvider';
import { exportLrc } from '@/lib/lyric-utils';
import { useI18n } from '@/hooks/useI18n';
import { KaraokePreview } from './KaraokePreview';
import { useAutoScroll } from './useAutoScroll';

export function RawTextDisplay() {
  const { lines, activeLineIndex, lrcMetadata, exportFormat, setExportFormat, setAutoScrollEnabled } = useEditor();
  const i18n = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  useAutoScroll();
  
  // Auto-switch to enhanced if any word has a timestamp
  useEffect(() => {
    const hasElrc = lines.some(l => l.words.some(w => w.start !== null));
    if (hasElrc) {
      setExportFormat('enhanced');
    }
    setAutoScrollEnabled(true);
  }, [lines, setExportFormat, setAutoScrollEnabled]);
  
  const text = exportLrc(lines, lrcMetadata, exportFormat === 'enhanced', exportFormat === 'simple');
  const allLines = text.split('\n');

  const handleSelectAll = () => {
    const selection = window.getSelection();
    if (selection && containerRef.current) {
        const range = document.createRange();
        range.selectNodeContents(containerRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
    }
  };

  const handleCopyAll = async () => {
    try {
       await navigator.clipboard.writeText(text);
    } catch (err) {
       console.error("Failed to copy", err);
    }
  };

  // Keep track of which line in the raw text corresponds to the activeLineIndex of actual lyrics
  // Note: LRC metadata adds lines at the beginning.
  const metadataLinesCount = Object.values(lrcMetadata || {}).filter(Boolean).length;
  // If we are showing lyrics, the active lyric line is offset by metadata lines (approx)
  // We'll just highlight based on matching the exported text line by index if possible, 
  // but it's simpler: The first metadataLinesCount lines are tags. The remaining lines match `lines` array.
  const activeRawIndex = exportFormat !== 'simple' ? activeLineIndex + metadataLinesCount : activeLineIndex;

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-panel-alt)] relative">
      <KaraokePreview />
      
      <div className="p-3 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex justify-between items-center shrink-0">
        <div className="flex gap-2">
           <button
             onClick={() => setExportFormat('enhanced')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'enhanced' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             {i18n.exportEnhanced}
           </button>
           <button
             onClick={() => setExportFormat('standard')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'standard' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             {i18n.exportStandard}
           </button>
           <button
             onClick={() => setExportFormat('simple')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'simple' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             {i18n.exportSimple || '簡易歌詞 (無時間戳)'}
           </button>
        </div>
        <div className="flex gap-2">
          <button 
             onClick={handleSelectAll}
             className="px-3 py-1 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text-secondary)] text-[10px] uppercase font-bold rounded border border-[var(--app-border-light)] transition-colors"
          >
             全選
          </button>
          <button 
             onClick={handleCopyAll}
             className="px-3 py-1 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black text-[10px] uppercase font-bold rounded transition-colors"
          >
             複製全部
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-[var(--app-bg-base)] text-sm font-mono py-4 select-text leading-relaxed outline-none border-t border-[var(--app-border-base)] shadow-inner" style={{ whiteSpace: 'pre-wrap' }} ref={containerRef}>
          {allLines.map((lineText, idx) => {
              const isHighlight = idx === activeRawIndex && lines.length > 0;
              return (
                  <div key={idx} className={`flex px-2 py-0.5 transition-colors ${isHighlight ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)]'}`}>
                      <div className="w-10 shrink-0 text-right pr-3 opacity-30 select-none text-xs leading-[1.4rem]">
                          {idx + 1}
                      </div>
                      <div className="flex-1 leading-[1.4rem]" style={{ wordBreak: 'break-all' }}>
                          {lineText || ' '}
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}
