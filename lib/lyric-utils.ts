export interface LyricWord {
  text: string;
  start: number | null;
  end: number | null;
}

export interface LyricLine {
  id: string;
  start: number | null;
  end: number | null;
  words: LyricWord[];
  raw?: string;
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function formatTime(seconds: number | null, useThreeDigitsMs = false): string {
  if (seconds === null) return useThreeDigitsMs ? '00:00.000' : '00:00.00';
  const totalMs = Math.round(seconds * 1000);
  const m = Math.floor(totalMs / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  
  if (useThreeDigitsMs) {
     return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  } else {
     const cs = Math.floor(ms / 10);
     return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }
}

export function parseSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    return m * 60 + s;
  }
  return 0;
}

export function splitWordsAegisub(text: string): LyricWord[] {
  // Matches CJK characters, English words, punctuation keeping spaces attached
  const regex = /([\u4e00-\u9fa5]|\S+\s*|\s+)/g;
  const matches = text.match(regex) || [];
  const words = matches.filter(m => m.length > 0).map(m => ({
    text: m,
    start: null,
    end: null,
  }));
  words.push({ text: '', start: null, end: null }); // Append trailing tag placeholder
  return words;
}

export interface LrcMetadata {
  ti?: string;
  ar?: string;
  al?: string;
  au?: string;
  by?: string;
  offset?: string;
  re?: string;
  ve?: string;
  [key: string]: string | undefined;
}

export function parseRawLyrics(text: string): { lines: LyricLine[], metadata: LrcMetadata } {
  const lines = text.split(/\r?\n/);
  const result: LyricLine[] = [];
  const metadata: LrcMetadata = {};
  
  const lineTimeRegex = /^\[(\d+:\d+\.\d+)\]/;
  const metaRegex = /^\[([^:]+):(.*)\]$/;
  const wordTimeRegex = /<(\d+:\d+\.\d+)>([^<]*)/g;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const metaMatch = metaRegex.exec(line);
    if (metaMatch && !lineTimeRegex.test(line)) {
      const rawKey = metaMatch[1];
      const predefined = ['ti', 'ar', 'al', 'au', 'by', 'offset', 're', 've'];
      const lowerKey = rawKey.toLowerCase();
      const finalKey = predefined.includes(lowerKey) ? lowerKey : rawKey;
      metadata[finalKey] = metaMatch[2];
      continue;
    }
    
    let start: number | null = null;
    let cleanText = line;
    let isEnhanced = false;
    
    const match = lineTimeRegex.exec(line);
    if (match) {
      start = parseSeconds(match[1]);
      cleanText = line.substring(match[0].length);
    }
    
    if (cleanText.includes('<') && cleanText.includes('>')) {
      isEnhanced = true;
    }
    
    if (isEnhanced) {
      const words: LyricWord[] = [];
      let m;
      
      const firstTagIndex = cleanText.indexOf('<');
      if (firstTagIndex > 0) {
        words.push({ text: cleanText.substring(0, firstTagIndex), start, end: null });
      }
      
      while ((m = wordTimeRegex.exec(cleanText)) !== null) {
        const wStart = parseSeconds(m[1]);
        const wText = m[2];
        words.push({ text: wText, start: wStart, end: null });
      }
      
      result.push({
        id: generateId(),
        start,
        end: null,
        words: words.length > 0 ? words : splitWordsAegisub(cleanText.replace(/<\d+:\d+\.\d+>/g, '')),
        raw: cleanText.replace(/<\d+:\d+\.\d+>/g, ''),
      });
    } else {
      result.push({
        id: generateId(),
        start,
        end: null,
        words: splitWordsAegisub(cleanText),
        raw: cleanText,
      });
    }
  }
  
  return { lines: result, metadata };
}

export function exportLrc(lines: LyricLine[], metadata?: LrcMetadata, isEnhanced = false, isSimple = false, simpleIncludeInstrumental = false, paragraphStarts?: boolean[]): string {
  let lrc = '';
  
  if (!isSimple && metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value) {
        lrc += `[${key}:${value}]\n`;
      }
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSimple && simpleIncludeInstrumental && i > 0 && paragraphStarts && paragraphStarts[i]) {
       lrc += `\n`;
    }
    
    if (isSimple) {
      lrc += `${line.words.map(w => w.text).join('')}\n`;
      continue;
    }
    
    if (line.start === null) {
      lrc += `${line.words.map(w => w.text).join('')}\n`;
      continue;
    }
    
    const lineTime = isEnhanced ? `[${formatTime(line.start, true)}]` : `[${formatTime(line.start)}]`;
    
    if (isEnhanced) {
      let lineText = '';
      for (const w of line.words) {
        if (w.start !== null) {
          lineText += `<${formatTime(w.start, true)}>${w.text}`;
        } else {
          lineText += w.text;
        }
      }
      lrc += `${lineTime}${lineText}\n`;
    } else {
      lrc += `${lineTime}${line.words.map(w => w.text).join('')}\n`;
    }
  }
  
  return lrc;
}
