import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'LRC Maker Enhanced',
  description: 'A desktop-like web app for syncing lyrics',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F1115',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && (
            window.location.search.includes('tauri=1') || 
            window.location.protocol === 'tauri:' || 
            window.__TAURI__ || 
            window.__TAURI_INTERNALS__
          )) {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('macintosh') || ua.includes('mac os x')) {
              document.documentElement.style.setProperty('--top-toolbar-display', 'flex');
              document.documentElement.style.setProperty('--titlebar-left-padding', '75px');
              document.documentElement.style.setProperty('--titlebar-right-padding', '0px');
            } else if (ua.includes('windows') || ua.includes('win64') || ua.includes('win32')) {
              document.documentElement.style.setProperty('--top-toolbar-display', 'flex');
              document.documentElement.style.setProperty('--titlebar-left-padding', '0px');
              document.documentElement.style.setProperty('--titlebar-right-padding', '0px');
            } else if (ua.includes('linux')) {
              document.documentElement.style.setProperty('--top-toolbar-display', 'none');
            }
          }
        ` }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
