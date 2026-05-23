import { useEffect, useRef } from 'react';
import { useEditor } from '@/components/base/EditorProvider';

export function useAutoScroll() {
  const { lines, isPlaying, autoScrollEnabled, activeLineIndex, activeWordIndex, setActiveLineIndex, setActiveWordIndex, playerRef } = useEditor();

  const stateRef = useRef({ activeLineIndex, activeWordIndex });
  useEffect(() => {
    stateRef.current = { activeLineIndex, activeWordIndex };
  }, [activeLineIndex, activeWordIndex]);

  useEffect(() => {
    if (!autoScrollEnabled || !isPlaying) return;

    let rafId: number;
    const updateScroll = () => {
      const currentTime = playerRef.current ? playerRef.current.currentTime : 0;
      let foundIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const start = lines[i].start;
        if (start !== null && start <= currentTime) {
          foundIndex = i;
          break;
        }
      }

      const { activeLineIndex, activeWordIndex } = stateRef.current;

      if (foundIndex !== -1 && foundIndex !== activeLineIndex) {
        setActiveLineIndex(foundIndex);
        
        let foundWIndex = 0;
        const line = lines[foundIndex];
        if (line && line.words) {
            for (let w = line.words.length - 1; w >= 0; w--) {
              const wStart = line.words[w].start;
              if (wStart !== null && wStart <= currentTime) {
                foundWIndex = w;
                break;
              }
            }
        }
        if (foundWIndex !== activeWordIndex) {
           setActiveWordIndex(foundWIndex);
        }
      } else if (foundIndex === activeLineIndex && foundIndex !== -1) {
        let foundWIndex = 0;
        const line = lines[foundIndex];
        if (line && line.words) {
            for (let w = line.words.length - 1; w >= 0; w--) {
              const wStart = line.words[w].start;
              if (wStart !== null && wStart <= currentTime) {
                foundWIndex = w;
                break;
              }
            }
        }
        if (foundWIndex !== activeWordIndex) {
           setActiveWordIndex(foundWIndex);
        }
      }
      
      rafId = requestAnimationFrame(updateScroll);
    };

    rafId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, autoScrollEnabled, lines, playerRef, setActiveLineIndex, setActiveWordIndex]);
}
