import { LyricLine, LrcMetadata } from './lyric-utils';

export interface AssOptions {
  primaryColor: string; // hex
  color2: string; // hex
  color3: string; // hex
  chorusColor: string; // hex
  fontFamily: string;
  fontSize: number;
  songInfoTitle: string;
  songInfoArtist: string;
  songInfoAlbum: string;
  songInfoCustom: string;
  infoFontSize: number;
  infoTitleFontSize: number;
  customStartInfoTime: boolean;
  startInfoStartTime: number;
  startInfoEndTime: number;
  interludeThreshold: number; // in seconds
  fadeInOutTime: number; // in seconds
  dualRowSpacing: number; // in pixels
  dualRowMarginL: number; // in pixels
  dualRowMarginR: number; // in pixels
  dualRowMarginV: number; // in pixels
  nextTriggerIndex: number;
  row2FadeoutMode: 'immediate' | 'delayed';
  interludeBuffer: number;
}

// 內部控制參數
const DEFAULT_INFO_STAY_TIME = 6.0;

// =========================================================================
// 【核心設計與模式微調參數】
// =========================================================================
// 1. 歌詞邊框渲染模式 (LYRICS_OUTLINE_MODE)
//    - 'simulated-dual-layer': 雙層模擬追光白邊模式（未唱白色+黑色外框，起唱漸變為設定主體色+白色外框）。
//    - 'traditional': 傳統單層黑色邊框模式（外框永遠為完美實心黑色，歌詞本體由白字漸變為設定的主體色）。
const LYRICS_OUTLINE_MODE: 'simulated-dual-layer' | 'traditional' = 'simulated-dual-layer';

// 2. 歌曲資訊 (前奏/間奏開始資訊) 外框構造模式 (INFO_OUTLINE_MODE)
//    - 'simulated-dual-layer': 雙層模擬白色粗外框模式（文字本體為紅色/藍色，背底微調多層純白外框，呈現粗白描邊效果）。
//    - 'traditional': 傳統單層黑色描邊模式（文字本體為紅色/藍色，邊框為實心黑色）。
const INFO_OUTLINE_MODE: 'simulated-dual-layer' | 'traditional' = 'simulated-dual-layer';

// 3. 仿雙層邊框粗細設定 (SIMULATED_OUTLINE_WIDTH)
//    適用於 'simulated-dual-layer' 模式，單位為像素，預設為 3。數值越大外框越粗，反之越細。
const SIMULATED_OUTLINE_WIDTH = 3;

