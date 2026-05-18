'use client';

import React, { useState } from 'react';
import { useEditor } from './EditorProvider';

export function LeftPanelInfo() {
  const { metadata } = useEditor();
  const [activeTab, setActiveTab] = useState<'instructions' | 'metadata'>('metadata');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#16191E]">
      <div className="flex border-b border-[#2D333B] shrink-0 bg-[#0F1115]">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'metadata' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
        >
          Metadata
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'instructions' ? 'border-[#F27D26] text-[#F27D26]' : 'border-transparent text-[#7D8590] hover:text-[#E0E0E0]'}`}
        >
          Instructions
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-xs text-[#7D8590] space-y-6">
        {activeTab === 'instructions' ? (
          <>
            <div>
              <h3 className="font-bold text-[#E0E0E0] uppercase tracking-widest text-[10px] mb-3 border-b border-[#2D333B] pb-1">How to Sync</h3>
              <ul className="list-disc pl-4 space-y-2">
                  <li><strong className="text-[#E0E0E0]">Step 1:</strong> Load your Audio/Video file.</li>
                  <li><strong className="text-[#E0E0E0]">Step 2:</strong> Load your `.txt` or `.lrc` file manually or click &quot;TEXT Editor&quot; tab to paste them.</li>
                  <li><strong className="text-[#E0E0E0]">Step 3:</strong> Switch to the <span className="text-[#F27D26]">SYNC EDITOR</span>. Wait until formatting is done.</li>
                  <li><strong className="text-[#E0E0E0]">Step 4:</strong> Play the audio. Press <kbd className="bg-[#2D333B] text-[#F27D26] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56] mx-1">Space</kbd> to timestamp the active word or line.</li>
                  <li><strong className="text-[#E0E0E0]">Step 5:</strong> Check the Dual-Line preview. Export when done!</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-[#E0E0E0] uppercase tracking-widest text-[10px] mb-3 border-b border-[#2D333B] pb-1">Keyboard Shortcuts</h3>
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Undo</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">Ctrl/Cmd + Z</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Redo</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">Ctrl/Cmd + Y</kbd> / <kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">Cmd + Shift + Z</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Play / Pause Audio</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">P</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Seek Backward 5s</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">← Left Arrow</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Seek Forward 5s</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">Right Arrow →</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Skip to 0%~90%</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">0</kbd> - <kbd className="bg-[#2D333B] text-[#E0E0E0] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#444C56]">9</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Stamp Word/Line</td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#F27D26] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#F27D26]/50">Space</kbd></td>
                  </tr>
                  <tr className="border-b border-[#2D333B]/50">
                    <td className="py-2 pr-2">Advance Line <span className="opacity-50">(Word Mode)</span></td>
                    <td className="py-2 text-right"><kbd className="bg-[#2D333B] text-[#F27D26] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#F27D26]/50">M</kbd></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4 font-mono text-[11px]">
             {metadata ? (
               <div className="space-y-2">
                 {metadata.picture && (
                   <div className="w-full aspect-square mb-4 rounded border border-[#2D333B] overflow-hidden">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={metadata.picture} alt="Cover" className="w-full h-full object-cover" />
                   </div>
                 )}
                 <p><span className="text-[#E0E0E0]">Title:</span> {metadata.title || 'Unknown'}</p>
                 <p><span className="text-[#E0E0E0]">Artist:</span> {metadata.artist || 'Unknown'}</p>
                 <p><span className="text-[#E0E0E0]">Album:</span> {metadata.album || 'Unknown'}</p>
                 <p><span className="text-[#E0E0E0]">Year:</span> {metadata.year || 'Unknown'}</p>
                 <p><span className="text-[#E0E0E0]">Track:</span> {metadata.track || 'Unknown'}</p>
                 {metadata.comment && <p><span className="text-[#E0E0E0]">Comment:</span> <span className="italic">{metadata.comment}</span></p>}
                 
                 {metadata.rawTags && (
                   <div className="mt-4 pt-4 border-t border-[#2D333B] space-y-2">
                     <h4 className="font-bold text-[#E0E0E0] uppercase tracking-widest text-[10px] mb-2">Other Tags</h4>
                     {Object.entries(metadata.rawTags).map(([k, v]) => {
                         const knownKeys = ['title', 'artist', 'album', 'year', 'track', 'picture', 'comment', 'lyrics'];
                         if (knownKeys.includes(k.toLowerCase()) || k.toLowerCase().startsWith('©lyr')) return null;
                         
                         let displayVal = '';
                         if (typeof v === 'string' || typeof v === 'number') {
                             displayVal = String(v);
                         } else if (v && typeof v === 'object') {
                             if (v.data && Array.isArray(v.data) && v.data.length > 100) {
                                 displayVal = '[Binary Data]';
                             } else if (v.text || v.description) {
                                 displayVal = String(v.text || v.description);
                             } else {
                                 try {
                                     displayVal = JSON.stringify(v);
                                     if (displayVal.length > 200) displayVal = displayVal.substring(0, 200) + '...';
                                 } catch(e) {
                                     displayVal = '[Object]';
                                 }
                             }
                         }
                         
                         if (!displayVal || displayVal === '{}' || displayVal === '[]') return null;
                         
                         return (
                            <div key={k} className="break-all">
                                <span className="text-[#E0E0E0]">{k}:</span> <span className="opacity-80">{displayVal}</span>
                            </div>
                         );
                     })}
                   </div>
                 )}
               </div>
             ) : (
               <p className="italic text-center mt-4">No metadata loaded. Load an audio file to read ID3 tags.</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
