import React from 'react';
import { EditorProvider } from '@/components/EditorProvider';
import { TopToolbar } from '@/components/TopToolbar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { DialogProvider } from '@/components/DialogProvider';
import { WebSystemIntegration } from '@/components/WebSystemIntegration';
import { TextContextMenu } from '@/components/TextContextMenu';

export default function Page() {
  return (
    <DialogProvider>
      <WebSystemIntegration />
      <TextContextMenu />
      <EditorProvider>
        <main className="h-[100dvh] w-full bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] font-sans flex flex-col lg:overflow-hidden overflow-y-auto custom-scrollbar selection:bg-[var(--app-accent)]/30">
          <TopToolbar />
          <ResizableLayout />
        </main>
      </EditorProvider>
    </DialogProvider>
  );
}
