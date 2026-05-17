'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorProvider';
import WaveSurfer from 'wavesurfer.js';

export function MediaPlayer() {
  const { file, fileUrl, playerRef, setCurrentTime, setDuration, setIsPlaying } = useEditor();
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const isVideo = file?.type.startsWith('video/');

  useEffect(() => {
    const updateTime = () => {
      if (playerRef.current) {
        const newTime = playerRef.current.currentTime;
        setCurrentTime((prev: number) => {
          if (prev !== newTime) return newTime;
          return prev;
        });
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };
    rafRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [setCurrentTime, playerRef]);

  // WaveSurfer setup
  useEffect(() => {
    if (!isVideo && fileUrl && containerRef.current && playerRef.current) {
       waveSurferRef.current = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#7D8590',
          progressColor: '#F27D26',
          cursorColor: '#E0E0E0',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 64,
          media: playerRef.current as HTMLAudioElement,
       });

       return () => {
          if (waveSurferRef.current) {
             waveSurferRef.current.destroy();
             waveSurferRef.current = null;
          }
       };
    }
  }, [isVideo, fileUrl, playerRef]);

  if (!fileUrl) {
    return (
      <div className="w-full h-48 bg-[#0F1115] rounded border border-[#2D333B] flex items-center justify-center text-[#7D8590] text-xs font-mono uppercase tracking-widest shadow-inner">
        No Media Loaded
      </div>
    );
  }

  const commonProps = {
    src: fileUrl,
    controls: true,
    className: 'w-full rounded shadow-sm bg-black object-contain ' + (isVideo ? 'h-48' : 'h-10'),
    onDurationChange: (e: React.SyntheticEvent<HTMLMediaElement>) => setDuration(e.currentTarget.duration),
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    ref: playerRef as any,
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {isVideo ? (
         <video {...commonProps} />
      ) : (
         <div className="flex flex-col gap-2">
           <div className="w-full" ref={containerRef}></div>
           <audio {...commonProps} />
         </div>
      )}
    </div>
  );
}
