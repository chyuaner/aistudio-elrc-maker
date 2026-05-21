'use client';

import React, { useEffect, useState } from 'react';
import { useEditor } from './EditorProvider';
import { TextEditor } from './TextEditor';
import { SyncEditor } from './SyncEditor';
import { RawTextDisplay } from './RawTextDisplay';
import { AssExportView } from './AssExportView';
import { useGlobalHotkeys } from './useGlobalHotkeys';
import { useI18n } from '@/hooks/useI18n';

export function EditorView() {
  const { mode, setMode } = useEditor();
  const i18n = useI18n();
  useGlobalHotkeys();

  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 768; // sm
      setIsNarrow(narrow);
      if (narrow && mode === 'dual-sync') {
         setMode('sync');
      }
    };
    handleResize(); // trigger once
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode, setMode]);

  return (
    <div className="flex-1 w-full h-full md:overflow-hidden flex flex-col">
      <div className="flex bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] shrink-0 sticky md:static top-[55px] z-40 shadow-sm md:shadow-none">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'text' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabText}
        </button>
        <button
          onClick={() => setMode('sync')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabSync}
        </button>
        {!isNarrow && (
          <button
            onClick={() => setMode('dual-sync')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'dual-sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.tabDualSync}
          </button>
        )}
        <button
          onClick={() => setMode('raw')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'raw' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabRaw}
        </button>
        <button
          onClick={() => setMode('ass-export')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'ass-export' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          KTV ASS輸出
        </button>
      </div>

      <div className="flex-1 md:overflow-hidden flex flex-col">
        {mode === 'text' && <TextEditor />}
        {(mode === 'sync' || mode === 'dual-sync') && <SyncEditor />}
        {mode === 'raw' && <RawTextDisplay />}
        {mode === 'ass-export' && <AssExportView />}
      </div>
    </div>
  );
}
