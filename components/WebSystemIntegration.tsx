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
    
    if (!AppCommands.toggleTheme) {
      AppCommands.toggleTheme = (forceTheme?: 'dark' | 'light') => {
        const root = document.documentElement;
        if (forceTheme) {
            if (forceTheme === 'dark') {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
                updateMetaThemeColor('#16191E');
            } else {
                root.classList.remove('dark');
                root.style.colorScheme = 'light';
                updateMetaThemeColor('#f0f2f5');
            }
        } else {
            // Toggle
            if (root.classList.contains('dark')) {
                root.classList.remove('dark');
                root.style.colorScheme = 'light';
                updateMetaThemeColor('#f0f2f5');
            } else {
                // Determine if we are currently light by media query if no class
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (!root.classList.contains('dark') && isSystemDark) {
                    // It was system dark, but we want to toggle to light
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                    updateMetaThemeColor('#f0f2f5');
                } else {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    updateMetaThemeColor('#16191E');
                }
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
    
  }, []);

  return null;
}
