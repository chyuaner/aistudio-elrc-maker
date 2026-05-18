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
            document.documentElement.style.setProperty('--top-toolbar-display', 'none');
          }
        ` }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
