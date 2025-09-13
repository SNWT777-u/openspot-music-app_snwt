// src/lib/lrcParser.ts

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export const parseLRC = (lrcText: string): LyricLine[] => {
  if (!lrcText) return [];

  const lines = lrcText.split('\n');
  const parsedLines: LyricLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const text = match[4].trim();

      const time = minutes * 60 + seconds + milliseconds / 1000;
      parsedLines.push({ time, text });
    }
  }

  return parsedLines.sort((a, b) => a.time - b.time);
};