'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type DialogContextType = {
  confirm: (msg: string) => Promise<boolean>;
  prompt: (msg: string, defaultVal?: string) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs must be used within DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{ msg: string; resolve: (val: boolean) => void } | null>(null);
  const [promptState, setPromptState] = useState<{ msg: string; defaultVal: string; resolve: (val: string | null) => void } | null>(null);
  const [promptInput, setPromptInput] = useState('');

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1D23] border border-[#2D333B] p-6 rounded shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <p className="text-[#E0E0E0] mb-6 whitespace-pre-wrap">{confirmState.msg}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded text-sm text-[#E0E0E0] hover:bg-[#2D333B] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleConfirmClose(true)}
                className="px-4 py-2 rounded text-sm bg-[#F27D26] hover:bg-[#E26D16] text-black font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1D23] border border-[#2D333B] p-6 rounded shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <p className="text-[#E0E0E0] mb-4">{promptState.msg}</p>
            <input 
              type="text" 
              autoFocus
              className="w-full bg-[#0F1115] border border-[#2D333B] rounded p-2 text-white mb-6 outline-none focus:border-[#F27D26] transition-colors"
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
                className="px-4 py-2 rounded text-sm text-[#E0E0E0] hover:bg-[#2D333B] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handlePromptClose(true)}
                className="px-4 py-2 rounded text-sm bg-[#F27D26] hover:bg-[#E26D16] text-black font-medium transition-colors"
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
