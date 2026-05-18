import React from 'react';
import { EditorProvider } from '@/components/EditorProvider';
import { TopToolbar } from '@/components/TopToolbar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { DialogProvider } from '@/components/DialogProvider';

export default function Page() {
  return (
    <DialogProvider>
      <EditorProvider>
        <main className="h-screen w-full bg-[var(--app-bg-base)] text-[var(--app-text-secondary)] font-sans flex flex-col overflow-hidden selection:bg-[var(--app-accent)]/30">
          <TopToolbar />
          <ResizableLayout />
        </main>
      </EditorProvider>
    </DialogProvider>
  );
}
