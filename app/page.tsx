import React from 'react';
import { EditorProvider } from '@/components/EditorProvider';
import { TopToolbar } from '@/components/TopToolbar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { DialogProvider } from '@/components/DialogProvider';

export default function Page() {
  return (
    <DialogProvider>
      <EditorProvider>
        <main className="h-screen w-full bg-[#0F1115] text-[#E0E0E0] font-sans flex flex-col overflow-hidden selection:bg-[#F27D26]/30">
          <TopToolbar />
          <ResizableLayout />
        </main>
      </EditorProvider>
    </DialogProvider>
  );
}
