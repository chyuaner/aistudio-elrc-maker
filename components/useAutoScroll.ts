import { useEffect } from 'react';
import { useEditor } from './EditorProvider';

export function useAutoScroll() {
  const { lines, currentTime, isPlaying, autoScrollEnabled, activeLineIndex, activeWordIndex, setActiveLineIndex, setActiveWordIndex } = useEditor();

  useEffect(() => {
    if (!autoScrollEnabled || !isPlaying) return;

    let foundIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const start = lines[i].start;
      if (start !== null && start <= currentTime) {
        foundIndex = i;
        break;
      }
    }

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
      // Just update word index
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
  }, [currentTime, isPlaying, autoScrollEnabled, lines, activeLineIndex, activeWordIndex, setActiveLineIndex, setActiveWordIndex]);
}