function formatAssTime(timeInSeconds: number) {
  const h = Math.floor(timeInSeconds / 3600);
  const m = Math.floor((timeInSeconds % 3600) / 60);
  const s = Math.floor(timeInSeconds % 60);
  const cs = Math.floor((timeInSeconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function hexToAssColor(hex: string) {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = cleanHex.slice(0, 2);
    const g = cleanHex.slice(2, 4);
    const b = cleanHex.slice(4, 6);
    return `&H00${b}${g}${r}`;
  }
  return `&H00FFFFFF`;
}

// 產生 SVG 風格的小白圓向量圖形 (ASS Vector)
function getDotsVector(count: number, r: number, spacing: number) {
   let path = '';
   for (let i = 0; i < count; i++) {
      const cx = i * spacing;
      // 貝茲曲線控制點用來畫圓 (圓半徑 * 0.55228)
      const c = Math.round(r * 0.55228);
      path += `m ${cx} ${-r} b ${cx+c} ${-r} ${cx+r} ${-c} ${cx+r} 0 b ${cx+r} ${c} ${cx+c} ${r} ${cx} ${r} b ${cx-c} ${r} ${cx-r} ${c} ${cx-r} 0 b ${cx-r} ${-c} ${cx-c} ${-r} ${cx} ${-r} `;
   }
   return path;
}

function getLineEndTime(line: LyricLine): number {
    if (line.end !== null) return line.end;
    if (line.words && line.words.length > 0) {
        const lastWord = line.words[line.words.length - 1];
        if (lastWord.start !== null) {
            if (lastWord.text.trim() === '') {
                return lastWord.start;
            }
            return lastWord.start + Math.max(0.5, lastWord.text.length * 0.2);
        }
    }
    return (line.start || 0) + 2;
}

export function generateAss(lines: LyricLine[], metadata: LrcMetadata, options: AssOptions): string {
  const primaryAssColor = hexToAssColor(options.primaryColor);
  
  // 樣式設定
  const styles = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${options.fontFamily},20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1
Style: TopLeft,${options.fontFamily},72,&H00FFFFFF,&H00FFFFFF,&H99000000,&H99000000,0,0,0,0,100,100,0,0,3,1.5,0,7,48,48,48,0
Style: TopCenter,${options.fontFamily},72,&H00FFFFFF,&H00FFFFFF,&H99000000,&H99000000,0,0,0,0,100,100,0,0,3,1.5,0,8,48,48,48,0
Style: TopRight,${options.fontFamily},72,&H00FFFFFF,&H00FFFFFF,&H99000000,&H99000000,0,0,0,0,100,100,0,0,3,1.5,0,9,48,48,48,0
Style: BottomLeft,${options.fontFamily},${options.fontSize},${primaryAssColor},&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,4,0,1,${options.dualRowMarginL !== undefined ? options.dualRowMarginL : 150},${options.dualRowMarginR !== undefined ? options.dualRowMarginR : 150},${(options.dualRowMarginV !== undefined ? options.dualRowMarginV : 50) + options.dualRowSpacing},0
Style: BottomCenter,${options.fontFamily},${options.fontSize},${primaryAssColor},&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,4,0,2,48,48,48,0
Style: BottomRight,${options.fontFamily},${options.fontSize},${primaryAssColor},&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,4,0,3,${options.dualRowMarginL !== undefined ? options.dualRowMarginL : 150},${options.dualRowMarginR !== undefined ? options.dualRowMarginR : 150},${options.dualRowMarginV !== undefined ? options.dualRowMarginV : 50},0
Style: CenterInfo,${options.fontFamily},${options.infoFontSize || (options.fontSize - 40)},${primaryAssColor},&H00FFFFFF,&H99000000,&H99000000,0,0,0,0,100,100,0,0,1,4,0,5,48,48,48,0
`;

  let ass = `[Script Info]
; Script generated by Enhanced LRC Studio KTV Exporter
Title: KTV ASS
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

${styles}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // 過濾掉無效的歌詞行
  const validLines = lines.filter(l => l.start !== null && l.words.some(w => w.text.trim().length > 0));
  
  // 依據「間奏閥值」(interludeThreshold) 以及是否有「強制單行 (isSingleLine)」將歌詞切分成段落
  const paragraphs: LyricLine[][] = [];
  let currentPara: LyricLine[] = [];
  
  for (let i = 0; i < validLines.length; i++) {
    const line = validLines[i];
    const prevEnd = i > 0 ? getLineEndTime(validLines[i - 1]) : 0;
    const prevIsSingle = i > 0 && !!validLines[i - 1].isSingleLine;
    
    const shouldCut = 
      (currentPara.length > 0 && line.start! - prevEnd >= options.interludeThreshold) ||
      (currentPara.length > 0 && !!line.isSingleLine) ||
      prevIsSingle;
      
    if (shouldCut && currentPara.length > 0) {
      paragraphs.push(currentPara);
      currentPara = [];
    }
    currentPara.push(line);
  }
  if (currentPara.length > 0) paragraphs.push(currentPara);
  
  // 歌曲前奏資訊計算
  let infoStart = 0.5;
  let infoEnd = DEFAULT_INFO_STAY_TIME;
  if (!options.customStartInfoTime) {
    if (paragraphs.length > 0 && paragraphs[0][0].start! < DEFAULT_INFO_STAY_TIME) {
       const firstParaEnd = getLineEndTime(paragraphs[0][paragraphs[0].length - 1]);
       if (firstParaEnd > 60) {
           infoStart = 0.5;
           infoEnd = DEFAULT_INFO_STAY_TIME;
       } else {
           infoStart = firstParaEnd;
           infoEnd = firstParaEnd + DEFAULT_INFO_STAY_TIME;
       }
    } else {
       infoStart = 0.5;
       infoEnd = Math.min(DEFAULT_INFO_STAY_TIME, paragraphs.length > 0 ? paragraphs[0][0].start! : DEFAULT_INFO_STAY_TIME);
    }
  } else {
    infoStart = options.startInfoStartTime;
    infoEnd = options.startInfoEndTime;
  }
  
  const fadeMs = Math.round(options.fadeInOutTime * 1000); // fade duration tag

  // =========================================================================
  // 【請注意！手動微調 KTV 開始資訊位置與防重疊避讓邏輯】
  // =========================================================================
  const titleSize = options.infoTitleFontSize || (options.fontSize - 10);
  const detailFontSize = options.infoFontSize || (options.fontSize - 40);

  // 1. 檢測「歌曲開始資訊」的顯示區間 [infoStart, infoEnd] 是否與音軌中的任何段落（歌詞）顯示區間重疊
  let overlapsWithLyrics = false;
  const dotDuration = 1.0;
  paragraphs.forEach((p, idx) => {
      const prevEnd = idx > 0 ? getLineEndTime(paragraphs[idx - 1][paragraphs[idx - 1].length - 1]) : 0;
      const gap = p[0].start! - prevEnd;
      
      let dotCount = 0;
      let maxAdvance = p[0].start!;
      if (idx > 0) maxAdvance = gap;
      if (maxAdvance > 1.0) {
          dotCount = Math.min(4, Math.floor(maxAdvance - 1.0));
      }
      
      let actualAdvance = 0;
      if (dotCount > 0) {
          actualAdvance = dotCount * dotDuration + 1.0 + options.fadeInOutTime;
      } else {
          actualAdvance = Math.min(2.0, maxAdvance) + options.fadeInOutTime;
      }
      
      const blockDisplayStart = Math.max(prevEnd, p[0].start! - actualAdvance);
      const blockDisplayEnd = getLineEndTime(p[p.length - 1]) + 2.0 + options.fadeInOutTime; 
      const truncatedBlockEnd = idx < paragraphs.length - 1 ? Math.min(blockDisplayEnd, paragraphs[idx + 1][0].start! - 0.1) : blockDisplayEnd;

      // 判斷兩者時間區間是否有交集 [infoStart, infoEnd] 與 [blockDisplayStart, truncatedBlockEnd]
      if (Math.max(infoStart, blockDisplayStart) < Math.min(infoEnd, truncatedBlockEnd)) {
          overlapsWithLyrics = true;
      }
  });

  // 2. 藍色歌曲資訊的排版：自底部往上排 (BottomCenter)
  // 若發生時間重疊，將 detailBottomY 拉到雙行歌詞之上
  let detailBottomY = 1025; 
  if (overlapsWithLyrics) {
      // 雙行歌詞第一排(BottomLeft)的上緣：1080 - 50 - dualRowSpacing - fontSize
      // 我們要把歌曲詳細資訊底邊放在這個上緣之上至少 60 像素
      const lyricsTopY = 1080 - 50 - options.dualRowSpacing - options.fontSize;
      detailBottomY = Math.round(lyricsTopY - 60);
  }

  // 3. 紅色標題字的排版：
  // 若未重疊，則放畫面中央偏上 (540 - 1.5 行)
  // 若發生重疊，將其置於歌曲詳細資訊最上方行的上面，確保文字學上完全不重疊，且維持 40px 的安全間距 (標題是 an5 置中-置中，需減去半個字高與 40px 間距)
  let titleY = 540 - Math.round(1.5 * titleSize);

  // 建立歌曲資訊行陣列
  const artistAlbum = [];
  if (options.songInfoArtist) artistAlbum.push(`{\\c&H00FF0000&}主唱：${options.songInfoArtist}`);
  if (options.songInfoAlbum) artistAlbum.push(`{\\c&H00FF0000&}專輯：${options.songInfoAlbum}`);
  if (options.songInfoCustom) {
      const customLines = options.songInfoCustom.split('\n');
      customLines.forEach(line => {
          if (line.trim()) {
              artistAlbum.push(`{\\c&H00FF0000&}${line.trim()}`);
          }
      });
  }

  // 當歌曲資訊低於三行字的時候，再多空一行，讓整體往上移一行以增加美觀
  if (artistAlbum.length > 0 && artistAlbum.length < 3) {
      artistAlbum.push('\\h');
  }

  if (overlapsWithLyrics && artistAlbum.length > 0) {
      // 計算歌曲詳細資訊的實際總高度 (包括新加的空行)
      const detailHeight = artistAlbum.length * detailFontSize;
      titleY = Math.round(detailBottomY - detailHeight - 40 - (titleSize / 2));
  }

  const offsets = [
    { dx: -SIMULATED_OUTLINE_WIDTH, dy: -SIMULATED_OUTLINE_WIDTH },
    { dx: SIMULATED_OUTLINE_WIDTH, dy: -SIMULATED_OUTLINE_WIDTH },
    { dx: -SIMULATED_OUTLINE_WIDTH, dy: SIMULATED_OUTLINE_WIDTH },
    { dx: SIMULATED_OUTLINE_WIDTH, dy: SIMULATED_OUTLINE_WIDTH },
  ];

  // 4. 產生紅色標題 Dialogue
  if (options.songInfoTitle) {
      if (INFO_OUTLINE_MODE === 'simulated-dual-layer') {
          // 外框層 (底層)：位移 4 個方向，顏色設為純白 &HFFFFFF&
          offsets.forEach(({ dx, dy }) => {
              const outlineTitleText = `{\\fad(${fadeMs},${fadeMs})\\an5\\pos(${960 + dx},${titleY + dy})\\fs${titleSize}\\c&HFFFFFF&\\bord0\\shad0\\b1}${options.songInfoTitle}{\\b0}`;
              ass += `Dialogue: 10,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${outlineTitleText}\n`;
          });

          // 核心層 (頂層)：疊在中央，層級設為 12，顏色維持為紅色 body
          const coreTitleText = `{\\fad(${fadeMs},${fadeMs})\\an5\\pos(960,${titleY})\\fs${titleSize}\\c&H000000FF&\\bord0\\shad0\\b1}${options.songInfoTitle}{\\b0}`;
          ass += `Dialogue: 12,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${coreTitleText}\n`;
      } else {
          // 傳統單層黑色邊框模式：使用組件內建 \bord3\3c&H000000&，本體為紅色 \c&H000000FF&
          const coreTitleText = `{\\fad(${fadeMs},${fadeMs})\\an5\\pos(960,${titleY})\\fs${titleSize}\\c&H000000FF&\\bord3\\shad0\\3c&H000000&\\b1}${options.songInfoTitle}{\\b0}`;
          ass += `Dialogue: 10,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${coreTitleText}\n`;
      }
  }

  // 5. 產生歌曲資訊 Dialogue (底部往上排列，使用計算出的 detailBottomY)
  if (artistAlbum.length > 0) {
      if (INFO_OUTLINE_MODE === 'simulated-dual-layer') {
          // 藉由 replace 把 line 裡面的顏色變更為白色
          const outlineArtistAlbum = artistAlbum.map(line => line.replace(/\\1?c&H[0-9A-Fa-f]+&/g, '\\c&HFFFFFF&'));

          // 外框層 (底層)：位移 4 個方向，顏色變更為純白
          offsets.forEach(({ dx, dy }) => {
              const outlineText = `{\\fad(${fadeMs},${fadeMs})\\an2\\pos(${960 + dx},${detailBottomY + dy})\\fs${detailFontSize}\\bord0\\shad0}${outlineArtistAlbum.join('\\N')}`;
              ass += `Dialogue: 10,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${outlineText}\n`;
          });

          // 核心層 (頂層)：疊在最中央，層級設為 12，維持原來的藍色/自訂主體顏色
          const detailText = `{\\fad(${fadeMs},${fadeMs})\\an2\\pos(960,${detailBottomY})\\fs${detailFontSize}\\bord0\\shad0}${artistAlbum.join('\\N')}`;
          ass += `Dialogue: 12,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${detailText}\n`;
      } else {
          // 傳統單層黑色邊框模式：使用組件內建 \bord3\3c&H000000&
          const detailText = `{\\fad(${fadeMs},${fadeMs})\\an2\\pos(960,${detailBottomY})\\fs${detailFontSize}\\bord3\\shad0\\3c&H000000&}${artistAlbum.join('\\N')}`;
          ass += `Dialogue: 10,${formatAssTime(infoStart)},${formatAssTime(infoEnd)},CenterInfo,,0,0,0,,${detailText}\n`;
      }
  }
  // =========================================================================

  // 倒數小白圓的控制參數 (已在上方定義過 dotDuration)
  // 計算小白圓與文字的相對大小，並使其「稍大一點點」
  const dotRadius = Math.round(options.fontSize * 0.25); 
  const dotSpacing = Math.round(options.fontSize * 0.75);
  
  // 第一階段 (Pass 1)：計算所有段落的 raw 資訊
  const pInfos = paragraphs.map((p, idx) => {
      const prevEnd = idx > 0 ? getLineEndTime(paragraphs[idx - 1][paragraphs[idx - 1].length - 1]) : 0;
      const gap = p[0].start! - prevEnd;
      
      const isRealInterlude = idx === 0 
          ? (p[0].start! >= options.interludeThreshold)
          : (gap >= options.interludeThreshold);

      let maxAdvance = p[0].start!; // 首段的話，可利用的時間是 0 到 start
      if (idx > 0) maxAdvance = gap;

      let dotCount = 0;
      if (isRealInterlude && maxAdvance > 1.0) {
          // 最多顯示 4 個倒數小圓
          dotCount = Math.min(4, Math.floor(maxAdvance - 1.0));
      }
      
      let actualAdvance = 0;
      if (dotCount > 0) {
         // 若有倒數小白圓，歌詞提早顯示時間配合圓點
         actualAdvance = dotCount * dotDuration + 1.0 + options.fadeInOutTime;
      } else {
         actualAdvance = Math.min(2.0, maxAdvance) + options.fadeInOutTime;
      }
      
      const blockDisplayStart = Math.max(prevEnd, p[0].start! - actualAdvance);
      const blockDisplayEnd = getLineEndTime(p[p.length - 1]) + 2.0 + options.fadeInOutTime;

      return {
          p,
          prevEnd,
          gap,
          isRealInterlude,
          dotCount,
          actualAdvance,
          blockDisplayStart,
          blockDisplayEnd,
          isStartRealInterlude: isRealInterlude,
          isEndRealInterlude: true, // 預設
      };
  });

  // Pass 1.5: 修正 start / end 是否為真實間奏的邊界
  for (let idx = 0; idx < pInfos.length; idx++) {
      if (idx < pInfos.length - 1) {
          pInfos[idx].isEndRealInterlude = pInfos[idx + 1].isRealInterlude;
      } else {
          pInfos[idx].isEndRealInterlude = true;
      }
  }

  // Pass 2: 計算精確的 truncatedBlockEnd
  const finalTruncatedBlockEnds = pInfos.map((info, idx) => {
      if (idx < pInfos.length - 1) {
          if (!info.isEndRealInterlude) {
              // 如果後面不是真實間奏，此段落必須在下一段落的「顯示開始時間點」消失，達到無縫不重疊切換
              return pInfos[idx + 1].blockDisplayStart;
          } else {
              // 否則，依照一般的 max 消失限制 (但多留時間不要重疊到下一個的 start)
              return Math.min(info.blockDisplayEnd, pInfos[idx + 1].p[0].start! - 0.1);
          }
      } else {
          return info.blockDisplayEnd;
      }
  });

  paragraphs.forEach((p, idx) => {
      const pInfo = pInfos[idx];
      const { blockDisplayStart, dotCount, isStartRealInterlude, isEndRealInterlude } = pInfo;
      const truncatedBlockEnd = finalTruncatedBlockEnds[idx];

      // 產生倒數小白圓的 Events
      if (dotCount > 0) {
          const isSingleLine = p.length === 1;
          
          let xPos = 0;
          let yPos = 0;
          const currentMarginV = options.dualRowMarginV !== undefined ? options.dualRowMarginV : 50;
          const currentMarginL = options.dualRowMarginL !== undefined ? options.dualRowMarginL : 150;
          // 計算第一行文字上方的適當座標位置
          if (isSingleLine) {
             const totalW = (dotCount - 1) * dotSpacing + 2 * dotRadius;
             // BottomCenter 座標
             xPos = 960 - (totalW / 2) + dotRadius; 
             yPos = 1080 - currentMarginV - options.fontSize - dotRadius - 20;
          } else {
             // BottomLeft 座標，小白圓發端對齊 BottomLeft 歌詞的起始位置（外外多出 10px 與第一行歌詞對齊）
             xPos = currentMarginL + 15 + dotRadius;
             // 離第一排歌詞上緣 20px
             yPos = 1080 - currentMarginV - options.fontSize - dotRadius - 20 - options.dualRowSpacing;
          }

          for (let d = 0; d < dotCount; d++) {
             const dDots = dotCount - d;
             // 第一個圓出現的時間
             let dotStart = p[0].start! - 1.0 - dDots;
             let dotEnd = dotStart + dotDuration;
             
             let dotFadeIn = 0;
             if (d === 0) {
                 dotStart -= options.fadeInOutTime;
                 dotFadeIn = fadeMs;
             }
             
             const vecStr = getDotsVector(dDots, dotRadius, dotSpacing);
             // {\\p1} 使用 SVG Vector 畫法, {\\c...\\3c...} 指定填滿與邊框色彩
             ass += `Dialogue: 5,${formatAssTime(dotStart)},${formatAssTime(dotEnd)},TopLeft,,0,0,0,,{\\fad(${dotFadeIn},0)\\pos(${xPos},${yPos})\\c&HFFFFFF&\\bord0\\shad0\\1a&H00&}{\\p1}${vecStr}{\\p0}\n`;
          }
      }

      // 針對段落內的每行歌詞進行處理
      const lineDisplayStarts: number[] = [];
      const lineDisplayEnds: number[] = [];

      for (let i = 0; i < p.length; i++) {
         const lastIsCentered = p.length % 2 !== 0 && p.length >= 3;
         const isLast = i === p.length - 1;
         const isCentered = isLast && lastIsCentered;

         let start = blockDisplayStart;
         if (isCentered) {
            start = getLineEndTime(p[i - 1]);
         } else if (i >= 2) {
            if (i % 2 === 0) {
               const prevLine = p[i - 1];
               const trigIdx = Math.min(options.nextTriggerIndex, prevLine.words.length - 1);
               const trigWord = prevLine.words[trigIdx];
               start = (trigWord && trigWord.start !== null) ? trigWord.start : getLineEndTime(prevLine);
            } else {
               const prevSameRowLine = p[i - 2];
               start = getLineEndTime(prevSameRowLine);
            }
         }
         lineDisplayStarts.push(start);
      }

      for (let i = 0; i < p.length; i++) {
         const lastIsCentered = p.length % 2 !== 0 && p.length >= 3;
         const isLast = i === p.length - 1;
         const isCentered = isLast && lastIsCentered;
         const isSingleLine = p.length === 1;
         const isReallyCentered = isCentered || isSingleLine;

         let end = truncatedBlockEnd;
         if (isReallyCentered) {
            end = truncatedBlockEnd;
         } else if (lastIsCentered && i >= p.length - 3 && i !== p.length - 1) {
            end = getLineEndTime(p[p.length - 2]);
         } else if (i < p.length - 2) {
            if (i % 2 === 0) {
               end = lineDisplayStarts[i + 2];
            } else {
               if (options.row2FadeoutMode === 'immediate') {
                  end = getLineEndTime(p[i]);
               } else {
                  end = lineDisplayStarts[i + 2];
               }
            }
         }
         lineDisplayEnds.push(end);
      }

      for (let i = 0; i < p.length; i++) {
         const line = p[i];
         const displayStart = lineDisplayStarts[i];
         const displayEnd = lineDisplayEnds[i];

         const lastIsCentered = p.length % 2 !== 0 && p.length >= 3;
         const isLast = i === p.length - 1;
         const isCentered = isLast && lastIsCentered;
         const isSingleLine = p.length === 1;
         const isReallyCentered = isCentered || isSingleLine;

         const row = isReallyCentered ? 2 : ((i % 2 === 0) ? 1 : 2);
         const style = isReallyCentered ? 'BottomCenter' : (row === 1 ? 'BottomLeft' : 'BottomRight');

         const fadeIn = (displayStart === blockDisplayStart && isStartRealInterlude) ? fadeMs : 0;
         const fadeOut = (displayEnd === truncatedBlockEnd && isEndRealInterlude) ? fadeMs : 0;

         let karaokeStr = '';
         let karaokeKoStr = '';
         const validWords = line.words.filter(w => w.text.trim().length > 0 || w.text === ' ');
         
         for (let wIdx = 0; wIdx < validWords.length; wIdx++) {
            const w = validWords[wIdx];
            
            let durCs = 0;
            if (w.start !== null) {
               const nextW = validWords[wIdx + 1];
               const nextStart = nextW ? nextW.start : line.end;
               if (nextStart !== null && nextStart > w.start) {
                  durCs = Math.round((nextStart - w.start) * 100);
               } else {
                  durCs = 30;
               }
            } else {
               durCs = 30;
            }

            if (!w.text.trim()) {
               karaokeStr += `{\\k${durCs}}${w.text}`; 
               karaokeKoStr += `{\\k${durCs}}${w.text}`; 
            } else {
               karaokeStr += `{\\kf${durCs}}${w.text}`;
               karaokeKoStr += `{\\ko${durCs}}${w.text}`;
            }
         }

         const startDelaySec = (line.start || displayStart) - displayStart;
         if (startDelaySec > 0) {
            const startDelayCs = Math.round(startDelaySec * 100);
            karaokeStr = `{\\kf${startDelayCs}}${karaokeStr}`;
            karaokeKoStr = `{\\ko${startDelayCs}}${karaokeKoStr}`;
         }

         // 核心定位座標計算：解析目前樣式對應的對齊與位置
         let alignment = 2; // Default BottomCenter
         let baseX = 960;
         let baseY = 1080 - 48; // MarginV is 48

         const currentMarginV = options.dualRowMarginV !== undefined ? options.dualRowMarginV : 50;
         if (style === 'BottomLeft') {
            alignment = 1;
            baseX = options.dualRowMarginL !== undefined ? options.dualRowMarginL : 150;
            baseY = 1080 - (currentMarginV + options.dualRowSpacing);
         } else if (style === 'BottomRight') {
            alignment = 3;
            baseX = 1920 - (options.dualRowMarginR !== undefined ? options.dualRowMarginR : 150);
            baseY = 1080 - currentMarginV;
         }

         if (LYRICS_OUTLINE_MODE === 'simulated-dual-layer') {
            // 透過 4 個方向的微調偏移值來模擬完美勻稱的外框
            const karaokeOffsets = [
               { dx: -SIMULATED_OUTLINE_WIDTH, dy: -SIMULATED_OUTLINE_WIDTH },
               { dx: SIMULATED_OUTLINE_WIDTH, dy: -SIMULATED_OUTLINE_WIDTH },
               { dx: -SIMULATED_OUTLINE_WIDTH, dy: SIMULATED_OUTLINE_WIDTH },
               { dx: SIMULATED_OUTLINE_WIDTH, dy: SIMULATED_OUTLINE_WIDTH },
            ];

            karaokeOffsets.forEach(({ dx, dy }) => {
               // 外框層 (底層)：使用 \kf，未唱時為黑色 &H000000&，起唱漸變為白色外框 &HFFFFFF&
               ass += `Dialogue: ${row},${formatAssTime(displayStart)},${formatAssTime(displayEnd)},${style},,0,0,0,,{\\an${alignment}\\pos(${baseX + dx},${baseY + dy})\\bord0\\shad0\\fs${options.fontSize}\\1c&HFFFFFF&\\2c&H000000&\\fad(${fadeIn},${fadeOut})}${karaokeStr}\n`;
            });

            // 核心唱詞本體層 (頂層)：疊在最中央，未唱時主體設為白色且不透明 \2c&HFFFFFF&\2a&H00&，起唱後漸變為設定的唱詞主體色
            ass += `Dialogue: ${row + 2},${formatAssTime(displayStart)},${formatAssTime(displayEnd)},${style},,0,0,0,,{\\an${alignment}\\pos(${baseX},${baseY})\\bord0\\shad0\\fs${options.fontSize}\\1c${primaryAssColor}\\2c&HFFFFFF&\\2a&H00&\\fad(${fadeIn},${fadeOut})}${karaokeStr}\n`;
         } else {
            // traditional 傳統單層模式：外框永遠是實心黑色 &H000000&，文字主體由白 (&HFFFFFF&) 漸變為設定色 (primaryAssColor)
            // 直接使用 ASS 內建的 \bord4\3c&H000000& 確保描邊，將 \2c 設為白色 \1c 設為唱完的 primaryAssColor
            ass += `Dialogue: ${row},${formatAssTime(displayStart)},${formatAssTime(displayEnd)},${style},,0,0,0,,{\\an${alignment}\\pos(${baseX},${baseY})\\bord4\\shad0\\fs${options.fontSize}\\1c${primaryAssColor}\\2c&HFFFFFF&\\3c&H000000&\\fad(${fadeIn},${fadeOut})}${karaokeStr}\n`;
         }
      }
   });

  return ass;
}
