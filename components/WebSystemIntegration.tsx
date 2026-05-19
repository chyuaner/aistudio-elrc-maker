'use client';

import { useEffect } from 'react';
import { AppCommands } from '@/lib/app-commands';

// ── Linux Tauri 全螢幕狀態追蹤 ──────────────────────────────────────
// Tauri 在 Linux 上進入全螢幕時，GTK HeaderBar 會被 Wayland/X11 隱藏。
// 此時必須恢復顯示 web 版 TopToolbar（--top-toolbar-display: flex），
// 退出全螢幕後再還原隱藏（--top-toolbar-display: none）。
export function WebSystemIntegration() {
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isLinuxTauri = isTauri && ua.includes('linux');

    // ── toggleFullscreen：Tauri 使用原生視窗 API，瀏覽器使用 document API ──
    if (!AppCommands.toggleFullscreen) {
      if (isTauri) {
        // Tauri 全螢幕是視窗層級，必須透過 Tauri window API 切換，
        // 不能用 document.requestFullscreen（那只影響 WebView 的 DOM 層）。
        // 使用 dynamic import @tauri-apps/api/window 確保 Tauri v2 API 路徑正確
        AppCommands.toggleFullscreen = async () => {
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            const isFs = await win.isFullscreen();
            await win.setFullscreen(!isFs);
          } catch (err) {
            console.warn('Tauri setFullscreen failed:', err);
          }
        };
      } else {
        AppCommands.toggleFullscreen = () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
              console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        };
      }
    }
    
    function updateMetaThemeColor(color: string) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement("meta");
            metaThemeColor.setAttribute("name", "theme-color");
            document.head.appendChild(metaThemeColor);
        }
        
        document.querySelectorAll('meta[name="theme-color"][media]').forEach(el => el.remove());
        
        metaThemeColor.setAttribute("content", color);
    }
    
    // Initialize Theme Meta Color
    const root = document.documentElement;
    const isSystemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial sync
    let isCurrentlyDarkInit = root.classList.contains('dark') || (!root.classList.contains('light') && isSystemDarkQuery.matches);
    updateMetaThemeColor(isCurrentlyDarkInit ? '#16191E' : '#f0f2f5');
    if (isTauri) {
        (window as any).__TAURI__.core.invoke('set_gtk_theme', { theme: isCurrentlyDarkInit ? 'dark' : 'light' }).catch(() => {});
    }

    // Also listen to system theme changes dynamically if no forced theme!
    isSystemDarkQuery.addEventListener('change', (e) => {
        if (!root.classList.contains('dark') && !root.classList.contains('light')) {
             updateMetaThemeColor(e.matches ? '#16191E' : '#f0f2f5');
             if (isTauri) {
                 (window as any).__TAURI__.core.invoke('set_gtk_theme', { theme: e.matches ? 'dark' : 'light' }).catch(() => {});
             }
        }
    });

    if (!AppCommands.toggleTheme) {
      AppCommands.toggleTheme = (forceTheme?: 'dark' | 'light') => {
        const isSystemDark = isSystemDarkQuery.matches;
        
        let isCurrentlyDark = false;
        if (root.classList.contains('dark')) isCurrentlyDark = true;
        else if (root.classList.contains('light')) isCurrentlyDark = false;
        else isCurrentlyDark = isSystemDark;

        let willBeDark = forceTheme ? (forceTheme === 'dark') : !isCurrentlyDark;

        if (willBeDark) {
            root.classList.remove('light');
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
            updateMetaThemeColor('#16191E');
            if (isTauri) {
                (window as any).__TAURI__.core.invoke('set_gtk_theme', { theme: 'dark' }).catch(() => {});
            }
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
            root.style.colorScheme = 'light';
            updateMetaThemeColor('#f0f2f5');
            if (isTauri) {
                (window as any).__TAURI__.core.invoke('set_gtk_theme', { theme: 'light' }).catch(() => {});
            }
        }
      };
    }

    // ── Linux Tauri 全螢幕狀態監聽 ────────────────────────────────────
    // Tauri v2 沒有專屬的 fullscreen window event，改用 tauri://resize 事件
    // 觸發後呼叫 isFullscreen() 查詢當前狀態（Tauri 官方建議做法）。
    // 進入全螢幕時：GTK HeaderBar 被系統隱藏 → 顯示 web TopToolbar
    // 離開全螢幕時：GTK HeaderBar 恢復顯示 → 隱藏 web TopToolbar
    let unlistenResize: (() => void) | null = null;
    if (isLinuxTauri) {
      (async () => {
        try {
          const tauri = (window as any).__TAURI__;
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          // tauri://resize 會在視窗大小任意變化（含進出全螢幕）時觸發
          unlistenResize = await tauri.event.listen('tauri://resize', async () => {
            try {
              const isFs = await getCurrentWindow().isFullscreen();
              document.documentElement.style.setProperty(
                '--top-toolbar-display',
                isFs ? 'flex' : 'none'
              );
            } catch (_) {}
          });
        } catch (err) {
          console.warn('Failed to listen for Tauri resize events:', err);
        }
      })();
    }
    
    return () => {
      if (unlistenResize) {
        try { unlistenResize(); } catch (_) {}
      }
    };
  }, []);

  return null;
}
