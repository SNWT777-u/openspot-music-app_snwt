// src/components/LyricsViewer.tsx

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useMusic } from '../contexts/MusicContext';
import { LyricLine } from '../lib/lrcParser';

interface LyricsViewerProps {
  lyrics: LyricLine[];
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({ lyrics }) => {
  const { state, dispatch } = useMusic();
  const { currentTime } = state;
  const activeLineRef = useRef<HTMLDivElement>(null);

  const activeLineIndex = useMemo(() => {
    let index = lyrics.findIndex(line => line.time > currentTime) - 1;
    if (index < -1) index = lyrics.length - 1; // Если все таймкоды позади
    return Math.max(0, index);
  }, [currentTime, lyrics]);

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeLineIndex]);

  const handleLyricClick = (time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  };

  return (
    <Box sx={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 4, boxSizing: 'border-box' }}>
            {lyrics.map((line, index) => (
              <Typography
                key={index}
                ref={index === activeLineIndex ? activeLineRef : null}
                onClick={() => handleLyricClick(line.time)}
                sx={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  p: 2,
                  textAlign: 'center',
                  transition: 'color 0.3s, transform 0.3s',
                  color: index === activeLineIndex ? '#fff' : '#666',
                  transform: index === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                  opacity: index === activeLineIndex ? 1 : 0.7,
                  // 4. [НОВОЕ] Добавляем стили для интерактивности
                  cursor: 'pointer',
                  '&:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255,255,255,0.08)'
                  },
                  borderRadius: 2,
                }}
              >
                {line.text || '♪'}
              </Typography>
            ))}
        </Box>
      </Box>
    </Box>
  );
};

export default LyricsViewer;