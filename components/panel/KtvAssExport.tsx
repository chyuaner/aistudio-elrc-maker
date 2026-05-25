'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { generateAss, AssOptions } from '@/lib/ass-generator';
import { Download, SlidersHorizontal, Settings2, Image as ImageIcon } from 'lucide-react';
import { RawTextDisplay } from '@/components/panel/RawTextDisplay';

export function KtvAssExport() {
  const { lines, lrcMetadata, audioFileName, dualLineGapSec, setDualLineGapSec, metadata, showToast } = useEditor();
  
  const [options, setOptions] = useState<Omit<AssOptions, 'interludeThreshold' | 'fadeInOutTime'>>({
    primaryColor: '#0000FF', // Blue
    color2: '#FF0000', // Red
    color3: '#800080', // Purple
    chorusColor: '#008000', // Green
    fontFamily: '微软雅黑',
    fontSize: 140, // Default for BottomLeft
    songInfoTitle: lrcMetadata.ti || '',
    songInfoArtist: lrcMetadata.ar || '',
    songInfoAlbum: lrcMetadata.al || '',
    songInfoCustom: '',
    customStartInfoTime: false,
    startInfoStartTime: 0,
    startInfoEndTime: 6,
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
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleImportFromTags = () => {
     setOptions(o => ({
       ...o,
       songInfoTitle: metadata?.title || metadata?.rawTags?.TITLE || metadata?.rawTags?.title || '',
       songInfoArtist: metadata?.artist || metadata?.rawTags?.ARTIST || metadata?.rawTags?.artist || '',
       songInfoAlbum: metadata?.album || metadata?.rawTags?.ALBUM || metadata?.rawTags?.album || '',
     }));
     showToast('已從音檔標籤匯入資訊');
  };
  
  const handleImportFromLrc = () => {
     setOptions(o => ({
       ...o,
       songInfoTitle: lrcMetadata.ti || '',
       songInfoArtist: lrcMetadata.ar || '',
       songInfoAlbum: lrcMetadata.al || '',
     }));
     showToast('已從 LRC 屬性匯入資訊');
  };

  // Sync state if metadata changed externally and we haven't touched it yet, or clear on lyrics close
  useEffect(() => {
    if (lines.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions(o => ({
        ...o,
        songInfoTitle: '',
        songInfoArtist: '',
        songInfoAlbum: '',
        songInfoCustom: '',
      }));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions(o => ({
        ...o,
        songInfoTitle: o.songInfoTitle || lrcMetadata.ti || '',
        songInfoArtist: o.songInfoArtist || lrcMetadata.ar || '',
        songInfoAlbum: o.songInfoAlbum || lrcMetadata.al || '',
      }));
    }
  }, [lines.length, lrcMetadata.ti, lrcMetadata.ar, lrcMetadata.al]);

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
                         <input type="number" value={options.fontSize} onChange={e => setOptions({...options, fontSize: parseInt(e.target.value) || 120})} className="w-20 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" title="Font Size" />
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
                          <input type="text" value={options.songInfoTitle} onChange={e => setOptions({...options, songInfoTitle: e.target.value})} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />
                          
                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">原唱</span>
                          <input type="text" value={options.songInfoArtist} onChange={e => setOptions({...options, songInfoArtist: e.target.value})} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />

                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">專輯</span>
                          <input type="text" value={options.songInfoAlbum} onChange={e => setOptions({...options, songInfoAlbum: e.target.value})} className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)]" />

                          <span className="text-[var(--app-text-muted)] text-[10px] text-right">自訂內容</span>
                          <input type="text" value={options.songInfoCustom} onChange={e => setOptions({...options, songInfoCustom: e.target.value})} placeholder="例如：作詞：XXX / 作曲：OOO" className="bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)] text-xs text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] mb-1" />
                      </div>

                      <div className="flex items-center gap-2 border-t border-[var(--app-border-light)] pt-2 mt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors select-none">
                              <input type="checkbox" checked={options.customStartInfoTime} onChange={e => setOptions({...options, customStartInfoTime: e.target.checked})} className="accent-[var(--app-accent)]" />
                              <span>特殊自訂顯示時間戳</span>
                          </label>
                      </div>

                      {options.customStartInfoTime && (
                         <div className="flex items-center gap-2 pl-[60px] animate-fade-in">
                            <input type="number" step="0.1" value={options.startInfoStartTime} onChange={e => setOptions({...options, startInfoStartTime: parseFloat(e.target.value) || 0})} className="w-16 bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 text-xs text-[var(--app-text-primary)] focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" />
                            <span className="text-[var(--app-text-muted)]">~</span>
                            <input type="number" step="0.1" value={options.startInfoEndTime} onChange={e => setOptions({...options, startInfoEndTime: parseFloat(e.target.value) || 0})} className="w-16 bg-[var(--app-bg-panel)] border border-[var(--app-border-input)] rounded px-2 py-1 text-xs text-[var(--app-text-primary)] focus:outline-none focus:border-[var(--app-accent)] text-center font-mono" />
                            <span className="text-[10px] text-[var(--app-text-muted)]">秒</span>
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
