'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { generateAss, AssOptions } from '@/lib/ass-generator';
import { Download, SlidersHorizontal, Settings2, Image as ImageIcon } from 'lucide-react';
import { RawTextDisplay } from '@/components/panel/RawTextDisplay';
import { formatTime, parseSeconds } from '@/lib/lyric-utils';

export function KtvAssExport() {
  const { lines, lrcMetadata, commitLrcMetadata, audioFileName, dualLineGapSec, setDualLineGapSec, metadata, showToast } = useEditor();
  
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
    fontSize: 150, // Default for BottomLeft
    infoFontSize: 110, // Default for CenterInfo (song info, fontSize - 40)
    infoTitleFontSize: 140, // Default for red Title (fontSize - 10)
    songInfoTitle: lrcMetadata.kti || lrcMetadata.ti || '',
    songInfoArtist: lrcMetadata.kar || lrcMetadata.ar || '',
    songInfoAlbum: lrcMetadata.kal || lrcMetadata.al || '',
    songInfoCustom: lrcMetadata.ko || '',
    customStartInfoTime: hasCustomTime,
    startInfoStartTime: parsedStart,
    startInfoEndTime: parsedEnd,
    dualRowSpacing: 160,
    nextTriggerIndex: 1,
    row2FadeoutMode: 'immediate',
    interludeBuffer: 1.0,
  });

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
      // 如此一來可完美支援使用者刻意將原唱與專輯留空的需求
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
                      <div className="flex items-center gap-2">
                         <input type="text" value={options.fontFamily} onChange={e => setOptions({...options, fontFamily: e.target.value})} className="flex-1 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" />
                         <input type="number" value={options.fontSize} onChange={e => {
                             const newSize = parseInt(e.target.value) || 120;
                             const diff = newSize - options.fontSize;
                             setOptions({
                               ...options,
                               fontSize: newSize,
                               infoFontSize: newSize - 40,
                               infoTitleFontSize: newSize - 10
                             });
                          }} className="w-20 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" title="Font Size" />
                      </div>
                      <p className="text-[10px] text-[var(--app-text-muted)]">字體外框皆固定從反（白字體配黑框，彩字體配白框）。</p>
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
                           <input type="number" value={options.dualRowSpacing} onChange={e => setOptions({...options, dualRowSpacing: parseInt(e.target.value)})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-1 py-0.5" />
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
                          
                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">原唱</span>
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
