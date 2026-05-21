'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorProvider';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Square, Rewind, FastForward, ChevronLeft, ChevronRight, Volume2, VolumeX, Settings2, SkipBack, StepForward, Music, Repeat } from 'lucide-react';
import { formatTime } from '@/lib/lyric-utils';
import { Tooltip } from './Tooltip';

// ── CSS 色彩解析用 常駐 Probe 元素 ───────────────────────────────────────
// 問題：Canvas 2D API 不接受 CSS var() 字串，必須先用 getComputedStyle 解析成 rgb(...)。
// 原來的做法是每次都 create → appendChild → getComputedStyle → removeChild，
// 但 MutationObserver callback 可能在 React commit 階段觸發，
// 這時進行 appendChild/removeChild 會交互干擾 React 的 fiber 節點追蹤，
// 導致 deletedFiber.parentNode 為 null 而 crash。
// 修復：模組級 singleton probe「只 append 一次，永不 remove」，安全讀取色彩。
let _cssProbe: HTMLSpanElement | null = null;
function _getProbe(): HTMLSpanElement {
  if (!_cssProbe && typeof document !== 'undefined') {
    _cssProbe = document.createElement('span');
    _cssProbe.setAttribute('aria-hidden', 'true');
    // 完全隱藏，不占空間，不影響使用者
    _cssProbe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;';
    document.body.appendChild(_cssProbe);
  }
  return _cssProbe!;
}
/** 讀取 CSS 色彩變數并解析為終端 rgb() 字串（給 Canvas fillStyle 用） */
function getCssColor(cssValue: string): string {
  const p = _getProbe();
  p.style.color = cssValue;
  const resolved = getComputedStyle(p).color;
  p.style.color = '';
  return resolved;
}
/** 讀取 CSS 背景色變數并解析為終端 rgb() 字串（給 Canvas fillStyle 用） */
function getCssBgColor(cssValue: string): string {
  const p = _getProbe();
  p.style.backgroundColor = cssValue;
  const resolved = getComputedStyle(p).backgroundColor;
  p.style.backgroundColor = '';
  return resolved;
}

