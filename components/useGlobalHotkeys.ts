import { useEffect } from 'react';
import { useEditor } from './EditorProvider';

export function useGlobalHotkeys() {
  const { undo, redo, playerRef, mode, isPlaying, setPlaybackRate } = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Focus check (ignore if inside input/textarea)
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                             document.activeElement?.tagName === 'TEXTAREA';

      // Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
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
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, playerRef, mode, isPlaying, setPlaybackRate]);
}
