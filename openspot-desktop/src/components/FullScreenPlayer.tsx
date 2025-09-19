import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Modal,
  IconButton,
  Typography,
  CardMedia,
  Grid,
  Slide,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  CircularProgress,
  BoxProps,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, QueueMusic, Download as DownloadIcon } from '@mui/icons-material';
import { useColor } from 'color-thief-react';
import Player from './Player';
import { useMusic, Track } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';
import { parseLRC, LyricLine } from '../lib/lrcParser';
import LyricsViewer from './LyricsViewer';

// Interfaces
interface DynamicBackgroundProps {
  imageUrl: string;
}

interface QueueViewProps {
  queue: Track[];
  currentTrack: Track;
  onSelect: (track: Track) => void;
}

// Components
const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ imageUrl }) => {
  const { data: color } = useColor(imageUrl, 'hex', { crossOrigin: 'anonymous', quality: 10 });
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        transition: 'background 0.8s ease-in-out',
        background: color
          ? `radial-gradient(circle at top, ${color}cc 0%, #121212 60%)`
          : 'linear-gradient(135deg, #1db954 0%, #191414 100%)',
        backdropFilter: 'blur(8px)',
      }}
    />
  );
};

const QueueView: React.FC<QueueViewProps> = ({ queue, currentTrack, onSelect }) => (
  <Box
    sx={{
      flexGrow: 1,
      overflowY: 'auto',
      maxHeight: { xs: 'calc(100vh - 400px)', md: 'calc(100vh - 450px)' },
      width: '100%',
      p: 2,
    }}
    role="region"
    aria-label="Playback queue"
  >
    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
      Up Next
    </Typography>
    <List>
      {queue.map((track, index) => (
        <ListItem
          key={`${track.id}-${index}`}
          onClick={() => onSelect(track)}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(track)}
          tabIndex={0}
          role="button"
          aria-label={`Play ${track.title} by ${track.artist}`}
          sx={{
            borderRadius: 2,
            transition: 'background-color 0.2s',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
            '&:focus': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
          }}
        >
          <ListItemAvatar>
            <Avatar variant="rounded" src={track.coverUrl} alt={`${track.title} cover`} />
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography
                noWrap
                sx={{ color: track.id === currentTrack.id ? 'primary.main' : '#fff' }}
              >
                {track.title}
              </Typography>
            }
            secondary={
              <Typography noWrap variant="body2" sx={{ color: '#b3b3b3' }}>
                {track.artist}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  </Box>
);

const FadingBox = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
  <Box ref={ref} {...props} />
));

