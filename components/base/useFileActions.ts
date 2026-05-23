import { useCallback, useRef, useEffect } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { parseRawLyrics, exportLrc, exportSrt } from '@/lib/lyric-utils';
import { extractFlacMetadata } from '@/lib/media-utils';
import { useDialogs } from '@/components/dialog/DialogProvider';

export function useFileActions() {
  const {
    lines, resetHistory, setFile, setMetadata, setAudioSpecs, setIsPlaying, playerRef,
    setDuration, setPlaybackRate, setLyricFileName, setLrcMetadata, lrcMetadata,
    duration, file, lyricFileName, audioFileName, commitLines,
    autoLoadLyrics, showToast
  } = useEditor();
  const dialogs = useDialogs();

  const processAudioFile = useCallback(async (f: File) => {
    setIsPlaying(false);
    if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.currentTime = 0;
    }
    setDuration(0);
    setPlaybackRate(1.0);
    setFile(f);
    if (autoLoadLyrics) {
      resetHistory([]);
      setLyricFileName(null);
    }
    
    import('music-metadata').then(async (mm) => {
      try {
        const parsedMetadata = await mm.parseBlob(f);
        setAudioSpecs({
          format: parsedMetadata.format?.container || f.name.split('.').pop()?.toUpperCase(),
          bitrate: parsedMetadata.format?.bitrate ? Math.round(parsedMetadata.format.bitrate / 1000).toString() : undefined,
          sampleRate: parsedMetadata.format?.sampleRate?.toString(),
          bitsPerSample: parsedMetadata.format?.bitsPerSample?.toString()
        });
      } catch (e) {
        setAudioSpecs({ format: f.name.split('.').pop()?.toUpperCase() });
      }
    }).catch(() => {
        setAudioSpecs({ format: f.name.split('.').pop()?.toUpperCase() });
    });
    
    if (f.name.toLowerCase().endsWith('.flac') && typeof window !== 'undefined') {
       try {
          const slice = f.slice(0, 20 * 1024 * 1024);
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
             if (foundLyrics && autoLoadLyrics) {
                 setLyricFileName('Embedded Tag');
                 const parsed = parseRawLyrics(foundLyrics);
                 setLrcMetadata(parsed.metadata);
                 resetHistory(parsed.lines);
                 showToast('已從 "Embedded Tag" 載入歌詞');
             }
             return;
          }
       } catch (e) {
          console.error(e);
       }
    }

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
           
           if (foundLyrics && autoLoadLyrics) {
               setLyricFileName('Embedded Tag');
               const parsed = parseRawLyrics(foundLyrics);
               setLrcMetadata(parsed.metadata);
               resetHistory(parsed.lines);
               showToast('已從 "Embedded Tag" 載入歌詞');
           }
        },
        onError: function(error: any) {
          console.log('No ID3 tags or error', error);
          setMetadata(null);
        }
      });
    }
  }, [resetHistory, setFile, setLyricFileName, setMetadata, setAudioSpecs, setIsPlaying, playerRef, setDuration, setPlaybackRate, setLrcMetadata, autoLoadLyrics, showToast]);

  const processLyricFile = useCallback(async (f: File) => {
    if (lines.length > 0) {
      const confirmed = await dialogs.confirm('載入新的歌詞檔案將會覆蓋目前的歌詞。確定要繼續嗎？');
      if (!confirmed) return;
    }
    setLyricFileName(f.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseRawLyrics(text);
      setLrcMetadata(parsed.metadata);
      resetHistory(parsed.lines);
      showToast(`已從 "${f.name}" 載入歌詞`);
    };
    reader.readAsText(f);
  }, [lines.length, dialogs, resetHistory, setLyricFileName, setLrcMetadata, showToast]);

  const handleExport = useCallback(async (format: 'standard' | 'enhanced' | 'simple' | 'srt', saveType: 'file' | 'embedded' = 'file') => {
    if (lines.length === 0) return;
    
    let lrcText = '';
    if (format === 'srt') {
        lrcText = exportSrt(lines, duration);
    } else {
        lrcText = exportLrc(lines, lrcMetadata, format === 'enhanced', format === 'simple');
    }

    let defaultName = 'lyrics.lrc';
    if (lyricFileName && lyricFileName !== 'Embedded Tag' && lyricFileName !== 'New Lyrics') {
        defaultName = lyricFileName;
    } else if (audioFileName) {
        defaultName = audioFileName.replace(/\.[^/.]+$/, "") + ".lrc";
    }

    if (format === 'simple') {
        defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".txt";
    } else if (format === 'srt') {
        defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".srt";
    }

    const isTauri = typeof window !== 'undefined' && ((window as any).__TAURI__);
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    if (isTauri) {
        try {
            if (saveType === 'embedded' && file) {
                const lowerName = file.name.toLowerCase();
                if (lowerName.endsWith('.flac') || lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4')) {
                    const arrayBuffer = await file.arrayBuffer();
                    let blob: Blob;
                    if (lowerName.endsWith('.flac')) {
                        const { embedLyricsIntoFlac } = await import('@/lib/flac-utils');
                        blob = embedLyricsIntoFlac(arrayBuffer, lrcText, format === 'enhanced');
                    } else {
                        const { embedLyricsIntoM4a } = await import('@/lib/m4a-utils');
                        blob = embedLyricsIntoM4a(arrayBuffer, lrcText, format === 'enhanced');
                    }
                    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
                    await (window as any).__TAURI__.core.invoke('save_binary_dialog', {
                        bytes,
                        defaultName: file.name,
                    });
                }
            } else {
                await (window as any).__TAURI__.core.invoke('save_lyrics_dialog', {
                    lyricsText: lrcText,
                    defaultName: defaultName,
                    format: format,
                });
            }
        } catch (err) {
            console.error("Tauri save dialog failed", err);
        }
    } else if (isCapacitor) {
        try {
            const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
            const { Share } = await import('@capacitor/share');

            if (saveType === 'embedded' && file) {
                const lowerName = file.name.toLowerCase();
                if (lowerName.endsWith('.flac') || lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4')) {
                    const arrayBuffer = await file.arrayBuffer();
                    let blob: Blob;
                    if (lowerName.endsWith('.flac')) {
                        const { embedLyricsIntoFlac } = await import('@/lib/flac-utils');
                        blob = embedLyricsIntoFlac(arrayBuffer, lrcText, format === 'enhanced');
                    } else {
                        const { embedLyricsIntoM4a } = await import('@/lib/m4a-utils');
                        blob = embedLyricsIntoM4a(arrayBuffer, lrcText, format === 'enhanced');
                    }

                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = async () => {
                        try {
                            const base64data = (reader.result as string).split(',')[1];
                            const writeResult = await Filesystem.writeFile({
                                path: file.name,
                                data: base64data,
                                directory: Directory.Cache,
                            });
                            await Share.share({
                                title: file.name,
                                url: writeResult.uri,
                            });
                        } catch (e) {
                            console.error("Capacitor write/share embedded file failed", e);
                            alert("無法嵌入並儲存媒體檔案");
                        }
                    };
                }
            } else {
                const writeResult = await Filesystem.writeFile({
                    path: defaultName,
                    data: lrcText,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                });
                await Share.share({
                    title: defaultName,
                    url: writeResult.uri,
                });
            }
        } catch (err) {
            console.error("Capacitor save/share failed", err);
            alert("儲存檔案失敗: " + (err as Error).message);
        }
      } else {
       if (saveType === 'embedded' && file) {
             const lowerName = file.name.toLowerCase();
             if (lowerName.endsWith('.flac') || lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4')) {
                 try {
                     const arrayBuffer = await file.arrayBuffer();
                     let blob: Blob;
                     if (lowerName.endsWith('.flac')) {
                         const { embedLyricsIntoFlac } = await import('@/lib/flac-utils');
                         blob = embedLyricsIntoFlac(arrayBuffer, lrcText, format === 'enhanced');
                     } else {
                         const { embedLyricsIntoM4a } = await import('@/lib/m4a-utils');
                         blob = embedLyricsIntoM4a(arrayBuffer, lrcText, format === 'enhanced');
                     }
                     
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = file.name;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(url);
                 } catch (e) {
                     console.error(e);
                     alert("Failed to embed lyrics into media file");
                 }
                 return;
             }
        }
        
        const blob = new Blob([lrcText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  }, [lines, lyricFileName, audioFileName, lrcMetadata, file, duration]);

  const clearMedia = useCallback(async () => {
    if (audioFileName) {
      if (await dialogs.confirm('確定要清除目前的媒體檔案嗎？')) {
        setFile(null);
        setMetadata(null);
        resetHistory([]);
        setLyricFileName(null);
        setAudioSpecs(null);
      }
    }
  }, [audioFileName, setFile, setMetadata, resetHistory, setLyricFileName, setAudioSpecs, dialogs]);

  const clearLyrics = useCallback(async () => {
    if (lines.length > 0) {
      if (await dialogs.confirm('確定要清除目前的歌詞嗎？')) {
        commitLines([], 'Clear Lyrics');
        setLyricFileName(null);
      }
    }
  }, [lines.length, commitLines, setLyricFileName, dialogs]);

  const loadEmbeddedLyrics = useCallback(async (metadata: any) => {
    if (metadata?.lyric) {
       if (lines.length > 0) {
           const confirmed = await dialogs.confirm('載入內嵌歌詞將會覆蓋目前的歌詞。確定要繼續嗎？');
           if (!confirmed) return;
       }
       const parsed = parseRawLyrics(metadata.lyric);
       setLrcMetadata(parsed.metadata);
       resetHistory(parsed.lines);
       setLyricFileName('Embedded Tag');
       showToast('已從 "Embedded Tag" 載入歌詞');
    }
  }, [lines.length, dialogs, setLrcMetadata, resetHistory, setLyricFileName, showToast]);

  return { processAudioFile, processLyricFile, handleExport, clearMedia, clearLyrics, loadEmbeddedLyrics };
}