function TimeDisplay({ className = '' }: { className?: string }) {
  const { duration, playerRef } = useEditor();
  const [currentTime, setCurrentTime] = useState(0);

  // Live frequency visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const colorRef = useRef<string>('#444C56');

  useEffect(() => {
    const updateColor = () => {
      colorRef.current = getCssColor('var(--app-visualizer-color)') || '#444C56';
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', updateColor);
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', updateColor);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    const setupAudio = () => {
      if (!playerRef.current || audioCtxRef.current) return;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        const source = audioCtx.createMediaElementSource(playerRef.current);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (err) {
        console.error("Failed to init visualizer", err);
      }
    };

    const player = playerRef.current;
    if (player) {
      player.addEventListener('play', setupAudio, { once: true });
    }

    const updateTimeAndVisualizer = () => {
      if (playerRef.current) {
         setCurrentTime(playerRef.current.currentTime);
      }
      
      if (analyser && dataArray && canvasRef.current && playerRef.current && !playerRef.current.paused) {
         analyser.getByteFrequencyData(dataArray as any);
         const canvas = canvasRef.current;
         const ctx = canvas.getContext('2d');
         if (ctx) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             ctx.fillStyle = colorRef.current;
             const barWidth = (canvas.width / dataArray.length) * 1.5;
             for (let i = 0; i < dataArray.length; i++) {
                 // scale bar height: waveTopPercentage to 100 -> full height available
                 const barHeight = (dataArray[i] / 255) * canvas.height;
                 // "top peaks" -> draw from bottom up
                 ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
             }
         }
      }

      rafId = requestAnimationFrame(updateTimeAndVisualizer);
    };
    rafId = requestAnimationFrame(updateTimeAndVisualizer);

    return () => {
      cancelAnimationFrame(rafId);
      if (player) player.removeEventListener('play', setupAudio);
      // We don't close AudioContext on unmount to prevent tearing down the source mapping
    };
  }, [playerRef]);

  return (
    <div className={`flex justify-between items-end relative overflow-hidden h-20 w-full pt-4 pb-4 px-3 py-2 -mb-2 ${className}`}>
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none waveform-visualizer" 
            style={{ '--waveTopPercentage': '100%', '--opPeaks': 1 } as any}
            width={800} 
            height={80} 
        />
        <span className="text-3xl font-mono text-[var(--app-accent)] tabular-nums tracking-tighter leading-none font-medium z-10 mb-1">
          {formatTime(currentTime)}
        </span>
        <div className="flex flex-col items-end gap-0.5 z-10 mb-2">
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
  const { file, fileUrl, playerRef, duration, setDuration, isPlaying, setIsPlaying, audioLatency, setAudioLatency, playbackRate, setPlaybackRate, audioSpecs, lines, paragraphStarts, metadata } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWaveReady, setIsWaveReady] = useState(false);
  const [syncCurrTime, setSyncCurrTime] = useState(0);

  const isVideo = file?.type.startsWith('video/');

  // [LINUX WORKAROUND] WebKitGTK 的 MPRIS D-Bus 介面在高頻 setPositionState 呼叫下會 crash，
  // 在 Linux Tauri 環境下完全停用 Media Session，避免 WebKitWebProcess 崩潰。
  const isLinuxTauri = typeof window !== 'undefined' &&
    !!(window as any).__TAURI__ &&
    navigator.userAgent.toLowerCase().includes('linux');

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

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.settings-dropdown-container')) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  useEffect(() => {
    // Theme change observer for WaveSurfer
    const updateColors = () => {
      if (waveSurferRef.current) {
        const waveColor = getCssColor('var(--app-visualizer-color)') || '#444C56';
        const progressColor = getCssBgColor('var(--app-accent)') || '#F27D26';
        waveSurferRef.current.setOptions({
          waveColor,
          progressColor,
          cursorColor: progressColor,
        });
      }
    };
    
    // Call once to ensure sync in case it differs at mount
    updateColors();
    
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
         if (m.attributeName === 'class') updateColors();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', updateColors);
    
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', updateColors);
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsWaveReady(false);
    if (fileUrl && playerRef.current) {
       // 使用常駐 probe 解析 CSS 色彩（避免 append/remove 干擾 React reconciler）
       const initialWaveColor = getCssColor('var(--app-visualizer-color)') || '#444C56';
       const initialProgressColor = getCssBgColor('var(--app-accent)') || '#F27D26';

       waveSurferRef.current = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: initialWaveColor,
          progressColor: initialProgressColor,
          cursorColor: initialProgressColor,
          cursorWidth: 3,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 48,
          media: playerRef.current as HTMLAudioElement,
       });

       waveSurferRef.current.on('ready', () => {
           setIsWaveReady(true);
       });

       const handleMouseMove = (e: MouseEvent) => {
          // 直接從 playerRef 讀取 duration，避免黃 closure 導致此 effect deps 包含 duration
          const dur = playerRef.current?.duration;
          if (containerRef.current && dur && dur > 0 && isFinite(dur)) {
             const rect = containerRef.current.getBoundingClientRect();
             const x = e.clientX - rect.left;
             const ratio = Math.max(0, Math.min(1, x / rect.width));
             setHoverTime(ratio * dur);
             setHoverX(e.clientX);
          }
       };

       const handleMouseLeave = () => setHoverTime(null);

       const container = containerRef.current;
       container?.addEventListener('mousemove', handleMouseMove);
       container?.addEventListener('mouseleave', handleMouseLeave);

       return () => {
          container?.removeEventListener('mousemove', handleMouseMove);
          container?.removeEventListener('mouseleave', handleMouseLeave);
          if (waveSurferRef.current) {
             waveSurferRef.current.destroy();
             waveSurferRef.current = null;
          }
       };
    }
  // 移除 duration dep：duration 改變不應重建 WaveSurfer（會觸發 destroy + create 並直接操作 DOM）
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
    let id: number;
    const loop = () => {
      if (playerRef.current) setSyncCurrTime(playerRef.current.currentTime);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playerRef]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, playerRef]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.playbackRate !== playbackRate) {
      playerRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, playerRef]);

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

  const jumpToBeginning = () => {
    if (playerRef.current) playerRef.current.currentTime = 0;
  };

  const jumpToNextSegment = () => {
    if (!playerRef.current) return;
    const curr = playerRef.current.currentTime;
    for (let i = 0; i < lines.length; i++) {
        if (paragraphStarts[i] && lines[i].start !== null && lines[i].start! > curr + 1.0) {
            playerRef.current.currentTime = lines[i].start!;
            break;
        }
    }
  };

  // ── Media Session：位置狀態節流更新 ────────────────────────────────
  // [LINUX WORKAROUND] WebKitGTK 的 MPRIS D-Bus 介面不穩定：
  // 若以 rAF 頻率（~60fps）呼叫 setPositionState，D-Bus 訊息佇列會爆炸，
  // 導致「Failed to emit MPRIS properties changed」連環警告並 crash WebKitWebProcess。
  // 修復：在 Linux Tauri 環境下完全跳過 Media Session；其他平台節流至每秒 1 次。
  const lastPositionUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    // [LINUX WORKAROUND] Linux Tauri：完全跳過，避免 MPRIS D-Bus crash
    if (isLinuxTauri) return;

    if (duration > 0 && isFinite(duration)) {
      const now = performance.now();
      // 節流：每秒最多更新一次，避免 D-Bus 訊息過多
      if (now - lastPositionUpdateRef.current < 1000) return;
      lastPositionUpdateRef.current = now;
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: Math.min(syncCurrTime, duration),
        });
      } catch (e) {}
    }
  }, [syncCurrTime, duration, playbackRate, isLinuxTauri]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    // [LINUX WORKAROUND] Linux Tauri 下 WebKitGTK MPRIS D-Bus 不穩定，跳過 Media Session 設定
    if (isLinuxTauri) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata?.title || file?.name || 'Unknown Track',
      artist: metadata?.artist || '',
      album: metadata?.album || '',
      artwork: metadata?.picture ? [{ src: metadata.picture, type: metadata.format }] : []
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      if (playerRef.current) playerRef.current.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (playerRef.current) playerRef.current.pause();
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.currentTime = 0;
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => seekBy(-(details.seekOffset || 5)));
    navigator.mediaSession.setActionHandler('seekforward', (details) => seekBy(details.seekOffset || 5));
    navigator.mediaSession.setActionHandler('previoustrack', jumpToBeginning);
    navigator.mediaSession.setActionHandler('nexttrack', jumpToNextSegment);
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && playerRef.current) {
          playerRef.current.currentTime = details.seekTime;
        }
      });
    } catch(e) {}
    
    try {
      // @ts-ignore
      navigator.mediaSession.setActionHandler('playbackratechange', (details: any) => {
        if (details.playbackRate) setPlaybackRate(details.playbackRate);
      });
    } catch(e) {}
    
    try {
      // @ts-ignore
      navigator.mediaSession.setActionHandler('setrepeatmode', null);
    } catch(e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, file, lines, paragraphStarts, isLinuxTauri]);

  if (!fileUrl) {
    return (
      <div className="w-full h-48 bg-[var(--app-bg-base)] rounded flex flex-col items-center justify-center text-[var(--app-text-muted)] group">
        <Music className="w-16 h-16 mb-4 opacity-50 group-hover:opacity-80 transition-opacity" />
        <span className="text-sm font-bold tracking-widest uppercase">媒體尚未載入</span>
      </div>
    );
  }

  const commonProps = {
    src: fileUrl,
    controls: false,
    loop: isLooping,
    crossOrigin: 'anonymous' as const,
    className: 'w-full rounded bg-black object-contain ' + (isVideo ? 'h-48' : 'hidden'),
    onDurationChange: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const d = e.currentTarget.duration;
      // Ignore Infinity/NaN (FLAC streaming quirk); real duration is pre-cached from Rust
      if (isFinite(d) && !isNaN(d) && d > 0) setDuration(d);
    },
    onPlay: () => {
      setIsPlaying(true);
      // [LINUX WORKAROUND] Linux Tauri 下跳過 MPRIS D-Bus 更新
      if (!isLinuxTauri && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    },
    onPause: () => {
      setIsPlaying(false);
      if (!isLinuxTauri && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    },
    onRateChange: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      setPlaybackRate(e.currentTarget.playbackRate);
    },
    ref: playerRef as any,
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {isVideo ? <video {...commonProps} /> : <audio {...commonProps} />}
      
      <div className="flex flex-col p-2 lg:p-4">
        {/* Waveform */}
        <div className={`w-full rounded overflow-hidden bg-[var(--app-bg-input)] relative group/wave ${isWaveReady ? '' : 'hidden'}`} ref={containerRef}>
          {hoverTime !== null && (
            <div 
              className="absolute z-[60] top-0 pointer-events-none transform -translate-x-1/2 px-1.5 py-0.5 bg-[var(--app-text-primary)] text-[var(--app-bg-base)] text-[10px] font-mono font-bold rounded shadow-lg whitespace-nowrap"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
        
        {/* Fallback Progress Bar */}
        {!isWaveReady && (
          <div 
             className="w-full h-12 flex items-center px-2 cursor-pointer bg-[var(--app-bg-input)] rounded relative group/fb" 
             onClick={(e) => {
               if (duration <= 0) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
               if (playerRef.current) playerRef.current.currentTime = ratio * duration;
             }}
             onMouseMove={(e) => {
                if (duration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setHoverTime(ratio * duration);
             }}
             onMouseLeave={() => setHoverTime(null)}
          >
             <div className="w-full h-1.5 bg-[var(--app-border-base)] rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-0 bg-[var(--app-accent)]" style={{ width: `${(syncCurrTime / (duration || 1)) * 100}%` }}></div>
             </div>
             {hoverTime !== null && (
              <div 
                className="absolute z-[60] top-0 pointer-events-none transform -translate-x-1/2 px-1.5 py-0.5 bg-[var(--app-text-primary)] text-[var(--app-bg-base)] text-[10px] font-mono font-bold rounded shadow-lg whitespace-nowrap"
                style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>
        )}
        
        {/* Specs */}
        <div className="text-[9px] font-mono text-[var(--app-text-muted)] text-right mt-1 px-1 tracking-widest uppercase truncate">
          {computeAudioSpecsText()}
        </div>
      </div>

      {/* Time Display */}
      <TimeDisplay className="-mb-2" />
      
      <div className="@container flex flex-wrap items-center justify-between gap-y-2 gap-x-2 bg-[var(--app-bg-panel)] p-3 shadow-sm border-t border-[var(--app-border-base)]">
        {/* Playback controls row */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <Tooltip title={<div className="flex items-center gap-2">播放 / 暫停 <kbd className="bg-[var(--app-bg-base)] text-[var(--app-accent)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-accent)]/50">P</kbd></div>} delay={500}>
              <button onClick={togglePlay} className="flex items-center justify-center w-10 h-10 text-[var(--app-text-primary)] hover:bg-[var(--app-accent)] hover:text-white rounded-full transition-colors border border-[var(--app-border-light)] bg-[var(--app-bg-input)] shadow-sm">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
            </Tooltip>
            
            <Tooltip title="停止" delay={500}>
              <button onClick={stopPlay} className="p-2 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <Square className="w-5 h-5 fill-current" />
              </button>
            </Tooltip>
          </div>

          <div className="h-6 w-px bg-[var(--app-border-base)] mx-1 hidden @[300px]:block"></div>

          <div className="flex items-center gap-0.5">
            <Tooltip title={<div className="flex items-center gap-2">跳到開頭 <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">0</kbd></div>} delay={500}>
              <button onClick={jumpToBeginning} className="hidden @[300px]:block p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">倒轉 -5s <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">←</kbd></div>} delay={500}>
              <button onClick={() => seekBy(-5)} className="hidden @[300px]:block p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <Rewind className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">倒轉 -1s</div>} delay={500}>
              <button onClick={() => seekBy(-1)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">快進 +1s</div>} delay={500}>
              <button onClick={() => seekBy(1)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">快進 +5s <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">→</kbd></div>} delay={500}>
              <button onClick={() => seekBy(5)} className="hidden @[300px]:block p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                <FastForward className="w-4 h-4" />
              </button>
            </Tooltip>
            {lines.length > 0 && (
              <Tooltip title={<div className="flex items-center gap-2">跳到下一段歌詞開頭</div>} delay={500}>
                <button onClick={jumpToNextSegment} className="hidden @[300px]:block p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors">
                  <StepForward className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip title="重複播放" delay={500}>
              <button 
                onClick={() => setIsLooping(!isLooping)} 
                className={`p-1.5 rounded transition-colors ${isLooping ? 'text-[var(--app-accent)] bg-[var(--app-bg-hover)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)]'}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
        
        {/* Volume and Settings */}
        <div className="flex items-center justify-between gap-2 flex-grow @[300px]:flex-grow-0 w-full @[300px]:w-auto">
          <Tooltip title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}>
            <div className="flex items-center gap-1.5 flex-1 min-w-[80px] max-w-[120px]">
              <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors shrink-0">
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input 
                type="range" min="0" max="1" step="0.05" 
                value={isMuted ? 0 : volume} 
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
                }}
                className="w-full min-w-[40px] accent-[var(--app-accent)] h-1.5 rounded-lg outline-none bg-[var(--app-bg-input)]"
              />
            </div>
          </Tooltip>

          <div className="flex items-center gap-0.5 relative shrink-0 settings-dropdown-container">
            <Tooltip title={<div className="flex items-center gap-2">減速 <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">[</kbd></div>}>
              <button 
                onClick={() => setPlaybackRate(Math.max(0.25, Number((playbackRate - 0.05).toFixed(2))))}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip title="播放速度 (點擊重設)">
              <span 
                className="text-xs font-mono text-[var(--app-text-secondary)] w-10 text-center cursor-pointer tracking-tighter hover:text-[var(--app-accent)]"
                onClick={() => setPlaybackRate(1.0)}
              >
                {playbackRate.toFixed(2)}x
              </span>
            </Tooltip>
            <Tooltip title={<div className="flex items-center gap-2">加速 <kbd className="bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] px-1.5 py-0.5 rounded text-[9px] font-mono border border-[var(--app-border-light)]">]</kbd></div>}>
              <button 
                onClick={() => setPlaybackRate(Math.min(2.0, Number((playbackRate + 0.05).toFixed(2))))}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)] rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <div className="h-4 w-px bg-[var(--app-border-base)] mx-1"></div>

            <Tooltip title="音頻延遲補償">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-1.5 rounded transition-colors border ${showSettings || audioLatency !== 0 ? 'bg-[var(--app-bg-border-light)] text-[var(--app-accent)] border-[var(--app-accent)]' : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] border-[var(--app-border-light)] hover:text-[var(--app-text-primary)]'}`} 
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </Tooltip>
            
            {showSettings && (
              <div className="absolute bottom-[calc(100%+8px)] right-0 mb-2 p-3 bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] shadow-[0_4px_12px_rgba(0,0,0,0.5)] rounded-lg z-50 flex flex-col gap-2 w-[240px]">
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

