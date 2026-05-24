"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useEditor } from "@/components/base/EditorProvider";
import {
  parseRawLyrics,
  exportLrc,
  splitWordsAegisub,
} from "@/lib/lyric-utils";
import { LineNumberedTextarea } from "@/components/common/LineNumberedTextarea";
import { useI18n } from "@/hooks/useI18n";
import { useDialogs } from "@/components/dialog/DialogProvider";
import { Search, X, ChevronUp, ChevronDown, Replace, ReplaceAll } from "lucide-react";

export function TextEditor() {
  const {
    lines,
    setLines,
    commitLines,
    exportFormat,
    setActiveLineIndex,
    setActiveWordIndex,
    lrcMetadata,
    setLrcMetadata,
    activeLineIndex,
  } = useEditor();
  const [text, setText] = useState("");
  const isDirty = useRef(false);
  const i18n = useI18n();
  const dialogs = useDialogs();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search & Replace state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!searchText) return [];
    const lowerSource = text.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const newMatches = [];
    let startIndex = 0;
    while (true) {
      const index = lowerSource.indexOf(lowerSearch, startIndex);
      if (index === -1) break;
      newMatches.push({ start: index, end: index + searchText.length });
      startIndex = index + searchText.length;
    }
    return newMatches;
  }, [text, searchText]);

  useEffect(() => {
    if (matches.length > 0) {
      if (currentMatchIndex >= matches.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentMatchIndex(matches.length - 1);
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMatchIndex(0);
    }
  }, [matches.length, currentMatchIndex]);

  const scrollToMatch = (index: number) => {
    if (!textareaRef.current) return;
    const match = matches[index];
    if (!match) return;
    const textarea = textareaRef.current;
    
    textarea.focus();
    textarea.setSelectionRange(match.start, match.end);

    // approximate scroll
    const textUpToMatch = text.substring(0, match.start);
    const targetRow = textUpToMatch.split("\n").length - 1;

    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight || "24") || 24;
    textarea.scrollTop = Math.max(
      0,
      targetRow * lineHeight - textarea.clientHeight / 2,
    );
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(nextIndex);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(prevIndex);
  };

  const handleReplace = () => {
    if (matches.length === 0) return;
    const match = matches[currentMatchIndex];
    if (!match) return;

    const newText = text.substring(0, match.start) + replaceText + text.substring(match.end);
    setText(newText);
    isDirty.current = true;
    saveChanges(newText);
    
    // It will auto-recalculate matches. 
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    // Replace from end to start to avoid index shifting
    let newText = text;
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      newText = newText.substring(0, match.start) + replaceText + newText.substring(match.end);
    }
    setText(newText);
    isDirty.current = true;
    saveChanges(newText);
  };

  useEffect(() => {
    // Initial sync from lines to text if not dirty
    if (!isDirty.current) {
      let newText = exportLrc(lines, lrcMetadata, true, false); // force ELRC

      if (text !== newText) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setText(newText || "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, exportFormat, lrcMetadata]);

  useEffect(() => {
    const handler = (e: any) => {
      const lineIndex = e.detail?.lineIndex;
      if (lineIndex !== undefined && textareaRef.current) {
        const metadataLinesCount = Object.values(lrcMetadata || {}).filter(
          Boolean,
        ).length;
        const targetRow = metadataLinesCount + lineIndex;

        let pos = 0;
        const splitLines = text.split("\n");
        for (let i = 0; i < targetRow && i < splitLines.length; i++) {
          pos += splitLines[i].length + 1;
        }

        const textarea = textareaRef.current;
        textarea.focus();
        textarea.setSelectionRange(
          pos,
          pos + (splitLines[targetRow]?.length || 0),
        );

        // Hack to scroll into view
        const lineHeight =
          parseInt(window.getComputedStyle(textarea).lineHeight || "24") || 24;
        textarea.scrollTop = Math.max(
          0,
          targetRow * lineHeight - textarea.clientHeight / 2,
        );
      }
    };
    window.addEventListener("focus-raw-text-line", handler);
    return () => window.removeEventListener("focus-raw-text-line", handler);
  }, [text, lrcMetadata]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    isDirty.current = true;
  };

  const saveChanges = (forceText?: string) => {
    if (!isDirty.current && forceText === undefined) return;

    const textToParse = forceText !== undefined ? forceText : text;
    const parsed = parseRawLyrics(textToParse);
    let resultLines = parsed.lines;
    setLrcMetadata(parsed.metadata);
    commitLines(resultLines, "Edit Raw Lyrics");

    // Auto-detect if all timestamps are cleared, if so, reset the active index to 0
    const hasAnyTimestamps = resultLines.some(
      (l) => l.start !== null || l.words.some((w) => w.start !== null),
    );
    if (!hasAnyTimestamps) {
      setActiveLineIndex(0);
      setActiveWordIndex(0);
    }

    isDirty.current = false;
  };

  const handleTextBlur = () => {
    saveChanges();
  };

  const [isResponsiveTall, setIsResponsiveTall] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsResponsiveTall(window.innerWidth >= 1024 || window.innerHeight > 1110);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`flex flex-col flex-1 ${isResponsiveTall ? 'min-h-0 h-full' : 'min-h-[50vh]'} bg-[var(--app-bg-panel-alt)]`}>
      <div className="p-2 bg-[var(--app-bg-panel)] border-b border-[var(--app-border-base)] flex flex-wrap gap-2 items-center justify-between shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-[var(--app-border-base)] rounded text-[10px] font-bold uppercase tracking-widest border border-[var(--app-border-light)] text-[var(--app-text-secondary)]">
            WITH TIMESTAMPS (ELRC)
          </span>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`px-3 py-1 flex items-center text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${
              isSearchOpen
                ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                : "border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-white"
            }`}
            title="Search & Replace (Ctrl+F)"
          >
            <Search className="w-3 h-3 mr-1" />
            搜尋 / 取代
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const { convertToTraditional } =
                await import("@/lib/chinese-conv");
              setText((t) => {
                const next = convertToTraditional(t);
                isDirty.current = true;
                setTimeout(() => saveChanges(next), 0);
                return next;
              });
            }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-white transition-colors"
          >
            轉成繁體
          </button>
          <button
            onClick={async () => {
              const { convertToSimplified } =
                await import("@/lib/chinese-conv");
              setText((t) => {
                const next = convertToSimplified(t);
                isDirty.current = true;
                setTimeout(() => saveChanges(next), 0);
                return next;
              });
            }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-white transition-colors"
          >
            轉成簡體
          </button>

          <div className="w-px bg-[var(--app-border-light)] opacity-50 my-1 mx-1"></div>

          <button
            onClick={() => {
              setText((t) => {
                const parsed = parseRawLyrics(t);
                const next = exportLrc(
                  parsed.lines,
                  parsed.metadata,
                  false,
                  false,
                );
                isDirty.current = true;
                setTimeout(() => saveChanges(next), 0);
                return next;
              });
            }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-[var(--app-border-light)] text-[var(--app-text-muted)] hover:text-orange-400 transition-colors"
          >
            轉成 標準LRC (逐行同步)
          </button>
          <button
            onClick={() => {
              setText((t) => {
                const parsed = parseRawLyrics(t);
                let metaStr = "";
                for (const [key, value] of Object.entries(parsed.metadata)) {
                  if (value) metaStr += `[${key}:${value}]\n`;
                }
                const next =
                  metaStr +
                  parsed.lines
                    .map((l) => l.words.map((w) => w.text).join(""))
                    .join("\n");
                isDirty.current = true;
                setTimeout(() => saveChanges(next), 0);
                return next;
              });
            }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-red-900/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            轉成 簡易歌詞 (無時間戳)
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="p-2 border-b border-[var(--app-border-base)] bg-[var(--app-bg-input)] flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[300px]">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
              <input
                id="search-input"
                type="text"
                placeholder="搜尋文字..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-[var(--app-bg-panel-alt)] border border-[var(--app-border-base)] rounded px-8 py-1 text-sm text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:border-[var(--app-border-light)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  }
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    textareaRef.current?.focus();
                  }
                }}
              />
              {matches.length > 0 && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-[var(--app-text-muted)]">
                  {currentMatchIndex + 1} / {matches.length}
                </span>
              )}
            </div>
            
            <button
              onClick={handlePrevMatch}
              disabled={matches.length === 0}
              className="p-1.5 text-[var(--app-text-muted)] hover:text-white hover:bg-[var(--app-bg-panel-hover)] rounded disabled:opacity-50 disabled:hover:bg-transparent"
              title="上一處 (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matches.length === 0}
              className="p-1.5 text-[var(--app-text-muted)] hover:text-white hover:bg-[var(--app-bg-panel-hover)] rounded disabled:opacity-50 disabled:hover:bg-transparent"
              title="下一處 (Enter)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[var(--app-border-light)] mx-1 opacity-50"></div>

            <button
              onClick={() => {
                setIsSearchOpen(false);
                textareaRef.current?.focus();
              }}
              className="ml-auto p-1 text-[var(--app-text-muted)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[300px]">
              <Replace className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
              <input
                type="text"
                placeholder="取代為..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="w-full bg-[var(--app-bg-panel-alt)] border border-[var(--app-border-base)] rounded px-8 py-1 text-sm text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:border-[var(--app-border-light)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleReplace();
                  }
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    textareaRef.current?.focus();
                  }
                }}
              />
            </div>

            <button
              onClick={handleReplace}
              disabled={matches.length === 0}
              className="px-3 py-1 bg-[var(--app-bg-panel-alt)] border border-[var(--app-border-base)] hover:border-blue-500/50 hover:text-blue-400 rounded text-xs text-[var(--app-text-secondary)] disabled:opacity-50 transition-colors"
            >
              取代
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
              className="px-3 py-1 bg-[var(--app-bg-panel-alt)] border border-[var(--app-border-base)] hover:border-blue-500/50 hover:text-blue-400 rounded text-xs text-[var(--app-text-secondary)] disabled:opacity-50 transition-colors"
              title="全部取代"
            >
              <ReplaceAll className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              全部取代
            </button>
          </div>
        </div>
      )}

      <LineNumberedTextarea
        ref={textareaRef}
        className="flex-1 rounded-none border-0 border-t border-[var(--app-border-base)] shadow-inner text-[var(--app-text-secondary)]"
        placeholder="Paste your raw LRC with timestamps here..."
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            e.preventDefault();
            setIsSearchOpen(true);
            setTimeout(() => {
              document.getElementById("search-input")?.focus();
            }, 0);
          }
        }}
        startLineNumber={
          Object.values(lrcMetadata || {}).filter(Boolean).length + 1
        }
      />
    </div>
  );
}
