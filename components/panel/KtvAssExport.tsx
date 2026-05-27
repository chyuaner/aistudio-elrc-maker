'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { generateAss, AssOptions } from '@/lib/ass-generator';
import { Download, SlidersHorizontal, Settings2, Image as ImageIcon } from 'lucide-react';
import { RawTextDisplay } from '@/components/panel/RawTextDisplay';
import { formatTime, parseSeconds } from '@/lib/lyric-utils';

export function KtvAssExport() {
  const { lines, lrcMetadata, commitLrcMetadata, audioFileName, dualLineGapSec, setDualLineGapSec, metadata, showToast, playerRef, fileUrl, duration } = useEditor();
  
  // 檢查是否有自訂歌曲開始資訊的時間戳 (TT / TTE)
  const initialTT = lrcMetadata.TT || lrcMetadata.tt;
  const initialTTE = lrcMetadata.TTE || lrcMetadata.tte;
  const hasCustomTime = !!initialTT;
  const parsedStart = hasCustomTime ? (parseSeconds(initialTT) || 1) : 1;
  const parsedEnd = initialTTE ? (parseSeconds(initialTTE) || (parsedStart + 6)) : (parsedStart + 6);

  const [options, setOptions] = useState<Omit<AssOptions, 'interludeThreshold' | 'fadeInOutTime'>>({
    primaryColor: '#0000FF', // Blue
    color2: '#FF0000', // Red
    color3: '#800080', // Purple
    chorusColor: '#008000', // Green
    fontFamily: '微软雅黑',
    fontSize: 135, // Default for BottomLeft
    infoFontSize: 85, // Default for CenterInfo (song info, fontSize - 40)
    infoTitleFontSize: 125, // Default for red Title (fontSize - 10)
    songInfoTitle: lrcMetadata.kti || lrcMetadata.ti || '',
    songInfoArtist: lrcMetadata.kar || lrcMetadata.ar || '',
    songInfoAlbum: lrcMetadata.kal || lrcMetadata.al || '',
    songInfoCustom: lrcMetadata.ko || '',
    customStartInfoTime: hasCustomTime,
    startInfoStartTime: parsedStart,
    startInfoEndTime: parsedEnd,
    dualRowSpacing: 160,
    dualRowMarginL: 160,
    dualRowMarginR: 160,
    dualRowMarginV: 65,
    nextTriggerIndex: 1,
    row2FadeoutMode: 'immediate',
    interludeBuffer: 1.0,
    playResX: 1920,
    playResY: 1080,
    simulatedOutlineWidth: 3,
  });

  // 在掛載時載入 localStorage 中的使用者自訂樣式設定 (透過 useEffect 避免 Next.js Hydration Mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ktv_ass_export_options');
        if (saved) {
          const parsed = JSON.parse(saved);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setOptions(prev => ({
            ...prev,
            ...parsed
          }));
        }
      } catch (e) {
        console.error('Failed to load ASS options from localStorage', e);
      }
    }
  }, []);

  // 持久化 options 中的渲染樣式設定至 localStorage 
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const styleOptionsOnly = {
          primaryColor: options.primaryColor,
          color2: options.color2,
          color3: options.color3,
          chorusColor: options.chorusColor,
          fontFamily: options.fontFamily,
          fontSize: options.fontSize,
          infoFontSize: options.infoFontSize,
          infoTitleFontSize: options.infoTitleFontSize,
          dualRowSpacing: options.dualRowSpacing,
          dualRowMarginL: options.dualRowMarginL,
          dualRowMarginR: options.dualRowMarginR,
          dualRowMarginV: options.dualRowMarginV,
          row2FadeoutMode: options.row2FadeoutMode,
          interludeBuffer: options.interludeBuffer,
          playResX: options.playResX,
          playResY: options.playResY,
          simulatedOutlineWidth: options.simulatedOutlineWidth,
        };
        localStorage.setItem('ktv_ass_export_options', JSON.stringify(styleOptionsOnly));
      } catch (e) {
        console.error('Failed to save ASS options to localStorage', e);
      }
    }
  }, [
    options.primaryColor,
    options.color2,
    options.color3,
    options.chorusColor,
    options.fontFamily,
    options.fontSize,
    options.infoFontSize,
    options.infoTitleFontSize,
    options.dualRowSpacing,
    options.dualRowMarginL,
    options.dualRowMarginR,
    options.dualRowMarginV,
    options.row2FadeoutMode,
    options.interludeBuffer,
    options.playResX,
    options.playResY,
    options.simulatedOutlineWidth
  ]);

  // 當 Lrc 內部的中繼資料被更新時，將歌名、歌手、專輯與自訂欄位同步至 options，確保資料即時更新且不遺失自定義渲染樣式
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(prev => {
      const metadataTitle = lrcMetadata.kti || lrcMetadata.ti || '';
      const metadataArtist = lrcMetadata.kar || lrcMetadata.ar || '';
      const metadataAlbum = lrcMetadata.kal || lrcMetadata.al || '';
      const metadataCustom = lrcMetadata.ko || '';
      
      if (
        prev.songInfoTitle !== metadataTitle ||
        prev.songInfoArtist !== metadataArtist ||
        prev.songInfoAlbum !== metadataAlbum ||
        prev.songInfoCustom !== metadataCustom
      ) {
        return {
          ...prev,
          songInfoTitle: metadataTitle,
          songInfoArtist: metadataArtist,
          songInfoAlbum: metadataAlbum,
          songInfoCustom: metadataCustom,
        };
      }
      return prev;
    });
  }, [lrcMetadata.kti, lrcMetadata.ti, lrcMetadata.kar, lrcMetadata.ar, lrcMetadata.kal, lrcMetadata.al, lrcMetadata.ko]);

  const [detectedVideo, setDetectedVideo] = useState<{ width: number, height: number } | null>(null);

  // 自動偵測當前載入影片的原始解析度
  useEffect(() => {
    let active = true;
    const checkResolution = () => {
      if (!active) return;
      const videoElement = playerRef?.current as HTMLVideoElement | null;
      if (videoElement && videoElement.tagName === 'VIDEO') {
        const w = videoElement.videoWidth;
        const h = videoElement.videoHeight;
        if (w > 0 && h > 0) {
          if (!detectedVideo || detectedVideo.width !== w || detectedVideo.height !== h) {
            setDetectedVideo({ width: w, height: h });
            setOptions(o => {
              if (o.playResX !== w || o.playResY !== h) {
                return {
                  ...o,
                  playResX: w,
                  playResY: h,
                };
              }
              return o;
            });
            showToast(`已自動偵測影片解析度：${w} x ${h}`);
          }
        }
      } else {
        if (detectedVideo !== null) {
          setDetectedVideo(null);
        }
      }
    };

    // 1. 立即檢查一次
    checkResolution();

    // 2. 設定一個 300 毫秒的 interval 進行輪詢，確保能在第 1 時間即時更新
    const timer = setInterval(checkResolution, 300);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [playerRef, showToast, fileUrl, duration, detectedVideo]);

  const assContent = useMemo(() => {
    return generateAss(lines, lrcMetadata, { ...options, interludeThreshold: dualLineGapSec, fadeInOutTime: 0.5 });
  }, [lines, lrcMetadata, options, dualLineGapSec]);

  const handleDownload = () => {
    const blob = new Blob([assContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create base filename from audio or metadata
    const baseName = audioFileName ? audioFileName.replace(/\.[^/.]+$/, "") : (lrcMetadata.ti || 'KTV');
    link.download = `${baseName}.ass`;
    document.body.appendChild(link);
    link.click();
    
    // Use requestAnimationFrame to ensure it's removed after browser has processed click
    requestAnimationFrame(() => {
        if (document.body.contains(link)) {
            document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
    });
  };
  
  const handleImportFromTags = () => {
     const title = metadata?.title || metadata?.rawTags?.TITLE || metadata?.rawTags?.title || '';
     const artist = metadata?.artist || metadata?.rawTags?.ARTIST || metadata?.rawTags?.artist || '';
     const album = metadata?.album || metadata?.rawTags?.ALBUM || metadata?.rawTags?.album || '';
     const updated = {
       ...options,
       songInfoTitle: title,
       songInfoArtist: artist,
       songInfoAlbum: album
     };
     setOptions(updated);
     syncToLrcMetadata(updated);
     showToast('已從音檔標籤匯入資訊');
  };
  
  const handleImportFromLrc = () => {
     const title = lrcMetadata.ti || '';
     const artist = lrcMetadata.ar || '';
     const album = lrcMetadata.al || '';
     const updated = {
       ...options,
       songInfoTitle: title,
       songInfoArtist: artist,
       songInfoAlbum: album
     };
     setOptions(updated);
     syncToLrcMetadata(updated);
     showToast('已從 LRC 屬性匯入資訊');
  };

  const lastCommittedMetaRef = useRef<any>(null);

  const syncToLrcMetadata = (newOptions: typeof options) => {
    const updatedMeta = { ...lrcMetadata };
    if (newOptions.customStartInfoTime) {
      updatedMeta.TT = formatTime(newOptions.startInfoStartTime, true);
      const isExactly6s = Math.abs(newOptions.startInfoEndTime - (newOptions.startInfoStartTime + 6)) < 0.005;
      if (isExactly6s) {
        delete updatedMeta.TTE;
        delete updatedMeta.tte;
      } else {
        updatedMeta.TTE = formatTime(newOptions.startInfoEndTime, true);
      }
    } else {
      delete updatedMeta.TT;
      delete updatedMeta.tt;
      delete updatedMeta.TTE;
      delete updatedMeta.tte;
    }

    // 同步自訂歌曲資訊欄位 (kti, kar, kal, ko)
    if (newOptions.songInfoTitle !== undefined) {
      updatedMeta.kti = newOptions.songInfoTitle;
    }
    if (newOptions.songInfoArtist !== undefined) {
      updatedMeta.kar = newOptions.songInfoArtist;
    }
    if (newOptions.songInfoAlbum !== undefined) {
      updatedMeta.kal = newOptions.songInfoAlbum;
    }
    if (newOptions.songInfoCustom !== undefined) {
      updatedMeta.ko = newOptions.songInfoCustom;
    }

    lastCommittedMetaRef.current = updatedMeta;
    commitLrcMetadata(updatedMeta, 'Update Custom KTV Info and Times');
  };

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  // 當外部/內部 options 時間改變時，同步其字串格式至精準格式 mm:ss.mmm
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartInput(formatTime(options.startInfoStartTime, true));
  }, [options.startInfoStartTime]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndInput(formatTime(options.startInfoEndTime, true));
  }, [options.startInfoEndTime]);

  const parsePreciseTimeString = (val: string): number | null => {
    const regex = /^(\d+):(\d{1,2})(?:\.(\d+))?$/;
    const m = val.trim().match(regex);
    if (m) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const msStr = m[3] || '0';
      const ms = parseFloat(`0.${msStr}`);
      return min * 60 + sec + ms;
    }
    const secValue = parseFloat(val.trim());
    if (!isNaN(secValue) && !val.includes(':')) {
      return secValue;
    }
    return null;
  };

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartInput(val);
    
    const parsed = parsePreciseTimeString(val);
    if (parsed !== null) {
      const newEnd = Number((parsed + 6).toFixed(3));
      const updated = {
        ...options,
        startInfoStartTime: parsed,
        startInfoEndTime: newEnd
      };
      setOptions(updated);
      syncToLrcMetadata(updated);
    }
  };

  const handleStartInputBlur = () => {
    const parsed = parsePreciseTimeString(startInput);
    if (parsed !== null) {
      const newEnd = Number((parsed + 6).toFixed(3));
      const updated = {
        ...options,
        startInfoStartTime: parsed,
        startInfoEndTime: newEnd
      };
      setOptions(updated);
      syncToLrcMetadata(updated);
    } else {
      setStartInput(formatTime(options.startInfoStartTime, true));
    }
  };

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndInput(val);
    
    const parsed = parsePreciseTimeString(val);
    if (parsed !== null) {
      const updated = {
        ...options,
        startInfoEndTime: parsed
      };
      setOptions(updated);
      syncToLrcMetadata(updated);
    }
  };

  const handleEndInputBlur = () => {
    const parsed = parsePreciseTimeString(endInput);
    if (parsed !== null) {
      const updated = {
        ...options,
        startInfoEndTime: parsed
      };
      setOptions(updated);
      syncToLrcMetadata(updated);
    } else {
      setEndInput(formatTime(options.startInfoEndTime, true));
    }
  };

  // Sync state if metadata changed externally and we haven't touched it yet, or clear on lyrics close
  useEffect(() => {
    if (lastCommittedMetaRef.current === lrcMetadata) return;

    if (lines.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions(o => ({
        ...o,
        songInfoTitle: '',
        songInfoArtist: '',
        songInfoAlbum: '',
        songInfoCustom: '',
        customStartInfoTime: false,
        startInfoStartTime: 1,
        startInfoEndTime: 7,
      }));
    } else {
      const extTT = lrcMetadata.TT || lrcMetadata.tt;
      const extTTE = lrcMetadata.TTE || lrcMetadata.tte;
      const hasExtCustom = !!extTT;
      const extStart = hasExtCustom ? (parseSeconds(extTT) || 1) : 1;
      const extEnd = extTTE ? (parseSeconds(extTTE) || (extStart + 6)) : (extStart + 6);

      // 歌曲資訊完全「不要」自動從預設的LRC標籤(ti, ar, al)匯入，只在明確設定了專用屬性(kti, kar, kal)時才讀取
      // 如此一來可完美支援使用者刻意將主唱與專輯留空的需求
      const loadedTitle = lrcMetadata.kti !== undefined ? lrcMetadata.kti : '';
      const loadedArtist = lrcMetadata.kar !== undefined ? lrcMetadata.kar : '';
      const loadedAlbum = lrcMetadata.kal !== undefined ? lrcMetadata.kal : '';
      const loadedCustom = lrcMetadata.ko !== undefined ? lrcMetadata.ko : '';

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions(o => ({
        ...o,
        songInfoTitle: loadedTitle,
        songInfoArtist: loadedArtist,
        songInfoAlbum: loadedAlbum,
        songInfoCustom: loadedCustom,
        customStartInfoTime: hasExtCustom,
        startInfoStartTime: extStart,
        startInfoEndTime: extEnd,
      }));
    }
  }, [lines.length, lrcMetadata, lrcMetadata.ti, lrcMetadata.ar, lrcMetadata.al, lrcMetadata.kti, lrcMetadata.kar, lrcMetadata.kal, lrcMetadata.ko, lrcMetadata.TT, lrcMetadata.TTE, lrcMetadata.tt, lrcMetadata.tte]);

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-main)] overflow-hidden">
      
      {/* Settings / Toolbar Panel */}
      <div className="shrink-0 p-4 bg-[var(--app-bg-base)] border-b border-[var(--app-border-base)] flex flex-col gap-4 overflow-y-auto max-h-[50vh]">
          <div className="text-xs text-[var(--app-text-secondary)]">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Left Column */}
                <div className="flex flex-col gap-5">
                    {/* 字體設定 */}
                    <div className="flex flex-col gap-1.5">
                       <label className="font-semibold text-[var(--app-text-primary)] text-xs">字體設定</label>
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-[var(--app-text-secondary)] w-16 shrink-0">字型與大小:</span>
                             <input type="text" value={options.fontFamily} onChange={e => setOptions({...options, fontFamily: e.target.value})} className="flex-1 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)]" />
                             <input type="number" value={options.fontSize} onChange={e => {
                                 const newSize = parseInt(e.target.value) || 120;
                                 const diff = newSize - options.fontSize;
                                 setOptions({
                                   ...options,
                                   fontSize: newSize,
                                   infoFontSize: (options.infoFontSize || 110) + diff,
                                   infoTitleFontSize: (options.infoTitleFontSize || 140) + diff
                                 });
                              }} className="w-16 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" title="Font Size" />
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                             <div className="flex items-center gap-1.5 flex-1 min-w-[80px]">
                                <span className="text-[10px] text-[var(--app-text-secondary)] whitespace-nowrap">描邊粗細:</span>
                                <input type="number" min="0" max="15" value={options.simulatedOutlineWidth !== undefined ? options.simulatedOutlineWidth : 3} onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    setOptions({ ...options, simulatedOutlineWidth: val });
                                 }} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" />
                             </div>

                             <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                                <span className="text-[10px] text-[var(--app-text-secondary)] whitespace-nowrap">標題大小:</span>
                                <input type="number" value={options.infoTitleFontSize || 140} onChange={e => {
                                    const val = parseInt(e.target.value) || 140;
                                    setOptions({ ...options, infoTitleFontSize: val });
                                 }} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" />
                             </div>
                             
                             <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                                <span className="text-[10px] text-[var(--app-text-secondary)] whitespace-nowrap">內文大小:</span>
                                <input type="number" value={options.infoFontSize || 110} onChange={e => {
                                    const val = parseInt(e.target.value) || 110;
                                    setOptions({ ...options, infoFontSize: val });
                                 }} className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" />
                             </div>
                          </div>
                       </div>
                       <p className="text-[10px] text-[var(--app-text-muted)]">字體外框皆固定從反（白字體配黑框，彩字體配白框）。</p>
                    </div>

                    {/* 視訊尺寸與 ASS 比例設定 */}
                    <div className="flex flex-col gap-1.5 bg-[var(--app-bg-input)] p-3 border border-[var(--app-border-light)] rounded">
                       <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="font-semibold text-[var(--app-text-primary)] text-xs">視訊尺寸與 ASS 比例設定</label>
                          {detectedVideo && (
                             <button
                                type="button"
                                onClick={() => {
                                   const v = { videoWidth: detectedVideo.width, videoHeight: detectedVideo.height };
                                   setOptions({
                                      ...options,
                                      playResX: v.videoWidth,
                                      playResY: v.videoHeight,
                                   });
                                   showToast(`已套用影片原始比例：${v.videoWidth} x ${v.videoHeight}`);
                                }}
                                className="text-[10px] text-[var(--app-accent)] hover:underline font-medium flex items-center gap-1 bg-[var(--app-bg-base)] border border-[var(--app-border-light)] rounded px-2 py-0.5"
                             >
                                🎯 套用影片原始大小 ({detectedVideo.width}x{detectedVideo.height})
                             </button>
                          )}
                       </div>
                       
                       <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="flex flex-col gap-1 col-span-3 sm:col-span-1">
                             <span className="text-[10px] text-[var(--app-text-muted)] font-medium">比例預設值</span>
                             <select
                                value={
                                   (options.playResX === 1920 && options.playResY === 1080) ? '1920x1080' :
                                   (options.playResX === 1280 && options.playResY === 720) ? '1280x720' :
                                   (options.playResX === 1440 && options.playResY === 1080) ? '1440x1080' :
                                   (options.playResX === 960 && options.playResY === 720) ? '960x720' :
                                   (options.playResX === 2560 && options.playResY === 1080) ? '2560x1080' : 'custom'
                                }
                                onChange={e => {
                                   const val = e.target.value;
                                   if (val === 'custom') return;
                                   const [w, h] = val.split('x').map(Number);
                                   setOptions({
                                      ...options,
                                      playResX: w,
                                      playResY: h
                                   });
                                }}
                                className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs"
                             >
                                <option value="1920x1080">16:9 FHD (1920 x 1080)</option>
                                <option value="1280x720">16:9 HD (1280 x 720)</option>
                                <option value="1440x1080">4:3 FHD (1440 x 1080)</option>
                                <option value="960x720">4:3 Standard (960 x 720)</option>
                                <option value="2560x1080">21:9 UltraWide (2560 x 1080)</option>
                                <option value="custom">自訂比例大小</option>
                             </select>
                          </div>
                          
                          <div className="flex flex-col gap-1 col-span-3 sm:col-span-1">
                             <span className="text-[10px] text-[var(--app-text-muted)] font-medium font-semibold">寬度 (PlayResX)</span>
                             <div className="relative">
                                <input
                                   type="number"
                                   value={options.playResX || 1920}
                                   onChange={e => {
                                      const w = parseInt(e.target.value) || 1920;
                                      setOptions({ ...options, playResX: w });
                                   }}
                                   className="w-full bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 pr-6 focus:outline-none focus:border-[var(--app-accent)] text-xs font-mono"
                                />
                                <span className="absolute right-2 top-1.5 text-[9px] text-[var(--app-text-muted)] font-mono">px</span>
                             </div>
                          </div>

                          <div className="flex flex-col gap-1 col-span-3 sm:col-span-1">
                             <span className="text-[10px] text-[var(--app-text-muted)] font-medium font-semibold">高度 (PlayResY)</span>
                             <div className="relative">
                                <input
                                   type="number"
                                   value={options.playResY || 1080}
                                   onChange={e => {
                                      const h = parseInt(e.target.value) || 1080;
                                      setOptions({ ...options, playResY: h });
                                   }}
                                   className="w-full bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 pr-6 focus:outline-none focus:border-[var(--app-accent)] text-xs font-mono"
                                />
                                <span className="absolute right-2 top-1.5 text-[9px] text-[var(--app-text-muted)] font-mono">px</span>
                             </div>
                          </div>
                       </div>
                       <p className="text-[10px] text-[var(--app-text-muted)] leading-tight mt-1">
                          設定正確的影片解析度，可避免在播放不同比例（如 4:3 懷舊影片或寬螢幕電影）的影片時，小白圓等 SVG 向量繪圖圖案產生拉伸、扁平或任何變形的問題。
                       </p>
                    </div>

                   {/* 字幕顏色設定 */}
                   <div className="flex flex-col gap-2">
                      <label className="font-semibold text-[var(--app-text-primary)] text-xs">字幕顏色設定</label>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-[var(--app-bg-input)] p-3 border border-[var(--app-border-light)] rounded">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--app-text-muted)] font-medium">已唱字幕 (Color 1)</span>
                            <div className="flex items-center gap-2">
                               <input type="color" value={options.primaryColor} onChange={e => setOptions({...options, primaryColor: e.target.value})} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                               <span className="font-mono text-[10px] text-[var(--app-text-primary)]">{options.primaryColor.toUpperCase()}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1 opacity-50 tooltip-wrapper" title="尚未實裝多部和音支援">
                            <span className="text-[10px] text-[var(--app-text-muted)] font-medium">已唱字幕2 (暫不支援)</span>
                            <div className="flex items-center gap-2">
                               <input type="color" value={options.color2} onChange={e => setOptions({...options, color2: e.target.value})} disabled className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                               <span className="font-mono text-[10px] text-[var(--app-text-primary)]">{options.color2.toUpperCase()}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1 opacity-50 tooltip-wrapper" title="尚未實裝多部和音支援">
                            <span className="text-[10px] text-[var(--app-text-muted)] font-medium">已唱字幕3 (暫不支援)</span>
                            <div className="flex items-center gap-2">
                               <input type="color" value={options.color3} onChange={e => setOptions({...options, color3: e.target.value})} disabled className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                               <span className="font-mono text-[10px] text-[var(--app-text-primary)]">{options.color3.toUpperCase()}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1 opacity-50 tooltip-wrapper" title="尚未實裝多部和音支援">
                            <span className="text-[10px] text-[var(--app-text-muted)] font-medium">已唱合唱 (暫不支援)</span>
                            <div className="flex items-center gap-2">
                               <input type="color" value={options.chorusColor} onChange={e => setOptions({...options, chorusColor: e.target.value})} disabled className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                               <span className="font-mono text-[10px] text-[var(--app-text-primary)]">{options.chorusColor.toUpperCase()}</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* 間奏閥值 */}
                   <div className="flex flex-col gap-1.5 bg-[var(--app-bg-input)] p-3 border border-[var(--app-border-light)] rounded">
                      <label className="font-semibold text-[var(--app-text-primary)] text-xs">間奏閥值</label>
                      <div className="flex items-center gap-3">
                         <input type="range" min="1" max="15" step="0.5" value={dualLineGapSec} onChange={e => setDualLineGapSec(parseFloat(e.target.value))} className="flex-1 accent-[var(--app-accent)]" />
                         <span className="font-mono w-12 text-right text-[var(--app-text-primary)]">{dualLineGapSec.toFixed(1)}s</span>
                      </div>
                      <p className="text-[10px] text-[var(--app-text-muted)]">當兩句歌詞相隔超過此數值，將被視為新段落並重新進入排版。</p>
                   </div>

                   {/* 密集測試區 */}
                   <div className="flex flex-col gap-2 p-3 bg-[var(--app-bg-panel)] border border-[var(--app-border-light)] rounded">
                      <label className="font-semibold text-[var(--app-text-primary)] text-xs">測試參數 (內部)</label>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">行間距 (px)</label>
                           <input type="number" value={options.dualRowSpacing} onChange={e => setOptions({...options, dualRowSpacing: parseInt(e.target.value) || 0})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">左右邊距 LR (px)</label>
                           <input type="number" value={options.dualRowMarginL} onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setOptions({...options, dualRowMarginL: val, dualRowMarginR: val});
                           }} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">上下邊距 V (px)</label>
                           <input type="number" value={options.dualRowMarginV} onChange={e => setOptions({...options, dualRowMarginV: parseInt(e.target.value) || 0})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">資訊字體</label>
                           <input type="number" value={options.infoFontSize} onChange={e => setOptions({...options, infoFontSize: parseInt(e.target.value)})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">標題字體</label>
                           <input type="number" value={options.infoTitleFontSize} onChange={e => setOptions({...options, infoTitleFontSize: parseInt(e.target.value) || 150})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">間奏緩衝 (s)</label>
                           <input type="number" step="0.1" value={options.interludeBuffer} onChange={e => setOptions({...options, interludeBuffer: parseFloat(e.target.value)})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">觸發索引</label>
                           <input type="number" value={options.nextTriggerIndex} onChange={e => setOptions({...options, nextTriggerIndex: parseInt(e.target.value)})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[var(--app-text-muted)]">淡出模式</label>
                           <select value={options.row2FadeoutMode} onChange={e => setOptions({...options, row2FadeoutMode: e.target.value as 'immediate' | 'delayed'})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5">
                              <option value="immediate">Immediate</option>
                              <option value="delayed">Delayed</option>
                           </select>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-5">
                   {/* 歌曲開始資訊 */}
                   <div className="flex flex-col gap-3 bg-[var(--app-bg-input)] p-3 border border-[var(--app-border-light)] rounded">
                      <div className="flex flex-wrap gap-2 justify-between items-center">
                          <label className="font-semibold text-[var(--app-text-primary)] text-xs">歌曲開始資訊</label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                              <button onClick={handleImportFromTags} className="px-2 py-1 bg-[var(--app-bg-hover)] border border-[var(--app-border-light)] rounded text-[10px] text-[var(--app-text-primary)] hover:bg-[var(--app-border-base)] transition-colors">由音檔標籤匯入</button>
                              <button onClick={handleImportFromLrc} className="px-2 py-1 bg-[var(--app-bg-hover)] border border-[var(--app-border-light)] rounded text-[10px] text-[var(--app-text-primary)] hover:bg-[var(--app-border-base)] transition-colors">由LRC屬性匯入</button>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">標題</span>
                          <input type="text" value={options.songInfoTitle} onChange={e => {
                             const updated = { ...options, songInfoTitle: e.target.value };
                             setOptions(updated);
                             syncToLrcMetadata(updated);
                          }} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />
                          
                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">主唱</span>
                          <input type="text" value={options.songInfoArtist} onChange={e => {
                             const updated = { ...options, songInfoArtist: e.target.value };
                             setOptions(updated);
                             syncToLrcMetadata(updated);
                          }} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />

                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">專輯</span>
                          <input type="text" value={options.songInfoAlbum} onChange={e => {
                             const updated = { ...options, songInfoAlbum: e.target.value };
                             setOptions(updated);
                             syncToLrcMetadata(updated);
                          }} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />

                          <span className="text-[var(--app-text-muted)] text-[10px] text-right self-start mt-1">自訂內容</span>
                          <textarea value={options.songInfoCustom} onChange={e => {
                             const updated = { ...options, songInfoCustom: e.target.value };
                             setOptions(updated);
                             syncToLrcMetadata(updated);
                          }} placeholder="例如：&#10;作詞：XXX&#10;作曲：OOO" rows={3} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] mb-1 resize-y" />
                      </div>

                      <div className="flex items-center gap-2 border-t border-[var(--app-border-light)] pt-2 mt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors select-none">
                              <input type="checkbox" checked={options.customStartInfoTime} onChange={e => {
                                 const checked = e.target.checked;
                                 const updated = { ...options, customStartInfoTime: checked };
                                 setOptions(updated);
                                 syncToLrcMetadata(updated);
                              }} className="accent-[var(--app-accent)]" />
                              <span>特殊自訂顯示時間戳</span>
                          </label>
                      </div>

                      {options.customStartInfoTime && (
                         <div className="flex items-center gap-2 pl-[60px] animate-fade-in">
                            <input type="text" value={startInput} onChange={handleStartInputChange} onBlur={handleStartInputBlur} className="w-24 bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 text-xs text-[var(--app-text-primary)] focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" title="Start Time" />
                            <span className="text-[var(--app-text-muted)]">~</span>
                            <input type="text" value={endInput} onChange={handleEndInputChange} onBlur={handleEndInputBlur} className="w-24 bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 text-xs text-[var(--app-text-primary)] focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" title="End Time" />
                         </div>
                      )}
                   </div>

                   {/* 自訂間奏Logo圖檔 (準備中) */}
                   <div className="flex flex-col gap-1.5 opacity-50 relative border border-[var(--app-border-light)] p-3 rounded bg-[var(--app-bg-input)]">
                      <label className="font-semibold text-xs text-[var(--app-text-primary)] flex items-center gap-2">
                         <ImageIcon className="w-4 h-4" /> 自訂間奏Logo圖檔 (準備中)
                      </label>
                      <div className="flex items-center gap-2 pointer-events-none mt-2">
                         <input type="file" disabled className="text-xs bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded py-1.5 px-2 w-full text-[var(--app-text-muted)] border-dashed border-[var(--app-border-light)]" />
                      </div>
                      <div className="absolute inset-0 bg-transparent" title="此功能正在開發中"></div>
                   </div>
                </div>

             </div>
          </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 flex flex-col min-h-[300px] overflow-hidden lg:relative">
         <RawTextDisplay
           customText={assContent || '; 沒有包含同步時間標籤的歌詞資料。請先到「逐字同步」頁尾打節拍。'}
           hideKaraokePreview={true}
           customLeftControls={
             <div className="flex items-center gap-2">
                 <SlidersHorizontal className="w-4 h-4 text-[var(--app-text-muted)]" />
                 <span className="text-xs font-mono text-[var(--app-text-muted)]">.ass RAW Preview</span>
             </div>
           }
           customRightControls={
             <div className="flex gap-2">
                 <button onClick={handleDownload} className="text-[10px] flex items-center gap-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black px-3 py-1.5 rounded transition-colors font-bold uppercase tracking-widest z-10">
                    <Download className="w-3.5 h-3.5" /> 下載 .ass 檔
                 </button>
             </div>
           }
         />
      </div>
    </div>
  );
}
