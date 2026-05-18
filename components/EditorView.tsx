'use client';

import React from 'react';
import { useEditor } from './EditorProvider';
import { TextEditor } from './TextEditor';
import { SyncEditor } from './SyncEditor';
import { DualSyncEditor } from './DualSyncEditor';
import { RawTextDisplay } from './RawTextDisplay';
import { useGlobalHotkeys } from './useGlobalHotkeys';

export function EditorView() {
  const { mode, setMode } = useEditor();
  useGlobalHotkeys();

  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
      <div className="flex bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] shrink-0">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'text' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          TEXT EDITOR
        </button>
        <button
          onClick={() => setMode('sync')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          SYNC EDITOR
        </button>
        <button
          onClick={() => setMode('dual-sync')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'dual-sync' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          DUAL-LINE SYNC EDITOR
        </button>
        <button
          onClick={() => setMode('raw')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'raw' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          RAW PREVIEW
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'text' && <TextEditor />}
        {mode === 'sync' && <SyncEditor />}
        {mode === 'dual-sync' && <DualSyncEditor />}
        {mode === 'raw' && <RawTextDisplay />}
      </div>
    </div>
  );
}
