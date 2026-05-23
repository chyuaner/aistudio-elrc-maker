'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Scissors, Copy, ClipboardPaste, ListChecks } from 'lucide-react';

export function TextContextMenu() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReadOnly, setIsReadOnly] = useState(false);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (window.matchMedia('(pointer: coarse)').matches) {
          return;
      }
      const target = e.target as HTMLElement;
      
      // Always prevent native context menu if it's within the web app
      e.preventDefault();

      const isReadonlyElement = 
         target.closest('[data-context-menu="readonly"]') !== null ||
         (target.tagName === 'TEXTAREA' && (target as HTMLTextAreaElement).readOnly) ||
         (target.tagName === 'INPUT' && (target as HTMLInputElement).readOnly);

      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && ((target as HTMLInputElement).type === 'text' || (target as HTMLInputElement).type === 'number')) ||
          target.isContentEditable ||
          target.closest('[data-context-menu="readonly"]'))
      ) {
        targetElementRef.current = (target.closest('[data-context-menu="readonly"]') || target) as HTMLElement;
        setIsReadOnly(isReadonlyElement);
        
        let x = e.clientX;
        let y = e.clientY;
        
        // Ensure menu doesn't go off-screen
        if (x + 150 > window.innerWidth) x = window.innerWidth - 150;
        if (y + 150 > window.innerHeight) y = window.innerHeight - 150;

        setPosition({ x, y });
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const handleAction = async (action: 'cut' | 'copy' | 'paste' | 'selectAll' | 'toTraditional' | 'toSimplified') => {
    setVisible(false);
    
    const targetElement = targetElementRef.current;
    if (!targetElement) return;

    targetElement.focus();

    try {
      if (action === 'toTraditional' || action === 'toSimplified') {
          const el = targetElement as HTMLInputElement | HTMLTextAreaElement;
          const { convertToTraditional, convertToSimplified } = await import('@/lib/chinese-conv');
          const isInputOrTextarea = targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT';
          
          if (isInputOrTextarea) {
             const start = el.selectionStart || 0;
             const end = el.selectionEnd || 0;
             const val = el.value;
             let textToConvert = val;
             let convertAll = false;
             
             if (start === end) {
                 textToConvert = val;
                 convertAll = true;
                 el.select(); // Select all so execCommand replaces everything
             } else {
                 textToConvert = val.slice(start, end);
             }
             
             const convertedText = action === 'toTraditional' ? convertToTraditional(textToConvert) : convertToSimplified(textToConvert);
             
             if (!document.execCommand('insertText', false, convertedText)) {
                if (convertAll) {
                   el.value = convertedText;
                   el.selectionStart = el.selectionEnd = convertedText.length;
                } else {
                   el.value = val.slice(0, start) + convertedText + val.slice(end);
                   el.selectionStart = el.selectionEnd = start + convertedText.length;
                }
                const event = new Event('input', { bubbles: true });
                el.dispatchEvent(event);
             }
          }
      } else if (action === 'cut') {
        const selectedText = window.getSelection()?.toString();
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText);
          document.execCommand('delete'); // fallback for removing text if cut not supported
        } else {
            document.execCommand('cut');
        }
      } else if (action === 'copy') {
        const selectedText = window.getSelection()?.toString();
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText);
        } else {
            document.execCommand('copy');
        }
      } else if (action === 'paste') {
        const text = await navigator.clipboard.readText();
        if (text) {
          // If we have text, we use execCommand to preserve undo/redo history
          if (!document.execCommand('insertText', false, text)) {
             // Fallback for some browsers where execCommand is restricted
             if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
               const el = targetElement as HTMLInputElement | HTMLTextAreaElement;
               const start = el.selectionStart || 0;
               const end = el.selectionEnd || 0;
               const val = el.value;
               el.value = val.slice(0, start) + text + val.slice(end);
               el.selectionStart = el.selectionEnd = start + text.length;
               
               // Dispatch input event to notify React
               const event = new Event('input', { bubbles: true });
               el.dispatchEvent(event);
             }
          }
        }
      } else if (action === 'selectAll') {
        if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
          (targetElement as HTMLInputElement | HTMLTextAreaElement).select();
        } else {
          const range = document.createRange();
          range.selectNodeContents(targetElement);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    } catch (e) {
        // Fallback for execution restrictions
        console.error("Clipboard action failed", e);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded-lg shadow-lg py-1 min-w-[140px] text-xs text-[var(--app-text-primary)]"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={() => handleAction('cut')}
        disabled={isReadOnly}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Scissors className="w-3.5 h-3.5" />
        剪下
      </button>
      <button
        onClick={() => handleAction('copy')}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
        複製
      </button>
      <button
        onClick={() => handleAction('paste')}
        disabled={isReadOnly}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ClipboardPaste className="w-3.5 h-3.5" />
        貼上
      </button>
      <div className="h-px bg-[var(--app-border-base)] my-1"></div>
      <button
        onClick={() => handleAction('selectAll')}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] transition-colors"
      >
        <ListChecks className="w-3.5 h-3.5" />
        全選
      </button>
      <div className="h-px bg-[var(--app-border-base)] my-1"></div>
      <button
        onClick={() => handleAction('toTraditional')}
        disabled={isReadOnly}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">繁</span>
        轉成繁體
      </button>
      <button
        onClick={() => handleAction('toSimplified')}
        disabled={isReadOnly}
        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-[var(--app-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">簡</span>
        轉成簡體
      </button>
    </div>
  );
}
