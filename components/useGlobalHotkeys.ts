import { useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { isTextEditable } from '@/lib/utils';

export function useGlobalHotkeys() {
  const { undo, redo, playerRef, mode, isPlaying, setPlaybackRate } = useEditor();

  useEffect(() => {
    // Global listener to blur active elements (like buttons) when interacting, preventing space/arrow keys from acting on them inadvertently.
    const onKeyDownCapture = (e: KeyboardEvent) => {
      const target = document.activeElement;
      if (target && !isTextEditable(target)) {
         if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
             if (target instanceof HTMLElement && target.tagName !== 'BODY') {
                 target.blur();
             }
         }
      }
    };
    window.addEventListener('keydown', onKeyDownCapture, true);

    const onKeyDown = (e: KeyboardEvent) => {
      // Focus check (ignore if inside input/textarea)
      const isInputFocused = isTextEditable(document.activeElement);

      // Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isInputFocused) return; // Let browser natively handle undo in textarea
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return;
      }
      
      // Ctrl + Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (isInputFocused) return; // Let browser natively handle redo in textarea
        redo();
        e.preventDefault();
        return;
      }

      // If we're focused in an input, don't hijack space or arrows
      if (isInputFocused) return;

      const player = playerRef.current;
      if (!player) return;

      // 'P' for play/pause
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (player.paused) {
          player.play().catch(console.error);
        } else {
          player.pause();
        }
      }

      // Left/Right arrows for seeking
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        player.currentTime = Math.min(player.duration, player.currentTime + 5);
      }

      // Number keys for seeking 0% - 90%
      if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const percent = parseInt(e.key, 10) * 10;
        player.currentTime = (percent / 100) * player.duration;
      }

      // [ and ] for playback rate
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPlaybackRate((prev: number) => Math.max(0.25, prev - 0.05));
      } else if (e.key === ']' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPlaybackRate((prev: number) => Math.min(2.0, prev + 0.05));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDownCapture, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [undo, redo, playerRef, mode, isPlaying, setPlaybackRate]);
}
