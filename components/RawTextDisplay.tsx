'use client';

import React, { useRef, useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { exportLrc } from '@/lib/lyric-utils';
import { useI18n } from '@/hooks/useI18n';

export function RawTextDisplay() {
  const { lines, exportFormat, setExportFormat } = useEditor();
  const i18n = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-switch to enhanced if any word has a timestamp
  useEffect(() => {
    const hasElrc = lines.some(l => l.words.some(w => w.start !== null));
    if (hasElrc) {
      setExportFormat('enhanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = exportLrc(lines, exportFormat === 'enhanced', exportFormat === 'simple');

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  };

  const handleCopyAll = async () => {
    try {
       await navigator.clipboard.writeText(text);
    } catch (err) {
       console.error("Failed to copy", err);
    }
  };

  useEffect(() => {
    handleSelectAll();
  }, [exportFormat, text]);

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-panel-alt)]">
      <div className="p-3 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex justify-between items-center shrink-0">
        <div className="flex gap-2">
           <button
             onClick={() => setExportFormat('standard')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'standard' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             {i18n.exportStandard}
           </button>
           <button
             onClick={() => setExportFormat('enhanced')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'enhanced' ? 'bg-[var(--app-border-base)] border-[var(--app-accent)] text-[var(--app-accent)] shadow-inner' : 'border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
           >
             {i18n.exportEnhanced}
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
            Select All
          </button>
          <button 
             onClick={handleCopyAll}
             className="px-3 py-1 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black text-[10px] uppercase font-bold rounded transition-colors"
          >
            複製全部
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        readOnly
        className="flex-1 w-full p-6 bg-transparent outline-none font-mono text-sm leading-relaxed resize-none custom-scrollbar text-green-400"
        value={text}
        onClick={handleSelectAll}
      />
    </div>
  );
}
