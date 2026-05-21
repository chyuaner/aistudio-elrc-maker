import { LyricLine, LrcMetadata } from './lyric-utils';
import { FileMetadata } from '@/components/EditorProvider';

export interface AssOptions {
  fontName: string;
  fontSize: number;
  fadeInOutTime: number; // in seconds
  primaryColor: string; // Hex AABBGGRR
  secondaryColor: string; // Hex AABBGGRR
  outlineColor: string; // Hex AABBGGRR
  titlePrimaryColor: string;
  titleSecondaryColor: string;
  dualGapThreshold?: number;
  interludeLogoUrl?: string; // 預留: 間奏Logo圖檔URL (未實作繪製)
}

function timeToAss(seconds: number) {
   const h = Math.floor(seconds / 3600);
   const m = Math.floor((seconds % 3600) / 60);
   const s = Math.floor(seconds % 60);
   const cs = Math.floor((seconds % 1) * 100);
   return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export function generateAss(lines: LyricLine[], lrcMeta: LrcMetadata, fileMeta: FileMetadata | null, options: AssOptions) {
    const {
        fontName, fontSize, fadeInOutTime, primaryColor, secondaryColor, outlineColor, titlePrimaryColor, titleSecondaryColor
    } = options;
    const fadeMs = Math.round(fadeInOutTime * 1000);
    const dualGap = options.dualGapThreshold || 6.0;

    let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TopLine,${fontName},${fontSize},&H${primaryColor},&H${secondaryColor},&H${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,3,0,4,150,150,220,1
Style: BottomLine,${fontName},${fontSize},&H${primaryColor},&H${secondaryColor},&H${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,3,0,6,150,150,120,1
Style: TitleRed,${fontName},80,&H${titlePrimaryColor},&H${titlePrimaryColor},&H${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,4,0,5,10,10,250,1
Style: TitleBlue,${fontName},60,&H${titleSecondaryColor},&H${titleSecondaryColor},&H${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,3,0,5,10,10,120,1
Style: BottomCenter,${fontName},${fontSize},&H${primaryColor},&H${secondaryColor},&H${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,100,100,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Extract paragraphs
    const paragraphs: LyricLine[][] = [];
    let currentPara: LyricLine[] = [];
    let prevEnd = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.start === null) continue;
        
        let gap = line.start - prevEnd;
        if (gap >= dualGap && currentPara.length > 0) {
            paragraphs.push(currentPara);
            currentPara = [];
        }
        currentPara.push(line);
        if (line.end !== null) prevEnd = line.end;
        else if (line.words.length) {
            const w = [...line.words].reverse().find(x => x.start !== null);
            prevEnd = w?.end || w?.start || line.start;
        } else {
            prevEnd = line.start;
        }
    }
    if (currentPara.length > 0) paragraphs.push(currentPara);

    // Render Title
    let titleShown = false;
    const firstLineStart = lines.find(l => l.start !== null)?.start || 0;
    
    // Check if we can show title before first line starts
    if (firstLineStart >= 6.0) {
        ass += `Dialogue: 0,0:00:00.00,0:00:05.00,TitleRed,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.title || lrcMeta?.ti || 'Unknown Title'}\n`;
        ass += `Dialogue: 0,0:00:00.00,0:00:05.00,TitleBlue,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.artist || lrcMeta?.ar || 'Unknown Artist'}\n`;
        titleShown = true;
    }

    if (!titleShown && paragraphs.length > 1) {
        // Find gap
        for (let i = 0; i < paragraphs.length - 1; i++) {
             const p1 = paragraphs[i];
             const p2 = paragraphs[i+1];
             const end = p1[p1.length - 1].end || p1[p1.length - 1].start!;
             const start = p2[0].start!;
             if (start - end >= 6.0 && end < 60.0) {
                 ass += `Dialogue: 0,${timeToAss(end + 0.5)},${timeToAss(end + 5.5)},TitleRed,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.title || lrcMeta?.ti || 'Unknown Title'}\n`;
                 ass += `Dialogue: 0,${timeToAss(end + 0.5)},${timeToAss(end + 5.5)},TitleBlue,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.artist || lrcMeta?.ar || 'Unknown Artist'}\n`;
                 titleShown = true;
                 break;
             }
        }
    }
    
    if (!titleShown && firstLineStart > 0) {
         // Show concurrently, fading out at 5s
         ass += `Dialogue: 0,0:00:00.00,0:00:05.00,TitleRed,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.title || lrcMeta?.ti || 'Unknown Title'}\n`;
         ass += `Dialogue: 0,0:00:00.00,0:00:05.00,TitleBlue,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${fileMeta?.artist || lrcMeta?.ar || 'Unknown Artist'}\n`;
    }

    let prevParaEnd = 0;

    for (const para of paragraphs) {
        const paraStart = para[0].start!;
        let pEnd = para[para.length - 1].end;
        if (pEnd === null) {
            const w = [...para[para.length - 1].words].reverse().find(x => x.start !== null);
            pEnd = w?.end || w?.start || paraStart;
        }
        
        let paraAppearTime = Math.max(prevParaEnd + 0.1, paraStart - 5.0);
        let paraDisappearTime = pEnd;
        
        // Render dots
        const leadTime = paraStart - paraAppearTime;
        if (leadTime > 1.0) {
            // Generates dots
            const d3Start = paraAppearTime;
            const d3End = Math.max(d3Start, paraStart - 2.0);
            const d2End = Math.max(d3End, paraStart - 1.0);
            
            const style = para.length === 1 ? 'BottomCenter' : 'TopLine';
            let l0Text = para[0].words.map(w => w.text).join('').replace(/\\/g, '');
            
            if (d3End > d3Start) {
                 ass += `Dialogue: 2,${timeToAss(d3Start)},${timeToAss(d3End)},${style},,0,0,0,,{\\fad(${fadeMs},0)}{\\alpha&H00&}●●●\\N{\\alpha&HFF&}${l0Text}\n`;
            }
            if (d2End > d3End) {
                 const inFade = d3End <= d3Start ? `{\\fad(${fadeMs},0)}` : '';
                 ass += `Dialogue: 2,${timeToAss(d3End)},${timeToAss(d2End)},${style},,0,0,0,,${inFade}{\\alpha&HFF&}●{\\alpha&H00&}●●\\N{\\alpha&HFF&}${l0Text}\n`;
            }
            if (paraStart > d2End) {
                 const inFade = d2End <= d3Start ? `{\\fad(${fadeMs},0)}` : '';
                 ass += `Dialogue: 2,${timeToAss(d2End)},${timeToAss(paraStart)},${style},,0,0,0,,${inFade}{\\alpha&HFF&}●●{\\alpha&H00&}●\\N{\\alpha&HFF&}${l0Text}\n`;
            }
        }

        for (let j = 0; j < para.length; j++) {
            const line = para[j];
            const isSingle = para.length === 1;
            const trackStyle = isSingle ? 'BottomCenter' : (j % 2 === 0 ? 'TopLine' : 'BottomLine');
            
            let appearTime = (j === 0 || j === 1) ? paraAppearTime : para[j-1].start!;
            let disappearTime = (j + 2 < para.length) ? para[j+1].start! : paraDisappearTime;
            
            // Generate kara text
            let textK = '';
            let currentLineTime = line.start!;
            for (let w = 0; w < line.words.length; w++) {
                const word = line.words[w];
                const wStart = word.start !== null ? word.start : currentLineTime;
                
                // Gap before word
                if (wStart > currentLineTime) {
                    const durationCs = Math.round((wStart - currentLineTime) * 100);
                    if (durationCs > 0) textK += `{\\K${durationCs}}`;
                }
                
                const wEnd = word.end !== null ? word.end : wStart;
                const durCs = Math.round((wEnd - wStart) * 100);
                if (durCs > 0) textK += `{\\kf${durCs}}`;
                
                textK += word.text.replace(/\\/g, '');
                currentLineTime = wEnd;
            }
            
            let kEvents = `{\\K${Math.max(0, Math.round((line.start! - appearTime)*100))}}${textK}`;
            
            const hasFadeIn = Math.abs(appearTime - paraAppearTime) < 0.05;
            const hasFadeOut = Math.abs(disappearTime - paraDisappearTime) < 0.05;
            const inM = hasFadeIn ? fadeMs : 0;
            const outM = hasFadeOut ? fadeMs : 0;
            
            let fadeEffect = '';
            if (inM > 0 || outM > 0) fadeEffect = `{\\fad(${inM},${outM})}`;
            
            // Add transparent dots prefix if it's the first line Top
            let prefix = '';
            if (j === 0 && (trackStyle === 'TopLine' || trackStyle === 'BottomCenter')) {
                 prefix = `{\\alpha&HFF&}●●●\\N{\\alpha&H00&}`;
            }

            ass += `Dialogue: 1,${timeToAss(appearTime)},${timeToAss(disappearTime)},${trackStyle},,0,0,0,,${fadeEffect}${prefix}${kEvents}\n`;
        }
        
        prevParaEnd = paraDisappearTime;
    }

    return ass;
}
