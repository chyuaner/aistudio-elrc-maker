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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f2f5' },
    { media: '(prefers-color-scheme: dark)', color: '#16191E' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
            const ua = navigator.userAgent.toLowerCase();
            
            // Set defaults for web
            document.documentElement.style.setProperty('--top-toolbar-display', 'flex');

            if (isTauri) {
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
