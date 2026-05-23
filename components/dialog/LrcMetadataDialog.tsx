import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { LrcMetadataEditor } from '@/components/panel/LrcMetadataEditor';

const invokeTauri = async (cmd: string, args?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
          const { invoke } = await import('@tauri-apps/api/core');
          return await invoke(cmd, args);
      } catch (e) {
          console.error(e);
      }
  }
};

export function LrcMetadataDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    invokeTauri('set_titlebar_buttons_enabled', { enabled: !isOpen });
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] shrink-0">
          <h2 className="text-lg font-bold">LRC屬性 (LRC Metadata)</h2>
          <button 
            onClick={onClose}
            className="text-[var(--app-text-muted)] hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-hidden flex-1 flex flex-col">
          <LrcMetadataEditor onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

