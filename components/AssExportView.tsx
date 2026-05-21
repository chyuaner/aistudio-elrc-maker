'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from './EditorProvider';
import { generateAss, AssOptions } from '@/lib/ass-generator';
import { useI18n } from '@/hooks/useI18n';
import { Download } from 'lucide-react';
import JASSUB from 'jassub';

export function AssExportView() {
  const { lines, metadata, lrcMetadata, audioFileName, lyricFileName, duration, fileUrl, playerRef, isPlaying } = useEditor();
  const i18n = useI18n();
  const [assContent, setAssContent] = useState<string>('');
  const [backgroundType, setBackgroundType] = useState<'none' | 'media' | 'image' | 'video'>('media');
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jassubRef = useRef<any>(null);
  
  const [options, setOptions] = useState<AssOptions>({
     fontName: 'Microsoft YaHei',
     fontSize: 60,
     fadeInOutTime: 0.5,
     primaryColor: '00FFFFFF', // White
     secondaryColor: '00FF0000', // Blue
     outlineColor: '00000000', // Black
     titlePrimaryColor: '000000FF', // Red
     titleSecondaryColor: '00FF0000', // Blue
  });

  useEffect(() => {
    // Determine default background
    if (fileUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBackgroundType('media');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBackgroundType('none');
    }
  }, [fileUrl]);

  // Sync loop for local video when using existing media
  useEffect(() => {
      let handle: number;
      const syncFn = () => {
          if (backgroundType === 'media' && videoRef.current && playerRef.current) {
              const local = videoRef.current;
              const global = playerRef.current;
              if (Math.abs(local.currentTime - global.currentTime) > 0.1) {
                  local.currentTime = global.currentTime;
              }
              if (global.paused && !local.paused) {
                  local.pause();
              } else if (!global.paused && local.paused) {
                  local.play().catch(()=>{});
              }
          }
          handle = requestAnimationFrame(syncFn);
      };
      
      handle = requestAnimationFrame(syncFn);
      return () => cancelAnimationFrame(handle);
  }, [backgroundType, playerRef]);

  useEffect(() => {
    if (!jassubRef.current && canvasRef.current) {
        import('jassub').then((JASSUBModule) => {
           try {
               const JASSUB = JASSUBModule.default;
               
               // Use only canvas to avoid video width NaN issues, and manually sync time.
               jassubRef.current = new JASSUB({
                  canvas: canvasRef.current!,
                  workerUrl: '/jassub/jassub-worker.js',
                  wasmUrl: '/jassub/jassub-worker.wasm',
                  subContent: assContent || '[Script Info]\nPlayResX: 1920\nPlayResY: 1080\n',
                  defaultFont: 'sans-serif',
                  debug: true
               });
               
               if (assContent) {
                  jassubRef.current.ready.then(() => {
                      jassubRef.current.setTrack(assContent);
                  }).catch(console.error);
               }

               // Manual sync loop driven by requestAnimationFrame.
               // Syncs Jassub exclusively to the local video OR global player time.
               let lastTime = performance.now();
               let mediaTime = 0;
               const loop = (now: number) => {
                   if (!jassubRef.current) return;
                   
                   // Determine time source: if global player exists use its time.
                   // If we are playing a video, use video's time.
                   // Otherwise fallback to basic delta time.
                   if (playerRef.current) {
                       mediaTime = playerRef.current.currentTime;
                   } else if (videoRef.current && videoRef.current.src && videoRef.current.readyState > 0) {
                       mediaTime = videoRef.current.currentTime;
                   } else {
                       const dt = (now - lastTime) / 1000;
                       mediaTime += dt;
                   }
                   lastTime = now;
                   
                   const c = canvasRef.current;
                   if (c && c.clientWidth > 0 && c.clientHeight > 0) {
                       jassubRef.current.manualRender({
                           mediaTime: mediaTime,
                           width: c.clientWidth,
                           height: c.clientHeight
                       }).catch((e: any) => {
                           // Ignore render drops or busy errors gracefully
                       });
                   }
                   jassubRef.current._animationFrameId = requestAnimationFrame(loop);
               };
               jassubRef.current._animationFrameId = requestAnimationFrame(loop);
               
           } catch (err) {
               console.error("Failed to load jassub resources", err);
           }
        }).catch(err => console.error("Failed to load jassub", err));
    }
    
    return () => {
       if (jassubRef.current) {
           if (jassubRef.current._animationFrameId) {
               cancelAnimationFrame(jassubRef.current._animationFrameId);
           }
           jassubRef.current.destroy();
           jassubRef.current = null;
       }
    };
  }, []);

  useEffect(() => {
    let ass = generateAss(lines, lrcMetadata, metadata, options);
    
    // For testing and ensuring it renders SOMETHING, append the user-provided robust TEST dialogue
    // (Jassub requires correct headers like ScriptType: v4.00+ which our generator should have,
    // but just in case, we will inject a fallback complete test script if lines are empty)

    if (lines.length === 0) {
        ass = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Arial,60,&H000000FF,&H0000FFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,5,30,30,30,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
Dialogue: 0,0:00:00.00,9:59:59.99,Default,,0,0,0,,JASSUB TEST - NO LYRICS
`;
    } else {
        ass += `\nDialogue: 0,0:00:00.00,9:59:59.99,Default,,0,0,0,,{\\pos(960,540)\\an5\\fs150\\1c&H0000FF&\\3c&HFFFFFF&\\3a&H00&\\bord10}ASS TEST RENDERER WORKING\n`;
    }
    
    setAssContent(ass);
    if (jassubRef.current) {
        if (jassubRef.current.ready) {
            jassubRef.current.ready.then(() => {
                try {
                    jassubRef.current.setTrack(ass);
                } catch (e) {
                    console.error("Failed to setTrack: ", e);
                }
            });
        }
    }
  }, [lines, lrcMetadata, metadata, options]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--app-bg-base)]">
        <div className="p-4 border-b border-[var(--app-border-base)] flex items-center justify-between shrink-0">
           <h2 className="text-sm font-bold border-l-4 border-[var(--app-accent)] pl-2 text-[var(--app-text-primary)]">.ass KTV字幕 (逐字同步) 輸出預覽</h2>
           <button onClick={() => {
              const blob = new Blob([assContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const defaultName = audioFileName ? audioFileName.replace(/\.[^/.]+$/, "") + ".ass" : "lyrics.ass";
              a.download = defaultName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
           }} className="flex items-center gap-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black px-4 py-2 rounded font-bold text-xs">
              <Download className="w-4 h-4" /> 下載 .ass檔
           </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
            {/* Left settings panel */}
            <div className="w-64 border-r border-[var(--app-border-base)] bg-[var(--app-bg-panel)] flex flex-col overflow-y-auto">
               <div className="p-4 space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">背景模式</label>
                    <select value={backgroundType} onChange={e => {
                       setBackgroundType(e.target.value as any);
                       if (e.target.value === 'none' || e.target.value === 'media') {
                          setCustomMediaUrl(null);
                       }
                    }} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded px-2 py-1 outline-none focus:border-[var(--app-accent)] mb-2">
                       <option value="none">無背景</option>
                       <option value="media">現有已載入的媒體 (如果有)</option>
                       <option value="video">別的影片當背景 (靜音)</option>
                       <option value="image">單張圖片</option>
                    </select>
                    {(backgroundType === 'video' || backgroundType === 'image') && (
                        <input 
                           type="file" 
                           accept={backgroundType === 'video' ? "video/*" : "image/*"}
                           onChange={(e) => {
                               const f = e.target.files?.[0];
                               if (f) setCustomMediaUrl(URL.createObjectURL(f));
                           }}
                           className="w-full text-xs"
                        />
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Fade In/Out (s)</label>
                    <input type="number" step="0.1" value={options.fadeInOutTime} onChange={e => setOptions({...options, fadeInOutTime: parseFloat(e.target.value)})} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded px-2 py-1 outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">字體名稱</label>
                    <input type="text" value={options.fontName} onChange={e => setOptions({...options, fontName: e.target.value})} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded px-2 py-1 outline-none" />
                  </div>
                  {/* Colors */}
                  <div>
                    <label className="block text-gray-400 mb-1">已唱顏色 (Primary - BGRHex)</label>
                    <input type="text" value={options.primaryColor} onChange={e => setOptions({...options, primaryColor: e.target.value})} className="w-full font-mono bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded px-2 py-1 outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">未唱顏色 (Secondary - BGRHex)</label>
                    <input type="text" value={options.secondaryColor} onChange={e => setOptions({...options, secondaryColor: e.target.value})} className="w-full font-mono bg-[var(--app-bg-input)] border border-[var(--app-border-base)] rounded px-2 py-1 outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">間奏 Logo (預留用, 暫無功能)</label>
                    <input type="file" accept="image/*" className="w-full text-xs" />
                  </div>
               </div>
            </div>
            
            {/* Center preview */}
            <div className="flex-1 flex flex-col p-4">
                <div ref={containerRef} className="aspect-video bg-black rounded shadow overflow-hidden relative mx-auto mb-4 border border-[var(--app-border-base)] flex items-center justify-center max-h-[50vh] w-full max-w-4xl">
                   {backgroundType === 'image' && customMediaUrl && (
                      <img src={customMediaUrl} alt="Background" className="absolute inset-0 w-full h-full object-contain" />
                   )}
                   <video 
                     ref={videoRef}
                     src={backgroundType === 'video' ? customMediaUrl || undefined : (fileUrl || undefined)} 
                     className="absolute inset-0 w-full h-full z-10"
                     controls={backgroundType === 'video'}
                     muted={backgroundType === 'video' || backgroundType === 'media'}
                     style={{ opacity: (backgroundType === 'none' || backgroundType === 'image') ? 0 : 1 }}
                     autoPlay
                     loop
                   />
                   <canvas
                     ref={canvasRef}
                     className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                   />
                </div>
                
                <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">.ass RAW Content</h3>
                <textarea 
                  className="flex-1 w-full bg-[#1e1e1e] border border-[var(--app-border-base)] rounded p-2 text-xs font-mono text-gray-200 resize-none outline-none focus:border-[var(--app-accent)]"
                  readOnly
                  value={assContent}
                />
            </div>
        </div>
    </div>
  );
}
