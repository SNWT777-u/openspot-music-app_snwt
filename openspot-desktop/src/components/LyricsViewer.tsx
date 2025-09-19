import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useMusic } from '../contexts/MusicContext';
import { LyricLine } from '../lib/lrcParser';
import { debounce } from 'lodash';

interface LyricsViewerProps {
  lyrics: LyricLine[];
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({ lyrics }) => {
  const { state, dispatch } = useMusic();
  const { currentTime } = state;
  const activeLineRef = useRef<HTMLDivElement>(null);

  const activeLineIndex = useMemo(() => {
    let index = lyrics.findIndex((line) => line.time > currentTime) - 1;
    if (index < -1) index = lyrics.length - 1;
    return Math.max(0, index);
  }, [currentTime, lyrics]);

  const scrollToActiveLine = useCallback(
    debounce(() => {
      activeLineRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100),
    []
  );

  useEffect(() => {
    scrollToActiveLine();
    return () => scrollToActiveLine.cancel();
  }, [activeLineIndex, scrollToActiveLine]);

  const handleLyricClick = useCallback(
    (time: number) => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    },
    [dispatch]
  );

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        '::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
      role="region"
      aria-label="Lyrics viewer"
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          p: 4,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lyrics.map((line, index) => (
            <Typography
              key={`${line.time}-${index}`}
              ref={index === activeLineIndex ? activeLineRef : null}
              onClick={() => handleLyricClick(line.time)}
              onKeyDown={(e) => e.key === 'Enter' && handleLyricClick(line.time)}
              tabIndex={0}
              role="button"
              aria-label={`Seek to ${line.text || 'instrumental'} at ${line.time} seconds`}
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                fontWeight: 700,
                p: 2,
                textAlign: 'center',
                color: index === activeLineIndex ? '#fff' : '#666',
                transform: index === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                opacity: index === activeLineIndex ? 1 : 0.7,
                transition: 'color 0.3s ease, transform 0.3s ease, opacity 0.3s ease',
                cursor: 'pointer',
                borderRadius: 2,
                '&:hover': {
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                '&:focus': {
                  outline: '2px solid #fff',
                  outlineOffset: 2,
                },
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
