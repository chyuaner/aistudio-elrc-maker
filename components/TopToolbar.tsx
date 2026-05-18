'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { parseRawLyrics, exportLrc } from '@/lib/lyric-utils';
import { Music, Download, ChevronDown, X } from 'lucide-react';
import { UndoRedoControls } from './UndoRedo';
import { useDialogs } from './DialogProvider';
import { AppCommands } from '@/lib/app-commands';
import { useI18n } from '@/hooks/useI18n';

function extractFlacMetadata(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const decoder = new TextDecoder('utf-8');
    const tagsMap = new Map<string, string>();
    const covers: { mime: string, url: string }[] = [];

    if (view.getUint32(0) !== 0x664C6143) {
        throw new Error("非標準 FLAC 檔案格式");
    }

    let offset = 4;
    let isLastBlock = false;

    while (!isLastBlock && offset < view.byteLength) {
        if (offset + 4 > view.byteLength) break;
        const blockHeader = view.getUint8(offset);
        isLastBlock = (blockHeader & 0x80) !== 0;
        const blockType = blockHeader & 0x7F;

        const length = (view.getUint8(offset + 1) << 16) |
                       (view.getUint8(offset + 2) << 8) |
                       view.getUint8(offset + 3);

        offset += 4; // Shift to block content

        if (offset + length > view.byteLength) break;

        if (blockType === 4) {
            let p = offset;
            const vendorLength = view.getUint32(p, true);
            p += 4 + vendorLength; // Skip vendor string

            const commentListLength = view.getUint32(p, true);
            p += 4;

            for (let i = 0; i < commentListLength; i++) {
                const commentLength = view.getUint32(p, true);
                p += 4;

                const commentBytes = new Uint8Array(buffer, p, commentLength);
                const commentStr = decoder.decode(commentBytes);
                p += commentLength;

                const equalIndex = commentStr.indexOf('=');
                if (equalIndex !== -1) {
                    const key = commentStr.substring(0, equalIndex).toUpperCase();
                    const value = commentStr.substring(equalIndex + 1);
                    tagsMap.set(key, value);
                }
            }
        } else if (blockType === 6) {
            let p = offset;

            // Picture type (4 bytes)
            const pictureType = view.getUint32(p);
            p += 4;

            const mimeLength = view.getUint32(p);
            p += 4;

            const mimeBytes = new Uint8Array(buffer, p, mimeLength);
            const mimeTypeStr = decoder.decode(mimeBytes);
            p += mimeLength;

            const descLength = view.getUint32(p);
            p += 4 + descLength;

            p += 16;

            const dataLength = view.getUint32(p);
            p += 4;

            if (p + dataLength <= view.byteLength) {
                const pictureBytes = new Uint8Array(buffer, p, dataLength);
                const base64String = Array.from(pictureBytes).map(byte => String.fromCharCode(byte)).join('');
                const dataUrl = `data:${mimeTypeStr};base64,${window.btoa(base64String)}`;

                covers.push({
                   mime: mimeTypeStr,
                   url: dataUrl
                });
            }
        }
        offset += length; 
    }

    return { tags: tagsMap, covers };
}

