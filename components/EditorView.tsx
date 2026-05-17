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
      <div className="flex bg-[#1A1D23] border-b border-[#2D333B] shrink-0">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'text' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
        >
          TEXT EDITOR
        </button>
        <button
          onClick={() => setMode('sync')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'sync' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
        >
          SYNC EDITOR
        </button>
        <button
          onClick={() => setMode('dual-sync')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'dual-sync' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
        >
          DUAL-LINE SYNC EDITOR
        </button>
        <button
          onClick={() => setMode('raw')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${mode === 'raw' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
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
