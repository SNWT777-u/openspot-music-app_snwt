// src/components/FullScreenPlayer.tsx

import React, { useState, useRef } from 'react';
import {
    Box,
    Modal,
    IconButton,
    Typography,
    Stack,
    CardMedia,
    Button,
    ListItem,
    List,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Fade,
    Grid,
    Slide,
    CardMediaProps,
    BoxProps
} from '@mui/material';
import { Close as CloseIcon, QueueMusic, Download as DownloadIcon } from '@mui/icons-material';
import Player from './Player';
import {Track, useMusic } from '../contexts/MusicContext';
import {apiService} from "../lib/apiService";
import { useColor } from 'color-thief-react';
// 1. Убираем прямой импорт API-функции
// import { getStreamUrl } from '../lib/music-api';

// 1. [ИСПРАВЛЕНИЕ] Создаем "обертку" для Box, которая явно пробрасывает ref.
const FadingBox = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
    <Box ref={ref} {...props} />
));

// 2. [ИСПРАВЛЕНИЕ] Создаем "обертку" для CardMedia.
const SlidingMedia = React.forwardRef<HTMLImageElement, CardMediaProps<'img'>>((props, ref) => (
    <CardMedia ref={ref} {...props} />
));

// Вспомогательный компонент для динамического фона
const DynamicBackground: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
    const { data: color } = useColor(imageUrl, 'hex', { crossOrigin: 'anonymous', quality: 10 });

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                zIndex: -1,
                // Плавный переход цвета при смене трека
                transition: 'background 0.8s ease-in-out',
                // Красивый радиальный градиент на основе цвета обложки
                background: color ? `radial-gradient(circle at top, ${color}99 0%, #121212 60%)` : 'linear-gradient(135deg, #1db954 0%, #191414 100%)',
            }}
        />
    );
};

// Вспомогательный компонент для отображения очереди
const QueueView: React.FC<{ queue: Track[], currentTrack: Track, onSelect: (track: Track) => void }> = ({ queue, currentTrack, onSelect }) => {
    return (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 450px)' }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, px: 2 }}>Up Next</Typography>
            <List>
                {queue.map((track, index) => {
                    const isCurrent = track.id === currentTrack.id;
                    return (
                        <ListItem
                            key={`${track.id}-${index}`}
                            button
                            onClick={() => onSelect(track)}
                            sx={{
                                borderRadius: 2,
                                backgroundColor: isCurrent ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar variant="rounded" src={track.coverUrl} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={<Typography noWrap sx={{ color: isCurrent ? 'primary.main' : '#fff' }}>{track.title}</Typography>}
                                secondary={<Typography noWrap variant="body2" sx={{ color: '#b3b3b3' }}>{track.artist}</Typography>}
                            />
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
};

const FullScreenPlayer: React.FC = () => {
    const { state, dispatch } = useMusic();
    const [downloading, setDownloading] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const slideContainerRef = useRef<HTMLDivElement>(null);
    const mainNodeRef = useRef(null);
    const artNodeRef = useRef(null);
    const track = state.currentTrack;
    if (!track) return null;

    const queue = state.isShuffled ? state.shuffledQueue : state.queue;
    const currentTrackIndex = queue.findIndex(t => t.id === track.id);
    const upNextQueue = queue.slice(currentTrackIndex + 1);

  // 2. [ИЗМЕНЕНО] Обработчик скачивания теперь использует electronAPI
  const handleDownload = async () => {
    if (!track) return;
    setDownloading(true);
    try {
      // Получаем URL для скачивания через main-процесc
      const url = await apiService.getStreamUrl(track.id);

      if (!url) {
        throw new Error('Download URL is missing.');
      }

      if (!url) {
        throw new Error('Download URL is missing.');
      }

      // Логика скачивания файла остается прежней, так как она выполняется в renderer
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      // Убедимся, что в имени файла нет недопустимых символов
      const safeFileName = `${track.title} - ${track.artist}`.replace(/[/\\?%*:|"<>]/g, '-');
      a.download = `${safeFileName}.flac`; // Предполагаем формат FLAC
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a); // Убираем элемент после клика
      window.URL.revokeObjectURL(a.href); // Освобождаем память
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(`Failed to download song: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };
  const handleSelectFromQueue = (selectedTrack: Track) => {
      dispatch({type: 'SET_CURRENT_TRACK', payload: selectedTrack});
      if (!state.isPlaying) {
          dispatch({type: 'TOGGLE_PLAY_PAUSE'});
      }
  };

  return (
        <Modal
            open={state.isFullScreenPlayerOpen}
            onClose={() => dispatch({ type: 'CLOSE_FULLSCREEN_PLAYER' })}
            closeAfterTransition
            BackdropProps={{ timeout: 500, sx: { backdropFilter: 'blur(10px)' } }}
        >
            <Box sx={{
                height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
                p: 4, boxSizing: 'border-box', outline: 'none',
            }}>
                <DynamicBackground imageUrl={track.coverUrl} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <IconButton onClick={() => setShowQueue(!showQueue)} sx={{ color: showQueue ? 'primary.main' : '#fff', mr: 1 }}>
                        <QueueMusic />
                    </IconButton>
                    <IconButton onClick={() => dispatch({ type: 'CLOSE_FULLSCREEN_PLAYER' })} sx={{ color: '#fff' }}>
                        <CloseIcon fontSize="large" />
                    </IconButton>
                </Box>

                    {/* Основной контент */}
                    <Grid container spacing={4} sx={{ flexGrow: 1, alignItems: 'center', mt: 2 }}>
                        <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Box ref={slideContainerRef} sx={{ width: '100%', maxWidth: 400 }}>
                             <Slide direction="down" in={state.isFullScreenPlayerOpen} container={slideContainerRef.current} timeout={500}>
                                <CardMedia
                                    component="img"
                                    image={track.coverUrl}
                                    alt={track.title}
                                    sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
                                />
                             </Slide>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {showQueue && upNextQueue.length > 0 ? (
                            <QueueView queue={upNextQueue} currentTrack={track} onSelect={handleSelectFromQueue} />
                        ) : (
                            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                                <Typography variant="h2" sx={{ color: '#fff', fontWeight: 900, mb: 2 }}>{track.title}</Typography>
                                <Typography variant="h5" sx={{ color: '#b3b3b3', mb: 4 }}>{track.artist}</Typography>
                                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading} sx={{ borderRadius: 20, borderColor: '#b3b3b3', color: '#b3b3b3', '&:hover': { borderColor: '#fff' } }}>
                                    {downloading ? 'Downloading...' : 'Download'}
                                </Button>
                            </Box>
                        )}
                    </Grid>
                </Grid>

                <Box sx={{ flexShrink: 0, mt: 4 }}>
                    <Player
                        disableOpenFullScreen
                        sx={{ position: 'static', width: '100%', boxShadow: 'none', borderTop: 'none', background: 'transparent' }}
                    />
                </Box>
            </Box>
        </Modal>
    );
};

export default FullScreenPlayer;