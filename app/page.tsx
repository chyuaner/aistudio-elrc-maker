import React from 'react';
import { EditorProvider } from '@/components/base/EditorProvider';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { DialogProvider } from '@/components/dialog/DialogProvider';
import { WebSystemIntegration } from '@/components/base/WebSystemIntegration';
import { TextContextMenu } from '@/components/common/TextContextMenu';

export default function Page() {
  return (
    <DialogProvider>
      <WebSystemIntegration />
      <TextContextMenu />
      <EditorProvider>
        <main 
          className="h-[100dvh] w-full bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] font-sans flex flex-col overflow-hidden selection:bg-[var(--app-accent)]/30"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)'
          }}
        >
          <div className="flex flex-col flex-1 overflow-hidden relative" 
               style={{
                 // Only adding borders when there's a safe area inset at the bottom or right.
                 // We can use a pseudo-element or just the main wrapper borders, since we want borders separating the safe area from the app.
                 // Actually the style is directly inside <div style={{ borderBottom: '1px solid var(--app-border-base)', borderRight: '1px solid var(--app-border-base)' }}
                 borderBottom: 'max(0px, min(1px, env(safe-area-inset-bottom))) solid var(--app-border-base)',
                 borderRight: 'max(0px, min(1px, env(safe-area-inset-right))) solid var(--app-border-base)',
                 borderLeft: 'max(0px, min(1px, env(safe-area-inset-left))) solid var(--app-border-base)',
               }}
          >
            <TopToolbar />
            <ResizableLayout />
          </div>
        </main>
      </EditorProvider>
    </DialogProvider>
  );
}
