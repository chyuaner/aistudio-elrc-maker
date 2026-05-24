import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Enhanced LRC Studio',
  description: 'A desktop-like web app for syncing lyrics',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f2f5' },
    { media: '(prefers-color-scheme: dark)', color: '#16191E' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            const isTauri = typeof window !== 'undefined' && (
              window.__TAURI__ || 
              window.__TAURI_INTERNALS__
            );
            const electronAPI = typeof window !== 'undefined' && window.electronAPI;
            const isElectron = !!(electronAPI && electronAPI.isElectron);
            const ua = navigator.userAgent.toLowerCase();
            
            // Set defaults for web
            document.documentElement.style.setProperty('--top-toolbar-display', 'flex');

            if (isElectron && electronAPI.shell) {
                document.documentElement.classList.add('electron-shell');
                var sh = electronAPI.shell;
                if (sh.titlebarLeftPadding) {
                    document.documentElement.style.setProperty('--titlebar-left-padding', sh.titlebarLeftPadding);
                }
                if (sh.titlebarRightPadding && !sh.useCustomWindowControls) {
                    document.documentElement.style.setProperty('--titlebar-right-padding', sh.titlebarRightPadding);
                }
                if (sh.useCustomWindowControls) {
                    document.documentElement.style.setProperty('--titlebar-right-padding', '0px');
                }
            } else if (isTauri) {
                if (ua.includes('macintosh') || ua.includes('mac os x')) {
                    document.documentElement.style.setProperty('--titlebar-left-padding', '70px');
                } else if (ua.includes('linux')) {
                    document.documentElement.style.setProperty('--top-toolbar-display', 'none');
                }
            }
          })()
        `}} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
