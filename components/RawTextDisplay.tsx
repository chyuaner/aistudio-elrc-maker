'use client';

import React, { useRef, useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { exportLrc } from '@/lib/lyric-utils';

export function RawTextDisplay() {
  const { lines, exportFormat, setExportFormat } = useEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-switch to enhanced if any word has a timestamp
  useEffect(() => {
    const hasElrc = lines.some(l => l.words.some(w => w.start !== null));
    if (hasElrc) {
      setExportFormat('enhanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = exportLrc(lines, exportFormat === 'enhanced');

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  };

  useEffect(() => {
    handleSelectAll();
  }, [exportFormat, text]);

  return (
    <div className="flex flex-col h-full bg-[#16191E]">
      <div className="p-3 bg-[#1A1D23] border-b border-[#2D333B] flex justify-between items-center shrink-0">
        <div className="flex gap-2">
           <button
             onClick={() => setExportFormat('standard')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'standard' ? 'bg-[#2D333B] border-[#F27D26] text-[#F27D26] shadow-inner' : 'border-[#444C56] text-[#7D8590] hover:text-[#E0E0E0]'}`}
           >
             LRC 逐行
           </button>
           <button
             onClick={() => setExportFormat('enhanced')}
             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors disabled:opacity-50 ${exportFormat === 'enhanced' ? 'bg-[#2D333B] border-[#F27D26] text-[#F27D26] shadow-inner' : 'border-[#444C56] text-[#7D8590] hover:text-[#E0E0E0]'}`}
           >
             增強型LRC (ESLyric)
           </button>
        </div>
        <button 
           onClick={handleSelectAll}
           className="px-3 py-1 bg-[#2D333B] hover:bg-[#3D444D] text-[#E0E0E0] text-[10px] uppercase font-bold rounded border border-[#444C56] transition-colors"
        >
          Select All
        </button>
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
