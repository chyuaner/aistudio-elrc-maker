'use client';

import { useEffect } from 'react';
import { AppCommands } from '@/lib/app-commands';

export function WebSystemIntegration() {
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
    
    // Register web fallbacks (will be overridden by Tauri if available)
    if (!AppCommands.toggleFullscreen) {
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
    
    function updateMetaThemeColor(color: string) {
        let metaThemeColor = document.querySelector("meta[name=theme-color]");
        if (!metaThemeColor) {
            metaThemeColor = document.createElement("meta");
            metaThemeColor.setAttribute("name", "theme-color");
            document.head.appendChild(metaThemeColor);
        }
        
        // Remove media-specific theme colors as they will override our static one
        document.querySelectorAll("meta[name=theme-color][media]").forEach(el => el.remove());
        
        metaThemeColor.setAttribute("content", color);
    }
    
    // Initialize Theme Meta Color
    const root = document.documentElement;
    const isSystemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial sync
    let isCurrentlyDarkInit = root.classList.contains('dark') || (!root.classList.contains('light') && isSystemDarkQuery.matches);
    updateMetaThemeColor(isCurrentlyDarkInit ? '#16191E' : '#f0f2f5');
    
    // Also listen to system theme changes dynamically if no forced theme!
    isSystemDarkQuery.addEventListener('change', (e) => {
        if (!root.classList.contains('dark') && !root.classList.contains('light')) {
             updateMetaThemeColor(e.matches ? '#16191E' : '#f0f2f5');
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
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
            root.style.colorScheme = 'light';
            updateMetaThemeColor('#f0f2f5');
        }
      };
    }
    
  }, []);

  return null;
}
