'use client';

import React, { useRef, useState } from 'react';
import { useEditor } from './EditorProvider';
import { parseRawLyrics, exportLrc } from '@/lib/lyric-utils';
import { Music, Download, ChevronDown, X } from 'lucide-react';
import { UndoRedoControls } from './UndoRedo';
import { useDialogs } from './DialogProvider';

export function TopToolbar() {
  const { setFile, commitLines, resetHistory, lines, syncMode, setMetadata, metadata, audioFileName, lyricFileName, setLyricFileName, exportFormat, shiftTime } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricInputRef = useRef<HTMLInputElement>(null);
  const dialogs = useDialogs();
  
  const [loadMediaDropdownOpen, setLoadMediaDropdownOpen] = useState(false);
  const [loadDropdownOpen, setLoadDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      resetHistory([]);
      setLyricFileName(null);
      
      // Try parsing ID3 / Vorbis tags for lyrics
      if (typeof window !== 'undefined') {
        const jsmediatags = require('jsmediatags');
        jsmediatags.read(f, {
          onSuccess: async function(tag: any) {
             const { title, artist, album, year, comment, track, picture } = tag.tags;
             
             let picUrl = null;
             if (picture) {
                try {
                  const base64String = picture.data.reduce((acc: string, byte: number) => acc + String.fromCharCode(byte), '');
                  picUrl = `data:${picture.format};base64,${window.btoa(base64String)}`;
                } catch(e) {}
             }
             
             let foundLyrics: any = tag.tags.USLT?.lyrics || tag.tags.SYLT?.lyrics || tag.tags.LYRICS || tag.tags.lyrics || tag.tags['©lyr'] || tag.tags.COMMENT?.text || tag.tags.comment?.text;
             
             if (!foundLyrics) {
                // fallback scan all keys
                for (const key of Object.keys(tag.tags)) {
                   const k = key.toLowerCase();
                   // Support flac tags like 'lyrics', 'lyrics:xxx', '©lyr', etc.
                   if (k === 'lyrics' || k.startsWith('lyrics:') || k.startsWith('©lyr')) {
                      foundLyrics = typeof tag.tags[key] === 'string' ? tag.tags[key] : tag.tags[key]?.data || tag.tags[key]?.text;
                      if (foundLyrics) break;
                   }
                }
             }

             if (foundLyrics && typeof foundLyrics !== 'string' && foundLyrics.data) {
                foundLyrics = foundLyrics.data;
             }
             if (typeof foundLyrics !== 'string') {
                foundLyrics = undefined;
             }

             setMetadata({
               title,
               artist,
               album,
               year,
               comment: comment?.text || (typeof comment === 'string' ? comment : undefined),
               track,
               format: picture?.format,
               picture: picUrl,
               lyric: foundLyrics,
               rawTags: tag.tags
             });
             
             if (foundLyrics) {
                 setLyricFileName('Embedded Tag');
                 resetHistory(parseRawLyrics(foundLyrics));
             }
          },
          onError: function(error: any) {
            console.log('No ID3 tags or error', error);
            setMetadata(null);
          }
        });
      }
    }
  };

  const clearLyrics = async () => {
    if (lines.length > 0) {
      if (await dialogs.confirm('Are you sure you want to discard current lyrics?')) {
        commitLines([], 'Clear Lyrics');
        setLyricFileName(null);
      }
    }
  };

  const clearMedia = async () => {
    if (audioFileName) {
      setFile(null);
      setMetadata(null);
    }
  };

  const handleLyricSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (lines.length > 0) {
        const confirmed = await dialogs.confirm('Loading a new lyrics file will discard your current ones. Continue?');
        if (!confirmed) return;
      }
      setLyricFileName(f.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        resetHistory(parseRawLyrics(text));
      };
      reader.readAsText(f);
    }
  };

  const handleExport = (format: 'standard' | 'enhanced') => {
    if (lines.length === 0) return;
    const lrcText = exportLrc(lines, format === 'enhanced');
    const blob = new Blob([lrcText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics_${format}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  return (
    <header className="bg-[#1A1D23] border-b border-[#2D333B] p-2 flex items-center justify-between shrink-0 relative select-none">
      {/* Left Group */}
      <div className="flex items-center">
        <div className="w-[0px] h-full app-region-drag pointer-events-none self-stretch" />
        <div className="flex items-center gap-2 z-10">
          <input 
            type="file" 
            accept="audio/*,video/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleAudioSelect} 
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          />
          <input 
            type="file" 
            accept=".txt,.lrc" 
            className="hidden" 
            ref={lyricInputRef} 
            onChange={handleLyricSelect}
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          />
          
          <div className="relative">
            <div className="flex group shadow-sm rounded">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#2D333B] hover:bg-[#3D444D] rounded-l text-xs font-medium border border-[#444C56] border-r-0 flex items-center gap-2 text-[#E0E0E0] transition-colors"
              >
                <Music className="w-3.5 h-3.5 text-blue-400" /> Load Media
              </button>
              <button
                 onClick={() => setLoadMediaDropdownOpen(!loadMediaDropdownOpen)}
                 className="px-1.5 py-1.5 bg-[#2D333B] hover:bg-[#3D444D] rounded-r border border-[#444C56] text-[#7D8590] transition-colors"
              >
                 <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {loadMediaDropdownOpen && (
               <div className="absolute top-full left-0 mt-1 w-48 bg-[#1A1D23] border border-[#2D333B] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button 
                    disabled={!audioFileName}
                    onClick={() => { clearMedia(); setLoadMediaDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> Close Audio
                  </button>
               </div>
            )}
          </div>
          
          <div className="relative">
            <div className="flex group shadow-sm rounded">
              <button 
                onClick={() => lyricInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#2D333B] hover:bg-[#3D444D] rounded-l text-xs font-medium border border-[#444C56] border-r-0 flex items-center gap-2 text-[#E0E0E0] transition-colors"
              >
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span> Load Lyrics
              </button>
              <button
                 onClick={() => setLoadDropdownOpen(!loadDropdownOpen)}
                 className="px-1.5 py-1.5 bg-[#2D333B] hover:bg-[#3D444D] rounded-r border border-[#444C56] text-[#7D8590] transition-colors"
              >
                 <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {loadDropdownOpen && (
               <div className="absolute top-full left-0 mt-1 w-56 bg-[#1A1D23] border border-[#2D333B] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors" onClick={() => { lyricInputRef.current?.click(); setLoadDropdownOpen(false); }}>
                    Load external .lrc file
                  </button>
                  <button 
                    disabled={!metadata?.lyric}
                    className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors" 
                    onClick={async () => { 
                       if (metadata?.lyric) {
                          if (lines.length > 0) {
                             const confirmed = await dialogs.confirm('Loading embedded lyrics will discard your current ones. Continue?');
                             if (!confirmed) return;
                          }
                          resetHistory(parseRawLyrics(metadata.lyric)); 
                       }
                       setLoadDropdownOpen(false); 
                    }}
                  >
                    From ID3 / Vorbis Tags
                  </button>
                  <div className="h-px bg-[#2D333B] mx-2 my-1" />
                  <button 
                    disabled={lines.length === 0}
                    onClick={() => { clearLyrics(); setLoadDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Lyrics
                  </button>
               </div>
            )}
          </div>

          <div className="h-6 w-px bg-[#2D333B] mx-1"></div>
          <UndoRedoControls />
        </div>
      </div>
      
      {/* Center items: Title and File Names */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none whitespace-nowrap overflow-hidden px-8 z-0">
        <h1 className="text-sm font-bold tracking-tight uppercase text-[#E0E0E0]">LRC Maker <span className="text-[#7D8590] font-normal italic ml-1">Enhanced</span></h1>
        <div className="text-[10px] text-[#7D8590] font-mono mt-0.5 truncate flex items-center justify-center gap-2 max-w-full">
          {audioFileName ? <span>Audio: <span className="text-[#E0E0E0] truncate max-w-[200px] inline-block align-bottom">{audioFileName}</span></span> : <span>No Audio</span>}
          <span className="opacity-50 shrink-0">|</span>
          {lyricFileName ? <span>Lyrics: <span className="text-[#E0E0E0] truncate max-w-[200px] inline-block align-bottom">{lyricFileName}</span></span> : metadata?.lyric ? <span>Lyrics: <span className="text-[#E0E0E0]">Embedded Tag</span></span> : <span>No Lyrics</span>}
        </div>
      </div>
      
      {/* Right Group */}
      <div className="flex items-center">
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={async () => {
              const val = await dialogs.prompt('Shift all timings by X seconds (e.g., 0.5 or -1.2):', '0');
              if (val && !isNaN(parseFloat(val))) {
                 shiftTime(parseFloat(val));
              }
            }}
            className="px-3 py-1.5 bg-[#2D333B] hover:bg-[#3D444D] rounded text-[10px] shadow-sm uppercase font-bold tracking-widest border border-[#444C56] flex items-center text-[#E0E0E0] transition-colors"
          >
            ± Offset
          </button>
          
          <div className="relative">
             <div className="flex group shadow-sm rounded">
                <button 
                  onClick={() => handleExport(exportFormat)}
                  className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#E26D16] text-black rounded-l text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-transparent"
                >
                  <Download className="w-4 h-4" /> Export .lrc
                </button>
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="px-1.5 py-1.5 bg-[#F27D26] hover:bg-[#E26D16] text-black rounded-r text-xs font-bold uppercase flex items-center transition-colors border border-transparent border-l-black/20"
                >
                   <ChevronDown className="w-3 h-3" />
                </button>
             </div>

             {exportDropdownOpen && (
               <div className="absolute top-full right-0 mt-1 w-56 bg-[#1A1D23] border border-[#2D333B] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors flex flex-col gap-1" onClick={() => handleExport('standard')}>
                    <span>Standard LRC (Line-by-line)</span>
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs text-[#E0E0E0] hover:bg-[#F27D26] hover:text-black transition-colors flex flex-col gap-1" onClick={() => handleExport('enhanced')}>
                    <span>Enhanced LRC (ESLyric)</span>
                  </button>
               </div>
            )}
          </div>
        </div>
        <div className="w-[0px] h-full app-region-drag pointer-events-none self-stretch" />
      </div>
    </header>
  );
}