export function TopToolbar() {
  const { undo, redo, pastActions, futureActions, setFile, commitLines, resetHistory, lines, syncMode, setMetadata, metadata, audioFileName, lyricFileName, setLyricFileName, exportFormat, shiftTime } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricInputRef = useRef<HTMLInputElement>(null);
  const dialogs = useDialogs();
  const i18n = useI18n();
  
  const [loadMediaDropdownOpen, setLoadMediaDropdownOpen] = useState(false);
  const [loadDropdownOpen, setLoadDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const processAudioFile = React.useCallback(async (f: File) => {
    setFile(f);
    resetHistory([]);
    setLyricFileName(null);
    
    if (f.name.toLowerCase().endsWith('.flac') && typeof window !== 'undefined') {
       try {
          const slice = f.slice(0, 20 * 1024 * 1024); // Expand slice to 20MB for cover images
          const arrayBuffer = await slice.arrayBuffer();
          const { tags, covers } = extractFlacMetadata(arrayBuffer);
          let foundLyrics = tags.get('LYRICS') || tags.get('UNSYNCEDLYRICS') || tags.get('UNSYNCED LYRICS');
          
          if (!foundLyrics) {
             for (const [key, value] of tags.entries()) {
                if (key === 'LYRICS' || key.startsWith('LYRICS:') || key.startsWith('©LYR')) {
                   foundLyrics = value;
                   break;
                }
             }
          }
          
          if (foundLyrics || tags.size > 0 || covers.length > 0) {
             setMetadata({
                title: tags.get('TITLE'),
                artist: tags.get('ARTIST'),
                album: tags.get('ALBUM'),
                year: tags.get('DATE'),
                track: tags.get('TRACKNUMBER'),
                lyric: foundLyrics,
                picture: covers.length > 0 ? covers[0].url : null,
                pictures: covers.map(c => c.url),
                rawTags: Object.fromEntries(tags)
             });
             if (foundLyrics) {
                 setLyricFileName('Embedded Tag');
                 resetHistory(parseRawLyrics(foundLyrics));
             }
             return;
          }
       } catch (e) {
          console.error(e);
       }
    }

    // Try parsing ID3 / Vorbis tags (fallback)
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
              for (const key of Object.keys(tag.tags)) {
                 const k = key.toLowerCase();
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
             title, artist, album, year, track,
             comment: comment?.text || (typeof comment === 'string' ? comment : undefined),
             format: picture?.format, picture: picUrl, lyric: foundLyrics, rawTags: tag.tags
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
  }, [resetHistory, setFile, setLyricFileName, setMetadata]);

  const processLyricFile = React.useCallback(async (f: File) => {
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
  }, [lines.length, dialogs, resetHistory, setLyricFileName]);

  const handleExport = React.useCallback(async (format: 'standard' | 'enhanced') => {
    if (lines.length === 0) return;
    const lrcText = exportLrc(lines, format === 'enhanced');

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
    if (isTauri) {
      try {
        const tauri = (window as any).__TAURI__;
        await tauri.core.invoke('save_lyrics_dialog', { 
          lyricsText: lrcText, 
          defaultName: `lyrics_${format}.lrc` 
        });
      } catch (err) {
        console.error("Tauri save_lyrics_dialog failed:", err);
      }
    } else {
      const blob = new Blob([lrcText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyrics_${format}.lrc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setExportDropdownOpen(false);
  }, [lines]);

  // AppCommands mapping extracted from useEditor hooks above

  useEffect(() => {
    AppCommands.register({
      loadMedia: () => fileInputRef.current?.click(),
      loadLyrics: () => lyricInputRef.current?.click(),
      clearMedia: async () => {
        if (audioFileName) {
          if (await dialogs.confirm('Are you sure you want to discard current media?')) {
            setFile(null);
            setMetadata(null);
          }
        }
      },
      clearLyrics: async () => {
        if (lines.length > 0) {
          if (await dialogs.confirm('Are you sure you want to discard current lyrics?')) {
            commitLines([], 'Clear Lyrics');
            setLyricFileName(null);
          }
        }
      },
      loadEmbeddedLyrics: async () => {
        if (metadata?.lyric) {
           if (lines.length > 0) {
               const confirmed = await dialogs.confirm('Loading embedded lyrics will discard your current ones. Continue?');
               if (!confirmed) return;
           }
           resetHistory(parseRawLyrics(metadata.lyric));
           setLyricFileName(null);
        }
      },
      exportStandard: () => handleExport('standard'),
      exportEnhanced: () => handleExport('enhanced'),
      shiftTime: async () => {
        const val = await dialogs.prompt('Shift all timings by X seconds (e.g., 0.5 or -1.2):', '0');
        if (val !== null) {
          const sec = parseFloat(val);
          if (!isNaN(sec) && sec !== 0) {
            shiftTime(sec);
          }
        }
      },
      undo: () => undo(1),
      redo: () => redo(1),
      undoToSequence: (steps: number) => undo(steps),
      redoToSequence: (steps: number) => redo(steps),
      getUndoList: () => pastActions.map((a, i) => ({ id: `undo-${i}`, name: a.action })),
      getRedoList: () => futureActions.map((a, i) => ({ id: `redo-${i}`, name: a.action })),
    });
  }, [dialogs, audioFileName, lines.length, metadata, setFile, setMetadata, commitLines, setLyricFileName, resetHistory, shiftTime, undo, redo, pastActions, futureActions, handleExport]);

  const [dragOverlay, setDragOverlay] = useState<'media' | 'lyric' | 'file' | null>(null);

  React.useEffect(() => {
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
    if (isTauri) {
      document.documentElement.style.setProperty('--top-toolbar-display', 'none');
      const tauri = (window as any).__TAURI__;
      tauri.core.invoke('show_titlebar_buttons').catch((err: any) => {
        console.error("Failed to show titlebar buttons:", err);
      });
    }

    // --- STANDARD HTML5 BROWSER EVENTS (Chrome / Web) ---
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverlay(null);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const f = e.dataTransfer.files[0];
        if (f.type.startsWith('audio/') || f.type.startsWith('video/') || f.name.toLowerCase().endsWith('.flac')) {
          processAudioFile(f);
        } else if (f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.lrc')) {
          processLyricFile(f);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragOverlay) {
         let detected: 'media' | 'lyric' | 'file' = 'file';
         if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
             const items = Array.from(e.dataTransfer.items);
             
             // Check if any dragged item is an audio/video file
             const hasAudioVideo = items.some(item => 
                 item.kind === 'file' && (item.type.startsWith('audio/') || item.type.startsWith('video/'))
             );
             
             // Check if any dragged item is a text file (but ignore metadata types like text/uri-list)
             const hasText = items.some(item => 
                 item.kind === 'file' && item.type.startsWith('text/') && item.type !== 'text/uri-list'
             );
             
             if (hasAudioVideo) {
                 detected = 'media';
             } else if (hasText) {
                 detected = 'lyric';
             }
         }
         setDragOverlay(detected);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only hide if we leave the actual window, to prevent flickering over children
      if (e.relatedTarget === null || (e.relatedTarget as HTMLElement).nodeName === 'HTML') {
          setDragOverlay(null);
      }
    };

    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);

    // --- NATIVE TAURI DRAG-AND-DROP EVENTS (Tauri Desktop App) ---
    let active = true;
    const unlisteners: (() => void)[] = [];

    if (isTauri) {
      const tauri = (window as any).__TAURI__;
      
      const setupTauriListeners = async () => {
        try {
          const uEnter = await tauri.event.listen('tauri://drag-enter', (event: any) => {

            const paths = event.payload?.paths || [];
            if (paths.length > 0) {
              const path = paths[0];
              const ext = path.split('.').pop()?.toLowerCase();
              let detected: 'media' | 'lyric' | 'file' = 'file';
              if (['flac', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'mp4', 'mkv', 'webm'].includes(ext)) {
                detected = 'media';
              } else if (['txt', 'lrc'].includes(ext)) {
                detected = 'lyric';
              }
              setDragOverlay(detected);
            }
          });
          if (active) unlisteners.push(uEnter);
          else uEnter();

          const uLeave = await tauri.event.listen('tauri://drag-leave', () => {
            setDragOverlay(null);
          });
          if (active) unlisteners.push(uLeave);
          else uLeave();

          const uCancelled = await tauri.event.listen('tauri://drag-cancelled', () => {
            setDragOverlay(null);
          });
          if (active) unlisteners.push(uCancelled);
          else uCancelled();

          const uDrop = await tauri.event.listen('tauri://drag-drop', async (event: any) => {
            setDragOverlay(null);
            const paths = event.payload?.paths || [];
            if (paths.length > 0) {
              const path = paths[0];
              const fileName = path.split(/[/\\]/).pop() || 'temp_file';
              const ext = fileName.split('.').pop()?.toLowerCase();
              
              let mimeType = 'application/octet-stream';
              if (ext === 'flac') mimeType = 'audio/flac';
              else if (ext === 'mp3') mimeType = 'audio/mpeg';
              else if (ext === 'wav') mimeType = 'audio/wav';
              else if (ext === 'm4a') mimeType = 'audio/mp4';
              else if (ext === 'aac') mimeType = 'audio/aac';
              else if (ext === 'txt') mimeType = 'text/plain';
              else if (ext === 'lrc') mimeType = 'text/plain';

              try {
                const bytes = await tauri.core.invoke('read_file_binary', { path });
                const blob = new Blob([bytes], { type: mimeType });
                const file = new File([blob], fileName, { type: mimeType });
                
                if (ext === 'txt' || ext === 'lrc') {
                  processLyricFile(file);
                } else {
                  processAudioFile(file);
                }
              } catch (err) {
                console.error('Failed to read file from Tauri native drop:', err);
              }
            }
          });
          if (active) unlisteners.push(uDrop);
          else uDrop();
        } catch (err) {
          console.error('Error setting up Tauri drag listeners:', err);
        }
      };
      
      setupTauriListeners();
    }

    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      
      active = false;
      unlisteners.forEach(u => u());
    };
  }, [dragOverlay, processAudioFile, processLyricFile]);

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processAudioFile(f);
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
    if (f) processLyricFile(f);
  };

  return (
    <>
      {dragOverlay && (
         <div className="fixed inset-0 z-[100] bg-[var(--app-bg-base)]/80 backdrop-blur-sm flex items-center justify-center border-[3px] border-dashed border-[var(--app-accent)] m-4 rounded-xl pointer-events-none">
             <div className="text-center flex flex-col items-center gap-4 text-[var(--app-accent)] bg-[var(--app-bg-panel)] px-12 py-8 rounded-2xl shadow-2xl animate-pulse">
                <Music className="w-16 h-16" />
                <span className="text-3xl font-bold tracking-wide">
                   Load {dragOverlay === 'media' ? 'Media' : dragOverlay === 'lyric' ? 'Lyrics' : 'Media / Lyrics'}
                </span>
             </div>
         </div>
      )}
      
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

      <header 
        style={{ display: 'var(--top-toolbar-display, flex)' }}
        className="bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] p-2 flex items-center justify-between shrink-0 relative select-none"
      >
          {/* Left Group */}
          <div className="flex items-center">
            <div style={{ width: 'var(--titlebar-left-padding, 0px)' }} className="h-full app-region-drag pointer-events-none self-stretch shrink-0 transition-[width]" />
            <div className="flex items-center gap-2 z-10">
          
          <div className="relative">
            <div className="flex group shadow-sm rounded">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-l text-xs font-medium border border-[var(--app-border-light)] border-r-0 flex items-center gap-2 text-[var(--app-text-secondary)] transition-colors"
              >
                <Music className="w-3.5 h-3.5 text-blue-400" /> {i18n.loadMedia}
              </button>
              <button
                 onClick={() => setLoadMediaDropdownOpen(!loadMediaDropdownOpen)}
                 className="px-1.5 py-1.5 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-r border border-[var(--app-border-light)] text-[var(--app-text-muted)] transition-colors"
              >
                 <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {loadMediaDropdownOpen && (
               <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button 
                    disabled={!audioFileName}
                    onClick={() => { clearMedia(); setLoadMediaDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-400 hover:bg-red-500 hover:text-[var(--app-text-primary)] transition-colors flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> {i18n.clearMedia}
                  </button>
               </div>
            )}
          </div>
          
          <div className="relative">
            <div className="flex group shadow-sm rounded">
              <button 
                onClick={() => lyricInputRef.current?.click()}
                className="px-3 py-1.5 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-l text-xs font-medium border border-[var(--app-border-light)] border-r-0 flex items-center gap-2 text-[var(--app-text-secondary)] transition-colors"
              >
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span> {i18n.loadLyrics}
              </button>
              <button
                 onClick={() => setLoadDropdownOpen(!loadDropdownOpen)}
                 className="px-1.5 py-1.5 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded-r border border-[var(--app-border-light)] text-[var(--app-text-muted)] transition-colors"
              >
                 <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {loadDropdownOpen && (
               <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors" onClick={() => { lyricInputRef.current?.click(); setLoadDropdownOpen(false); }}>
                    {i18n.loadLyrics}
                  </button>
                  <button 
                    disabled={!metadata?.lyric}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors" 
                    onClick={async () => { 
                       if (metadata?.lyric) {
                          if (lines.length > 0) {
                             const confirmed = await dialogs.confirm(i18n.confirmEmbeddedLyrics);
                             if (!confirmed) return;
                          }
                          resetHistory(parseRawLyrics(metadata.lyric)); 
                       }
                       setLoadDropdownOpen(false); 
                    }}
                  >
                    {i18n.loadEmbeddedLyrics}
                  </button>
                  <div className="h-px bg-[var(--app-border-base)] mx-2 my-1" />
                  <button 
                    disabled={lines.length === 0}
                    onClick={() => { clearLyrics(); setLoadDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-400 hover:bg-red-500 hover:text-[var(--app-text-primary)] transition-colors flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> {i18n.clearLyrics}
                  </button>
               </div>
            )}
          </div>

          <div className="h-6 w-px bg-[var(--app-border-base)] mx-1"></div>
          <UndoRedoControls />
        </div>
      </div>
      
      {/* Center items: Title and File Names */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none whitespace-nowrap overflow-hidden px-8 z-0">
        <h1 className="text-sm font-bold tracking-tight uppercase text-[var(--app-text-secondary)]">LRC Maker <span className="text-[var(--app-text-muted)] font-normal italic ml-1">Enhanced</span></h1>
        <div className="text-[10px] text-[var(--app-text-muted)] font-mono mt-0.5 truncate flex items-center justify-center gap-2 max-w-full">
          {audioFileName ? <span>{i18n.audio}: <span className="text-[var(--app-text-secondary)] truncate max-w-[200px] inline-block align-bottom">{audioFileName}</span></span> : <span>{i18n.noAudio}</span>}
          <span className="opacity-50 shrink-0">|</span>
          {lyricFileName ? <span>{i18n.lyrics}: <span className="text-[var(--app-text-secondary)] truncate max-w-[200px] inline-block align-bottom">{lyricFileName}</span></span> : metadata?.lyric ? <span>{i18n.lyrics}: <span className="text-[var(--app-text-secondary)]">{i18n.embeddedTag}</span></span> : <span>{i18n.noLyrics}</span>}
        </div>
      </div>
      
      {/* Right Group */}
      <div className="flex items-center">
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={async () => {
              const val = await dialogs.prompt(i18n.promptShiftTime, '0');
              if (val && !isNaN(parseFloat(val))) {
                 shiftTime(parseFloat(val));
              }
            }}
            className="px-3 py-1.5 bg-[var(--app-border-base)] hover:bg-[var(--app-bg-hover)] rounded text-[10px] shadow-sm uppercase font-bold tracking-widest border border-[var(--app-border-light)] flex items-center text-[var(--app-text-secondary)] transition-colors"
          >
            ± Offset
          </button>
          
          <div className="relative">
             <div className="flex group shadow-sm rounded">
                <button 
                  onClick={() => handleExport(exportFormat)}
                  className="px-3 py-1.5 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black rounded-l text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-transparent"
                >
                  <Download className="w-4 h-4" /> Export .lrc
                </button>
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="px-1.5 py-1.5 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black rounded-r text-xs font-bold uppercase flex items-center transition-colors border border-transparent border-l-black/20"
                >
                   <ChevronDown className="w-3 h-3" />
                </button>
             </div>

             {exportDropdownOpen && (
               <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded shadow-xl z-50 overflow-hidden py-1">
                  <button className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors flex flex-col gap-1" onClick={() => handleExport('standard')}>
                    <span>Standard LRC (Line-by-line)</span>
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] hover:text-black transition-colors flex flex-col gap-1" onClick={() => handleExport('enhanced')}>
                    <span>Enhanced LRC (ESLyric)</span>
                  </button>
               </div>
            )}
          </div>
        </div>
        <div style={{ width: 'var(--titlebar-right-padding, 0px)' }} className="h-full app-region-drag pointer-events-none self-stretch shrink-0 transition-[width]" />
      </div>
    </header>
    </>
  );
}