// Main Component
const FullScreenPlayer: React.FC = () => {
  const { state, dispatch } = useMusic();
  const { currentTrack, isFullScreenPlayerOpen, isShuffled, shuffledQueue, queue } = state;
  const [downloading, setDownloading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const currentQueue = useMemo(() => (isShuffled ? shuffledQueue : queue), [
    isShuffled,
    shuffledQueue,
    queue,
  ]);
  const currentTrackIndex = useMemo(
    () => currentQueue.findIndex((t) => t.id === currentTrack?.id),
    [currentQueue, currentTrack]
  );
  const upNextQueue = useMemo(() => currentQueue.slice(currentTrackIndex + 1), [
    currentQueue,
    currentTrackIndex,
  ]);

  const handleDownload = useCallback(async () => {
    if (!currentTrack) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const url = await apiService.getStreamUrl(currentTrack.id);
      if (!url) throw new Error('Download URL is missing');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      const safeFileName = `${currentTrack.title} - ${currentTrack.artist}`.replace(
        /[/\\?%*:|"<>]/g,
        '-'
      );
      a.download = `${safeFileName}.flac`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    } catch (err: any) {
      setDownloadError(`Failed to download: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }, [currentTrack]);

  const handleSelectFromQueue = useCallback(
    (selectedTrack: Track) => {
      dispatch({ type: 'SET_CURRENT_TRACK', payload: selectedTrack });
      if (!state.isPlaying) dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
    },
    [dispatch, state.isPlaying]
  );

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_FULLSCREEN_PLAYER' });
  }, [dispatch]);

  useEffect(() => {
    if (!currentTrack || !isFullScreenPlayerOpen) return;

    setParsedLyrics([]);
    setLyricsError(null);
    setLyricsLoading(true);
    setShowQueue(false);

    let isMounted = true;
    const loadLyrics = async () => {
      try {
        const response = await apiService.getLyrics(currentTrack.artist, currentTrack.title);
        if (!isMounted) return;
        if (response.lyrics) {
          const parsed = parseLRC(response.lyrics);
          if (parsed.length > 0) {
            setParsedLyrics(parsed);
          } else {
            throw new Error('Lyrics format is invalid or empty');
          }
        } else {
          throw new Error('No lyrics found in response');
        }
      } catch (err: any) {
        if (isMounted) {
          setLyricsError('Lyrics not available for this track');
        }
      } finally {
        if (isMounted) {
          setLyricsLoading(false);
        }
      }
    };

    loadLyrics();
    return () => {
      isMounted = false;
    };
  }, [currentTrack, isFullScreenPlayerOpen]);

  if (!currentTrack) return null;

  const renderMainContent = () => {
    if (showQueue && upNextQueue.length > 0) {
      return (
        <QueueView
          queue={upNextQueue}
          currentTrack={currentTrack}
          onSelect={handleSelectFromQueue}
        />
      );
    }
    if (lyricsLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress color="inherit" aria-label="Loading lyrics" />
        </Box>
      );
    }
    if (parsedLyrics.length > 0) {
      return <LyricsViewer lyrics={parsedLyrics} />;
    }
    return (
      <Box sx={{ textAlign: { xs: 'center', md: 'left' }, width: '100%' }}>
        <Typography
          variant="h2"
          sx={{ color: '#fff', fontWeight: 900, mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}
        >
          {currentTrack.title}
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: '#b3b3b3', mb: 4, fontSize: { xs: '1.25rem', md: '1.75rem' } }}
        >
          {currentTrack.artist}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{
            borderRadius: 20,
            borderColor: '#b3b3b3',
            color: '#b3b3b3',
            '&:hover': { borderColor: '#fff', color: '#fff' },
            '&:disabled': { borderColor: '#666', color: '#666' },
          }}
          aria-label={`Download ${currentTrack.title}`}
        >
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
        {lyricsError && (
          <Typography sx={{ color: '#b3b3b3', mt: 2, fontStyle: 'italic' }}>
            {lyricsError}
          </Typography>
        )}
        {downloadError && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
            {downloadError}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Modal
      open={isFullScreenPlayerOpen}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Box }}
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.8)' },
        },
      }}
      aria-labelledby="full-screen-player-title"
      aria-describedby="full-screen-player-description"
    >
      <FadingBox
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, md: 4 },
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <DynamicBackground imageUrl={currentTrack.coverUrl} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, mb: 2 }}>
          <IconButton
            onClick={() => setShowQueue(!showQueue)}
            sx={{ color: showQueue ? 'primary.main' : '#fff', mr: 1 }}
            aria-label={showQueue ? 'Hide queue' : 'Show queue'}
          >
            <QueueMusic />
          </IconButton>
          <IconButton
            onClick={handleClose}
            sx={{ color: '#fff' }}
            aria-label="Close full-screen player"
          >
            <CloseIcon fontSize="large" />
          </IconButton>
        </Box>

        <Grid
          container
          spacing={{ xs: 2, md: 4 }}
          sx={{ flexGrow: 1, alignItems: 'center', minHeight: 0 }}
        >
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box ref={slideContainerRef} sx={{ width: '100%', maxWidth: { xs: 300, md: 400 } }}>
              <Slide
                direction="down"
                in={isFullScreenPlayerOpen}
                container={slideContainerRef.current}
                timeout={500}
              >
                <CardMedia
                  component="img"
                  image={currentTrack.coverUrl}
                  alt={`${currentTrack.title} cover`}
                  sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'scale(1.02)' },
                  }}
                />
              </Slide>
            </Box>
          </Grid>
          <Grid
            item
            xs={12}
            md={7}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            {renderMainContent()}
          </Grid>
        </Grid>

        <Box sx={{ flexShrink: 0, mt: { xs: 2, md: 4 } }}>
          <Player
            disableOpenFullScreen
            showDownloadIcon={parsedLyrics.length > 0}
            onDownloadClick={handleDownload}
            sx={{
              position: 'static',
              width: '100%',
              boxShadow: 'none',
              borderTop: 'none',
              background: 'transparent',
            }}
          />
        </Box>
      </FadingBox>
    </Modal>
  );
};

export default FullScreenPlayer;
