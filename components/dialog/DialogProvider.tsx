'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DialogContextType = {
  confirm: (msg: string) => Promise<boolean>;
  prompt: (msg: string, defaultVal?: string) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | null>(null);

// Safely call Tauri's invoke only in a Tauri context
const invokeTauri = async (cmd: string, args?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke(cmd, args);
  } catch {
    // Not in Tauri context or command not found — silently ignore
  }
};

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs must be used within DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{ msg: string; resolve: (val: boolean) => void } | null>(null);
  const [promptState, setPromptState] = useState<{ msg: string; defaultVal: string; resolve: (val: string | null) => void } | null>(null);
  const [promptInput, setPromptInput] = useState('');

  // Whenever a dialog opens or closes, sync the Linux GTK titlebar button sensitivity.
  // On non-Linux or non-Tauri platforms this is a no-op (invokeTauri handles that gracefully).
  useEffect(() => {
    const dialogOpen = confirmState !== null || promptState !== null;
    invokeTauri('set_titlebar_buttons_enabled', { enabled: !dialogOpen });
  }, [confirmState, promptState]);

  const confirm = (msg: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ msg, resolve });
    });
  };

  const prompt = (msg: string, defaultVal = '') => {
    return new Promise<string | null>((resolve) => {
      setPromptInput(defaultVal);
      setPromptState({ msg, defaultVal, resolve });
    });
  };

  const handleConfirmClose = (val: boolean) => {
    if (confirmState) {
      confirmState.resolve(val);
      setConfirmState(null);
    }
  };

  const handlePromptClose = (submit: boolean) => {
    if (promptState) {
      promptState.resolve(submit ? promptInput : null);
      setPromptState(null);
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      
      {/* Confirm Modal */}
      {confirmState && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 app-region-no-drag"
          style={{
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] p-6 rounded shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <p className="text-[var(--app-text-secondary)] mb-6 whitespace-pre-wrap">{confirmState.msg}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-border-base)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleConfirmClose(true)}
                className="px-4 py-2 rounded text-sm bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 app-region-no-drag"
          style={{
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] p-6 rounded shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <p className="text-[var(--app-text-secondary)] mb-4">{promptState.msg}</p>
            <input 
              type="text" 
              autoFocus
              className="w-full bg-[var(--app-bg-base)] border border-[var(--app-border-base)] rounded p-2 text-[var(--app-text-primary)] mb-6 outline-none focus:border-[var(--app-accent)] transition-colors"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePromptClose(true);
                if (e.key === 'Escape') handlePromptClose(false);
              }}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handlePromptClose(false)}
                className="px-4 py-2 rounded text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-border-base)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handlePromptClose(true)}
                className="px-4 py-2 rounded text-sm bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-black font-medium transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
