export interface HistoryItem {
  id: string;
  name: string;
}

export interface AppCommandsType {
  loadMedia: null | (() => void);
  loadLyrics: null | (() => void);
  clearMedia: null | (() => Promise<void>);
  clearLyrics: null | (() => Promise<void>);
  loadEmbeddedLyrics: null | (() => Promise<void>);
  
  undo: null | (() => void);
  redo: null | (() => void);
  undoToSequence: null | ((steps: number) => void);
  redoToSequence: null | ((steps: number) => void);
  
  getUndoList: null | (() => HistoryItem[]);
  getRedoList: null | (() => HistoryItem[]);
  
  exportStandard: null | (() => void);
  exportEnhanced: null | (() => void);
  shiftTime: null | (() => Promise<void>);
  
  register: (handlers: Partial<Omit<AppCommandsType, "register">>) => void;
}

export const AppCommands: AppCommandsType = {
  loadMedia: null,
  loadLyrics: null,
  clearMedia: null,
  clearLyrics: null,
  loadEmbeddedLyrics: null,
  
  undo: null,
  redo: null,
  undoToSequence: null,
  redoToSequence: null,
  
  getUndoList: null,
  getRedoList: null,
  
  exportStandard: null,
  exportEnhanced: null,
  shiftTime: null,
  
  register: (handlers: Partial<Omit<AppCommandsType, "register">>) => {
    for (const [key, value] of Object.entries(handlers)) {
      if (key !== 'register') {
        (AppCommands as any)[key] = value;
      }
    }
  }
};

if (typeof window !== 'undefined') {
  (window as any).AppCommands = AppCommands;
}
