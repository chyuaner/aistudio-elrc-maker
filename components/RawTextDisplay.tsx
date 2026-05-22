'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from './EditorProvider';
import { exportLrc, exportSrt } from '@/lib/lyric-utils';
import { useI18n } from '@/hooks/useI18n';
import { KaraokePreview } from './KaraokePreview';
import { useAutoScroll } from './useAutoScroll';

export function RawTextDisplay() {
  const { lines, activeLineIndex, lrcMetadata, exportFormat, setExportFormat, setAutoScrollEnabled, dualLineGapSec, setDualLineGapSec, paragraphStarts, duration } = useEditor();
  const i18n = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [simpleIncludeInstrumental, setSimpleIncludeInstrumental] = useState(false);

  useAutoScroll();
  
  useEffect(() => {
    setAutoScrollEnabled(true);
  }, [setAutoScrollEnabled]);
  
  let text = '';
  if (exportFormat === 'srt') {
      text = exportSrt(lines, duration);
  } else {
      text = exportLrc(lines, lrcMetadata, exportFormat === 'enhanced', exportFormat === 'simple', simpleIncludeInstrumental, paragraphStarts);
  }
  const allLines = text.split('\n');
  
  let currentRawIndex = 0;
  const rawIdxToLineIdx = new Map<number, number>();
  
  if (exportFormat === 'srt') {
      for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          if (l.start !== null && l.words.some(w => w.text.trim().length > 0)) {
              rawIdxToLineIdx.set(currentRawIndex, i);
              rawIdxToLineIdx.set(currentRawIndex + 1, i);
              rawIdxToLineIdx.set(currentRawIndex + 2, i);
              rawIdxToLineIdx.set(currentRawIndex + 3, i);
              currentRawIndex += 4;
          }
      }
  } else {
      const metadataLinesCount = Object.values(lrcMetadata || {}).filter(Boolean).length;
      
      if (exportFormat !== 'simple') {
          for (let i = 0; i < metadataLinesCount; i++) {
              currentRawIndex++;
          }
      }

      for (let i = 0; i < lines.length; i++) {
          if (exportFormat === 'simple' && simpleIncludeInstrumental && i > 0 && paragraphStarts[i]) {
              currentRawIndex++; // Empty line
          }
          rawIdxToLineIdx.set(currentRawIndex, i);
          currentRawIndex++;
      }
  }

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

  return (
    <div className="contents lg:flex lg:flex-col lg:h-full lg:bg-[var(--app-bg-panel-alt)] lg:relative">
      <KaraokePreview hideTouchUI={true} />
      
      <div className="p-3 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex flex-wrap gap-3 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
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
           <button
             onClick={() => setExportFormat('srt')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'srt' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             .SRT
           </button>
           
           {exportFormat === 'simple' && (
             <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors select-none">
               <input 
                 type="checkbox" 
                 checked={simpleIncludeInstrumental} 
                 onChange={(e) => setSimpleIncludeInstrumental(e.target.checked)} 
                 className="rounded border-[var(--app-border-base)] bg-transparent accent-[var(--app-accent)] m-0 w-3.5 h-3.5"
               />
               輸出包含留空的間奏行
             </label>
           )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-[var(--app-text-muted)] font-bold">間距閥值</span>
             <input type="number" value={dualLineGapSec} onChange={(e) => setDualLineGapSec(Number(e.target.value) || 0)} className="w-12 bg-[var(--app-bg-input)] border border-[var(--app-border-light)] rounded px-1 min-h-[1.5rem] py-0.5 text-xs text-center" step="0.5" />
             <span className="text-[10px] text-[var(--app-text-muted)]">秒</span>
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
      </div>
      
      <div className="flex-1 overflow-auto bg-[var(--app-bg-base)] text-sm font-mono py-4 select-text leading-relaxed outline-none border-t border-[var(--app-border-base)] shadow-inner" style={{ whiteSpace: 'pre-wrap' }} ref={containerRef} data-context-menu="readonly">
          {allLines.map((lineText, idx) => {
              const mappedOriginalIdx = rawIdxToLineIdx.get(idx);
              const isHighlight = mappedOriginalIdx === activeLineIndex && lines.length > 0;
              const isParagraphStartColor = mappedOriginalIdx !== undefined && paragraphStarts[mappedOriginalIdx] && lines.length > 0 && !isHighlight;
              
              const rowClass = isHighlight 
                  ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' 
                  : isParagraphStartColor 
                     ? 'bg-[#293B33]/40 text-[var(--app-text-secondary)] shadow-[inset_2px_0_0_0_rgba(65,168,125,0.5)] hover:bg-[#293B33]/60' 
                     : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-hover)]';
                     
              return (
                  <div key={idx} className={`flex px-2 py-0.5 transition-colors ${rowClass}`}>
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
