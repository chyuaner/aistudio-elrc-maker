'use client';

import React, { useEffect, useState } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { TextEditor } from '@/components/panel/TextEditor';
import { SyncEditor } from '@/components/panel/SyncEditor';
import { RawTextDisplay } from '@/components/panel/RawTextDisplay';
import { useGlobalHotkeys } from '@/components/base/useGlobalHotkeys';
import { useI18n } from '@/hooks/useI18n';

export function EditorView() {
  const { mode, setMode } = useEditor();
  const i18n = useI18n();
  useGlobalHotkeys();

  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isReallyNarrow, setIsReallyNarrow] = useState(false);
  const [isTall, setIsTall] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobileLayout = window.innerWidth < 1024;
      const reallyNarrow = window.innerWidth < 768; // sm
      setIsMobileLayout(mobileLayout);
      setIsReallyNarrow(reallyNarrow);
      setIsTall(window.innerHeight > 1110);
      if (reallyNarrow && mode === 'dual-sync') {
         setMode('sync');
      }
    };
    handleResize(); // trigger once
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode, setMode]);

  return (
    <div className={(isMobileLayout && !isTall) ? "contents" : "flex-1 w-full h-full overflow-hidden flex flex-col"}>
      <div className={`flex bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] shrink-0 z-20 ${isMobileLayout && !isTall ? 'static' : ''}`}>
        <button
          onClick={() => setMode('text')}
          onMouseDown={(e) => e.preventDefault()}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 hover:bg-[var(--app-bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset ${mode === 'text' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabText}
        </button>
        <button
          onClick={() => setMode('sync')}
          onMouseDown={(e) => e.preventDefault()}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 hover:bg-[var(--app-bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset ${mode === 'sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabSync}
        </button>
        {!isReallyNarrow && (
          <button
            onClick={() => setMode('dual-sync')}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 hover:bg-[var(--app-bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset ${mode === 'dual-sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
          >
            {i18n.tabDualSync}
          </button>
        )}
        <button
          onClick={() => setMode('raw')}
          onMouseDown={(e) => e.preventDefault()}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 hover:bg-[var(--app-bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset ${mode === 'raw' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          {i18n.tabRaw}
        </button>
      </div>

      <div className={(isMobileLayout && !isTall) ? "contents" : "flex-1 overflow-hidden flex flex-col"}>
        {mode === 'text' && <TextEditor />}
        {(mode === 'sync' || mode === 'dual-sync') && <SyncEditor />}
        {mode === 'raw' && <RawTextDisplay />}
      </div>
    </div>
  );
}
