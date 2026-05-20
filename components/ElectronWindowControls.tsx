'use client';

import { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

type ElectronAPI = {
  shell?: { useCustomWindowControls?: boolean };
  windowMinimize?: () => void;
  windowToggleMaximize?: () => void;
  windowClose?: () => void;
  getWindowState?: () => Promise<{ isMaximized?: boolean; isFullScreen?: boolean }>;
  onWindowStateChange?: (
    cb: (state: { isMaximized?: boolean; isFullScreen?: boolean }) => void
  ) => () => void;
};

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI ?? null;
}

export function ElectronWindowControls({ className = '' }: { className?: string }) {
  const [ready, setReady] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const api = ready ? getElectronAPI() : null;
  const show = !!api?.shell?.useCustomWindowControls;

  useEffect(() => {
    if (!show || !api) return;

    api.getWindowState?.().then((s) => setIsMaximized(!!s?.isMaximized));
    const unsub = api.onWindowStateChange?.((s) => {
      setIsMaximized(!!s?.isMaximized);
    });
    return () => unsub?.();
  }, [show, api]);

  useEffect(() => {
    if (!show) return;
    const observer = new MutationObserver(() => {
      setDialogOpen(!!document.querySelector('[role="dialog"]'));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [show]);

  if (!show) return null;

  const disabled = dialogOpen;
  const btnClass =
    'flex items-center justify-center w-[46px] h-full border-none bg-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)] transition-colors disabled:opacity-40 disabled:pointer-events-none app-region-no-drag shrink-0';
  const closeClass =
    `${btnClass} hover:!bg-[#e81123] hover:!text-white`;

  return (
    <div
      className={`flex items-stretch app-region-no-drag shrink-0 ${className}`}
      data-electron-window-controls
    >
      <button
        type="button"
        className={btnClass}
        disabled={disabled}
        aria-label="最小化"
        title="最小化"
        onClick={() => api.windowMinimize?.()}
      >
        <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={disabled}
        aria-label={isMaximized ? '還原' : '最大化'}
        title={isMaximized ? '還原' : '最大化'}
        onClick={() => api.windowToggleMaximize?.()}
      >
        {isMaximized ? (
          <Copy className="w-3 h-3" strokeWidth={1.5} />
        ) : (
          <Square className="w-3 h-3" strokeWidth={1.5} />
        )}
      </button>
      <button
        type="button"
        className={closeClass}
        disabled={disabled}
        aria-label="關閉"
        title="關閉"
        onClick={() => api.windowClose?.()}
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
