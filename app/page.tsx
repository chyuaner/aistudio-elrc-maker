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
            paddingTop: '0px',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)'
          }}
        >
          <div className="flex flex-col flex-1 overflow-hidden relative" 
               style={{
                 borderBottom: '1px solid var(--app-border-base)',
                 borderRight: '1px solid var(--app-border-base)',
                 borderLeft: '1px solid var(--app-border-base)',
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
