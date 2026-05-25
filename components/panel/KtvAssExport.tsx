'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { generateAss, AssOptions } from '@/lib/ass-generator';
import { Download, SlidersHorizontal, Settings2, Image as ImageIcon } from 'lucide-react';

export function KtvAssExport() {
  const { lines, lrcMetadata, audioFileName, dualLineGapSec } = useEditor();
  
  const [options, setOptions] = useState<Omit<AssOptions, 'interludeThreshold'>>({
    primaryColor: '#0000FF', // Blue
    color2: '#FF0000', // Red
    color3: '#800080', // Purple
    chorusColor: '#008000', // Green
    fontFamily: '微软雅黑',
    fontSize: 140, // Default for BottomLeft
    songInfoTitle: lrcMetadata.ti || '',
    songInfoArtist: lrcMetadata.ar || '',
    songInfoAlbum: lrcMetadata.al || '',
    customStartInfoTime: false,
    startInfoStartTime: 0,
    startInfoEndTime: 6,
    fadeInOutTime: 0.5,
  });

  // Sync state if metadata changed externally and we haven't touched it yet
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(o => ({
       ...o,
       songInfoTitle: o.songInfoTitle || lrcMetadata.ti || '',
       songInfoArtist: o.songInfoArtist || lrcMetadata.ar || '',
       songInfoAlbum: o.songInfoAlbum || lrcMetadata.al || '',
    }));
  }, [lrcMetadata.ti, lrcMetadata.ar, lrcMetadata.al]);

  const assContent = useMemo(() => {
    return generateAss(lines, lrcMetadata, { ...options, interludeThreshold: dualLineGapSec });
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

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-main)]">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0 overflow-y-auto">
        
        {/* Settings Panel */}
        <div className="flex flex-col gap-6 p-6 bg-[var(--app-bg-panel)] rounded-md border border-[var(--app-border-base)] overflow-y-auto shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[var(--app-border-light)]">
            <Settings2 className="w-5 h-5 text-[var(--app-accent)]" />
            <h2 className="text-sm font-bold text-[var(--app-text-primary)]">KTV字幕選項</h2>
          </div>

          <div className="space-y-4 text-xs text-[var(--app-text-secondary)]">
             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                   <label className="font-medium text-[var(--app-text-primary)]">已唱字幕顏色 (Color 1)</label>
                   <div className="flex items-center gap-2">
                      <input type="color" value={options.primaryColor} onChange={e => setOptions({...options, primaryColor: e.target.value})} className="h-8 w-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                      <span className="font-mono">{options.primaryColor.toUpperCase()}</span>
                   </div>
                </div>
                {/* 2, 3, Chorus (UI exist but not deeply integrated in logic unless requested) */}
                <div className="flex flex-col gap-1.5 opacity-50 tooltip-wrapper" title="尚未實裝多部和音支援">
                   <label className="font-medium text-[var(--app-text-primary)]">已唱字幕2顏色 (暫不支援)</label>
                   <div className="flex items-center gap-2">
                      <input type="color" value={options.color2} onChange={e => setOptions({...options, color2: e.target.value})} disabled className="h-8 w-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                      <span className="font-mono">{options.color2.toUpperCase()}</span>
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[var(--app-text-primary)]">字體設定</label>
                <div className="flex items-center gap-2">
                   <input type="text" value={options.fontFamily} onChange={e => setOptions({...options, fontFamily: e.target.value})} className="flex-1 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" />
                   <input type="number" value={options.fontSize} onChange={e => setOptions({...options, fontSize: parseInt(e.target.value) || 120})} className="w-20 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" title="Font Size" />
                </div>
                <p className="text-[10px] text-[var(--app-text-muted)]">字體外框皆固定從反（白字體配黑框，彩字體配白框）。</p>
             </div>

             <div className="h-px bg-[var(--app-border-base)] my-2" />

             <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label className="font-medium text-[var(--app-text-primary)]">歌曲開始資訊</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={options.customStartInfoTime} onChange={e => setOptions({...options, customStartInfoTime: e.target.checked})} className="accent-[var(--app-accent)]" />
                        <span className="text-[10px]">特殊自訂顯示時間戳</span>
                    </label>
                </div>
                
                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                    <span className="text-[var(--app-text-muted)] text-right">標題</span>
                    <input type="text" value={options.songInfoTitle} onChange={e => setOptions({...options, songInfoTitle: e.target.value})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" />
                    
                    <span className="text-[var(--app-text-muted)] text-right">原唱</span>
                    <input type="text" value={options.songInfoArtist} onChange={e => setOptions({...options, songInfoArtist: e.target.value})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" />

                    <span className="text-[var(--app-text-muted)] text-right">專輯</span>
                    <input type="text" value={options.songInfoAlbum} onChange={e => setOptions({...options, songInfoAlbum: e.target.value})} className="bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)]" />
                </div>

                {options.customStartInfoTime && (
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[var(--app-text-muted)] w-[80px] text-right">時間區間</span>
                      <input type="number" step="0.1" value={options.startInfoStartTime} onChange={e => setOptions({...options, startInfoStartTime: parseFloat(e.target.value) || 0})} className="w-20 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)] text-center" />
                      <span>~</span>
                      <input type="number" step="0.1" value={options.startInfoEndTime} onChange={e => setOptions({...options, startInfoEndTime: parseFloat(e.target.value) || 0})} className="w-20 bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--app-accent)] text-center" />
                      <span>秒</span>
                   </div>
                )}
             </div>

             <div className="h-px bg-[var(--app-border-base)] my-2" />
             
             <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[var(--app-text-primary)]">淡出淡入動畫時間</label>
                <div className="flex items-center gap-3">
                   <input type="range" min="0" max="2" step="0.1" value={options.fadeInOutTime} onChange={e => setOptions({...options, fadeInOutTime: parseFloat(e.target.value)})} className="flex-1 accent-[var(--app-accent)]" />
                   <span className="font-mono w-12 text-right">{options.fadeInOutTime.toFixed(1)}s</span>
                </div>
             </div>

             <div className="h-px bg-[var(--app-border-base)] my-2" />

             <div className="flex flex-col gap-1.5 opacity-50 relative">
                <label className="font-medium text-[var(--app-text-primary)] flex items-center gap-2">
                   <ImageIcon className="w-4 h-4" /> 自訂間奏Logo圖檔 (準備中)
                </label>
                <div className="flex items-center gap-2 pointer-events-none">
                   <input type="file" disabled className="text-xs bg-[var(--app-bg-input)] border border-[var(--app-border-input)] rounded py-1.5 px-2 w-full" />
                </div>
                <div className="absolute inset-0 bg-transparent" title="此功能正在開發中"></div>
             </div>

          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex flex-col bg-[#1e1e1e] rounded-md border border-[var(--app-border-base)] overflow-hidden shadow-sm relative">
           <div className="flex justify-between items-center bg-[#2d2d2d] px-4 py-2 shrink-0 border-b border-[#3d3d3d]">
              <div className="flex items-center gap-2">
                 <SlidersHorizontal className="w-4 h-4 text-[var(--app-text-muted)]" />
                 <span className="text-xs font-mono text-[var(--app-text-muted)]">.ass RAW Preview</span>
              </div>
              <button onClick={handleDownload} className="text-xs flex items-center gap-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black px-3 py-1.5 rounded transition-colors font-bold z-10">
                 <Download className="w-3.5 h-3.5" /> 下載 .ass 檔
              </button>
           </div>
           <div className="flex-1 min-h-0 overflow-auto p-4 text-[10px] sm:text-xs">
              <pre className="text-green-400 font-mono whitespace-pre-wrap select-text break-all">
                {assContent || '; 沒有包含同步時間標籤的歌詞資料。請先到「逐字同步」頁尾打節拍。'}
              </pre>
           </div>
        </div>

      </div>
    </div>
  );
}
