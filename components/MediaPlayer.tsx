'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorProvider';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Square, Rewind, FastForward, ChevronLeft, ChevronRight, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { formatTime } from '@/lib/lyric-utils';
import { Tooltip } from './Tooltip';

function TimeDisplay() {
  const { duration, playerRef } = useEditor();
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let rafId: number;
    const updateTime = () => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.currentTime);
      }
      rafId = requestAnimationFrame(updateTime);
    };
    rafId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafId);
  }, [playerRef]);

  return (
    <div className="flex justify-between items-end px-1">
        <span className="text-3xl font-mono text-[var(--app-accent)] tabular-nums tracking-tighter leading-none font-medium">
          {formatTime(currentTime)}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs font-mono text-[var(--app-text-secondary)] tabular-nums leading-none">
            -{formatTime(Math.max(0, duration - currentTime))}
          </span>
          <span className="text-[10px] font-mono text-[var(--app-text-muted)] tabular-nums leading-none">
            {formatTime(duration)}
          </span>
        </div>
    </div>
  );
}

export function MediaPlayer() {
  const { file, fileUrl, playerRef, duration, setDuration, isPlaying, setIsPlaying, audioLatency, setAudioLatency, playbackRate, setPlaybackRate, audioSpecs } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isVideo = file?.type.startsWith('video/');

  const computeAudioSpecsText = () => {
    let formatDisplay = audioSpecs?.format || (file ? file.name.split('.').pop()?.toUpperCase() : '') || 'UNKNOWN';
    let bitrateDisplay = audioSpecs?.bitrate ? `${audioSpecs.bitrate} kb/s` : '';
    if (!audioSpecs?.bitrate && file && duration > 0) {
        const kbps = Math.round((file.size * 8) / duration / 1000);
        bitrateDisplay = `${kbps} kb/s`;
    }
    let sampleRateDisplay = audioSpecs?.sampleRate ? `${audioSpecs.sampleRate} Hz` : '';
    return [formatDisplay, sampleRateDisplay, bitrateDisplay].filter(Boolean).join(' · ');
  };

  useEffect(() => {
    if (fileUrl && playerRef.current) {
       waveSurferRef.current = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: 'var(--app-border-light)',
          progressColor: 'var(--app-accent)',
          cursorColor: 'var(--app-accent)',
          cursorWidth: 3,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 48,
          media: playerRef.current as HTMLAudioElement,
       });

       return () => {
          if (waveSurferRef.current) {
             waveSurferRef.current.destroy();
             waveSurferRef.current = null;
          }
       };
    }
  }, [fileUrl, playerRef]);

  // When a new file is loaded, read the duration pre-parsed by Rust (via window.__mediaDurations__).
  // This bypasses the Chromium/GStreamer issue where FLAC files report Infinity for duration.
  useEffect(() => {
    if (!fileUrl) return;
    const cached = (window as any).__mediaDurations__?.[fileUrl];
    if (typeof cached === 'number' && isFinite(cached) && cached > 0) {
      setDuration(cached);
    }
  }, [fileUrl, setDuration]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, playerRef]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, playerRef]);

  if (!fileUrl) {
    return (
      <div className="w-full h-48 bg-[var(--app-bg-base)] rounded border border-[var(--app-border-base)] flex items-center justify-center text-[var(--app-text-muted)] text-xs font-mono uppercase tracking-widest shadow-inner">
        No Media Loaded
      </div>
    );
  }

  const commonProps = {
    src: fileUrl,
    controls: false,
    crossOrigin: 'anonymous' as const,
    className: 'w-full rounded bg-black object-contain ' + (isVideo ? 'h-48' : 'hidden'),
    onDurationChange: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const d = e.currentTarget.duration;
      // Ignore Infinity/NaN (FLAC streaming quirk); real duration is pre-cached from Rust
      if (isFinite(d) && !isNaN(d) && d > 0) setDuration(d);
    },
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    ref: playerRef as any,
  };

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) playerRef.current.pause();
      else playerRef.current.play();
    }
  };

  const stopPlay = () => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
    }
  };

  const seekBy = (sec: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime + sec);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {isVideo ? <video {...commonProps} /> : <audio {...commonProps} />}
      
      <div className="flex flex-col">
        {/* Waveform */}
        <div className="w-full rounded overflow-hidden bg-[var(--app-bg-input)]" ref={containerRef}></div>
        
        {/* Specs */}
        <div className="text-[9px] font-mono text-[var(--app-text-muted)] text-right mt-1 px-1 tracking-widest uppercase truncate">
          {computeAudioSpecsText()}
        </div>
      </div>

      {/* Time Display */}
      <TimeDisplay />
      
      <div className="flex flex-col gap-3 bg-[var(--app-bg-panel)] p-3 rounded shadow-sm border border-[var(--app-border-base)]">
        {/* Playback controls row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Tooltip title={<div className="flex items-center gap-2">Play / Pause <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-accent)]/50">P</kbd></div>} delay={500}>
              <button onClick={togglePlay} className="flex items-center justify-center w-10 h-10 text-[var(--app-text-primary)] hover:bg-[var(--app-accent)] hover:text-white rounded-full transition-colors border border-[var(--app-border-light)] bg-[var(--app-bg-input)] shadow-sm">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
            </Tooltip>
            
            <Tooltip title="Stop" delay={500}>
              <button onClick={stopPlay} className="p-2 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <Square className="w-5 h-5 fill-current" />
              </button>
            </Tooltip>
          </div>

          <div className="h-6 w-px bg-[var(--app-border-base)] mx-1"></div>

          <div className="flex items-center gap-0.5 flex-1 justify-end">
            <Tooltip title={<div className="flex items-center gap-2">Rewind -5s <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">←</kbd></div>} delay={500}>
              <button onClick={() => seekBy(-5)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <Rewind className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">Rewind -1s</div>} delay={500}>
              <button onClick={() => seekBy(-1)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">Forward +1s</div>} delay={500}>
              <button onClick={() => seekBy(1)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">Forward +5s <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">→</kbd></div>} delay={500}>
              <button onClick={() => seekBy(5)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <FastForward className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
        
        {/* Volume and Settings Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--app-border-light)]">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors shrink-0">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="w-full min-w-[50px] accent-[var(--app-accent)] h-1.5 rounded-lg outline-none bg-[var(--app-bg-input)]"
            />
          </div>

          <div className="flex items-center gap-0.5 relative shrink-0">
            <Tooltip title={<div className="flex items-center gap-2">Slower <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">[</kbd></div>}>
              <button 
                onClick={() => setPlaybackRate(Math.max(0.25, Number((playbackRate - 0.05).toFixed(2))))}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <span 
              className="text-xs font-mono text-[var(--app-text-secondary)] w-10 text-center cursor-default tracking-tighter"
              title="Playback Rate"
            >
              {playbackRate.toFixed(2)}x
            </span>
            <Tooltip title={<div className="flex items-center gap-2">Faster <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">]</kbd></div>}>
              <button 
                onClick={() => setPlaybackRate(Math.min(2.0, Number((playbackRate + 0.05).toFixed(2))))}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <div className="h-4 w-px bg-[var(--app-border-base)] mx-1"></div>

            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-1.5 rounded transition-colors border ${showSettings || audioLatency !== 0 ? 'bg-[var(--app-bg-border-light)] text-[var(--app-accent)] border-[var(--app-accent)]' : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] border-[var(--app-border-light)] hover:text-[var(--app-text-primary)]'}`} 
              title="音頻延遲補償"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            
            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 p-3 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] shadow-[0_4px_12px_rgba(0,0,0,0.5)] rounded-lg z-50 flex flex-col gap-2 w-[240px]">
                <span className="text-xs font-bold text-[var(--app-text-secondary)]">音頻延遲補償 (藍牙耳機)</span>
                <span className="text-[10px] text-[var(--app-text-muted)] leading-relaxed">調整此值以對齊音訊與顯示畫面，適用於藍牙耳機等有延遲的情境。正值提早，負值延後。</span>
                <div className="flex items-center bg-[var(--app-bg-input)] rounded border border-[var(--app-border-base)] overflow-hidden mt-1 mx-auto">
                  <button onClick={() => setAudioLatency(audioLatency - 50)} className="px-3 py-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] font-bold">-</button>
                  <input 
                    type="number" 
                    value={audioLatency} 
                    onChange={(e) => setAudioLatency(parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-xs bg-transparent outline-none text-[var(--app-text-primary)] font-mono"
                  />
                  <button onClick={() => setAudioLatency(audioLatency + 50)} className="px-3 py-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] font-bold">+</button>
                </div>
                <span className="text-[10px] text-[var(--app-text-muted)] font-mono text-center block mt-1">{audioLatency} ms</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

