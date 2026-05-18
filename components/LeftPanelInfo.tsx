'use client';

import React, { useState } from 'react';
import { useEditor } from './EditorProvider';

export function LeftPanelInfo() {
  const { metadata } = useEditor();
  const [activeTab, setActiveTab] = useState<'instructions' | 'metadata'>('metadata');
  const [pictureIndex, setPictureIndex] = useState(0);

  // Reset index when metadata changes
  React.useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
     setPictureIndex(0);
  }, [metadata]);

  const pictures = metadata?.pictures?.length ? metadata.pictures : (metadata?.picture ? [metadata.picture] : []);
  const currentPicture = pictures[pictureIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--app-bg-panel-alt)]">
      <div className="flex border-b border-[var(--app-border-base)] shrink-0 bg-[var(--app-bg-base)]">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'metadata' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          Metadata
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'instructions' ? 'border-[var(--app-accent)] text-[var(--app-accent)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
        >
          Instructions
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-xs text-[var(--app-text-muted)] space-y-6">
        {activeTab === 'instructions' ? (
          <>
            <div>
              <h3 className="font-bold text-[var(--app-text-secondary)] uppercase tracking-widest text-[10px] mb-3 border-b border-[var(--app-border-base)] pb-1">How to Sync</h3>
              <ul className="list-disc pl-4 space-y-2">
                  <li><strong className="text-[var(--app-text-secondary)]">Step 1:</strong> Load your Audio/Video file.</li>
                  <li><strong className="text-[var(--app-text-secondary)]">Step 2:</strong> Load your `.txt` or `.lrc` file manually or click &quot;TEXT Editor&quot; tab to paste them.</li>
                  <li><strong className="text-[var(--app-text-secondary)]">Step 3:</strong> Switch to the <span className="text-[var(--app-accent)]">SYNC EDITOR</span>. Wait until formatting is done.</li>
                  <li><strong className="text-[var(--app-text-secondary)]">Step 4:</strong> Play the audio. Press <kbd className="bg-[var(--app-border-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)] mx-1">Space</kbd> to timestamp the active word or line.</li>
                  <li><strong className="text-[var(--app-text-secondary)]">Step 5:</strong> Check the Dual-Line preview. Export when done!</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-[var(--app-text-secondary)] uppercase tracking-widest text-[10px] mb-3 border-b border-[var(--app-border-base)] pb-1">Keyboard Shortcuts</h3>
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Undo</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">Ctrl/Cmd + Z</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Redo</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">Ctrl/Cmd + Y</kbd> / <kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">Cmd + Shift + Z</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Play / Pause Audio</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">P</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Seek Backward 5s</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">← Left Arrow</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Seek Forward 5s</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">Right Arrow →</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Skip to 0%~90%</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">0</kbd> - <kbd className="bg-[var(--app-border-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-border-light)]">9</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Stamp Word/Line</td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-accent)]/50">Space</kbd></td>
                  </tr>
                  <tr className="border-b border-[var(--app-border-base)]/50">
                    <td className="py-2 pr-2">Advance Line <span className="opacity-50">(Word Mode)</span></td>
                    <td className="py-2 text-right"><kbd className="bg-[var(--app-border-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--app-accent)]/50">M</kbd></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4 font-mono text-[11px]">
             {metadata ? (
               <div className="space-y-2">
                 {currentPicture && (
                   <div className="flex flex-col mb-4">
                     <div className="w-full aspect-square rounded border border-[var(--app-border-base)] overflow-hidden">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src={currentPicture} alt="Cover" className="w-full h-full object-cover" />
                     </div>
                     {pictures.length > 1 && (
                       <div className="flex items-center justify-between mt-2 px-1">
                          <button 
                            disabled={pictureIndex === 0}
                            onClick={() => setPictureIndex(p => p - 1)}
                            className="px-2 py-0.5 bg-[var(--app-bg-hover)] border border-[var(--app-border-base)] rounded text-[10px] disabled:opacity-30"
                          >
                            &lt; Prev
                          </button>
                          <span className="text-[10px]">{pictureIndex + 1} / {pictures.length}</span>
                          <button 
                            disabled={pictureIndex === pictures.length - 1}
                            onClick={() => setPictureIndex(p => p + 1)}
                            className="px-2 py-0.5 bg-[var(--app-bg-hover)] border border-[var(--app-border-base)] rounded text-[10px] disabled:opacity-30"
                          >
                            Next &gt;
                          </button>
                       </div>
                     )}
                   </div>
                 )}
                 <p><span className="text-[var(--app-text-secondary)]">Title:</span> {metadata.title || 'Unknown'}</p>
                 <p><span className="text-[var(--app-text-secondary)]">Artist:</span> {metadata.artist || 'Unknown'}</p>
                 <p><span className="text-[var(--app-text-secondary)]">Album:</span> {metadata.album || 'Unknown'}</p>
                 <p><span className="text-[var(--app-text-secondary)]">Year:</span> {metadata.year || 'Unknown'}</p>
                 <p><span className="text-[var(--app-text-secondary)]">Track:</span> {metadata.track || 'Unknown'}</p>
                 {metadata.comment && <p><span className="text-[var(--app-text-secondary)]">Comment:</span> <span className="italic">{metadata.comment}</span></p>}
                 
                 {metadata.rawTags && (
                   <div className="mt-4 pt-4 border-t border-[var(--app-border-base)] space-y-2">
                     <h4 className="font-bold text-[var(--app-text-secondary)] uppercase tracking-widest text-[10px] mb-2">Other Tags</h4>
                     {Object.entries(metadata.rawTags).map(([k, v]) => {
                         const knownKeys = ['title', 'artist', 'album', 'year', 'track', 'picture', 'pictures', 'comment', 'lyrics'];
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
                                <span className="text-[var(--app-text-secondary)]">{k}:</span> <span className="opacity-80">{displayVal}</span>
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
