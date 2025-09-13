// src/components/FullScreenPlayer.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useColor } from 'color-thief-react';
import {
    Box, Modal, IconButton, Typography, CardMedia,
    Grid, Slide, List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Button, CircularProgress, BoxProps
} from '@mui/material';
import { Close as CloseIcon, QueueMusic, Download as DownloadIcon } from '@mui/icons-material';
import Player from './Player';
import { useMusic, Track } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';
import { parseLRC, LyricLine } from '../lib/lrcParser';
import LyricsViewer from './LyricsViewer';

// --- Вспомогательные компоненты ---

const DynamicBackground: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
    const { data: color } = useColor(imageUrl, 'hex', { crossOrigin: 'anonymous', quality: 10 });
    return (
        <Box
            sx={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
                transition: 'background 0.8s ease-in-out',
                background: color ? `radial-gradient(circle at top, ${color}99 0%, #121212 60%)` : 'linear-gradient(135deg, #1db954 0%, #191414 100%)',
            }}
        />
    );
};

const QueueView: React.FC<{ queue: Track[], currentTrack: Track, onSelect: (track: Track) => void }> = ({ queue, currentTrack, onSelect }) => (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 450px)', width: '100%' }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 2, px: 2 }}>Up Next</Typography>
        <List>
            {queue.map((track, index) => (
                <ListItem key={`${track.id}-${index}`} button onClick={() => onSelect(track)} sx={{ borderRadius: 2, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
                    <ListItemAvatar><Avatar variant="rounded" src={track.coverUrl} /></ListItemAvatar>
                    <ListItemText
                        primary={<Typography noWrap sx={{ color: track.id === currentTrack.id ? 'primary.main' : '#fff' }}>{track.title}</Typography>}
                        secondary={<Typography noWrap variant="body2" sx={{ color: '#b3b3b3' }}>{track.artist}</Typography>}
                    />
                </ListItem>
            ))}
        </List>
    </Box>
);

// Обертка для основного контейнера модального окна, чтобы избежать ошибок анимации в StrictMode
const FadingBox = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
    <Box ref={ref} {...props} />
));

// --- Основной компонент ---

const FullScreenPlayer: React.FC = () => {
    const { state, dispatch } = useMusic();
    const [downloading, setDownloading] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);

    const slideContainerRef = useRef<HTMLDivElement>(null);
    const track = state.currentTrack;

    useEffect(() => {
        if (track && state.isFullScreenPlayerOpen) {
            setParsedLyrics([]);
            setLyricsError(null);
            setLyricsLoading(true);
            setShowQueue(false);

            apiService.getLyrics(track.artist, track.title)
                .then(response => {
                    if (response.lyrics) {
                        const parsed = parseLRC(response.lyrics);
                        if (parsed.length > 0) {
                            setParsedLyrics(parsed);
                        } else {
                            throw new Error("Lyrics format is invalid or empty.");
                        }
                    } else {
                        throw new Error("No lyrics found in response.");
                    }
                })
                .catch(err => {
                    setLyricsError("Lyrics not available for this track.");
                })
                .finally(() => setLyricsLoading(false));
        }
    }, [track, state.isFullScreenPlayerOpen]);

    if (!track) return null;

    const queue = state.isShuffled ? state.shuffledQueue : state.queue;
    const currentTrackIndex = queue.findIndex(t => t.id === track.id);
    const upNextQueue = queue.slice(currentTrackIndex + 1);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const url = await apiService.getStreamUrl(track.id);
            if (!url) throw new Error('Download URL is missing.');
            const response = await fetch(url);
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            const safeFileName = `${track.title} - ${track.artist}`.replace(/[/\\?%*:|"<>]/g, '-');
            a.download = `${safeFileName}.flac`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(a.href);
        } catch (err: any) {
            alert(`Failed to download song: ${err.message}`);
        } finally {
            setDownloading(false);
        }
    };

    const handleSelectFromQueue = (selectedTrack: Track) => {
        dispatch({ type: 'SET_CURRENT_TRACK', payload: selectedTrack });
        if (!state.isPlaying) dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
    };

    const renderMainContent = () => {
        if (showQueue && upNextQueue.length > 0) {
            return <QueueView queue={upNextQueue} currentTrack={track} onSelect={handleSelectFromQueue} />;
        }
        if (lyricsLoading) {
            return <CircularProgress color="inherit" />;
        }
        if (parsedLyrics.length > 0) {
            return <LyricsViewer lyrics={parsedLyrics} />;
        }
        // Отображение по умолчанию: инфо о треке + ошибка, если была
        return (
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography variant="h2" sx={{ color: '#fff', fontWeight: 900, mb: 2 }}>{track.title}</Typography>
                <Typography variant="h5" sx={{ color: '#b3b3b3', mb: 4 }}>{track.artist}</Typography>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading} sx={{ borderRadius: 20, borderColor: '#b3b3b3', color: '#b3b3b3', '&:hover': { borderColor: '#fff' } }}>
                    {downloading ? 'Downloading...' : 'Download'}
                </Button>
                {lyricsError && <Typography sx={{ color: '#b3b3b3', mt: 2, fontStyle: 'italic' }}>{lyricsError}</Typography>}
            </Box>
        );
    };

    return (
        <Modal
            open={state.isFullScreenPlayerOpen}
            onClose={() => dispatch({ type: 'CLOSE_FULLSCREEN_PLAYER' })}
            closeAfterTransition
            BackdropProps={{ timeout: 500, sx: { backdropFilter: 'blur(10px)' } }}
        >
            <FadingBox sx={{
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

                <Grid container spacing={4} sx={{ flexGrow: 1, alignItems: 'center', mt: 2, minHeight: 0 }}>
                    <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box ref={slideContainerRef} sx={{ width: '100%', maxWidth: 400 }}>
                             <Slide direction="down" in={state.isFullScreenPlayerOpen} container={slideContainerRef.current} timeout={500}>
                                <CardMedia
                                    component="img" image={track.coverUrl} alt={track.title}
                                    sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
                                />
                             </Slide>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 0 }}>
                        {renderMainContent()}
                    </Grid>
                </Grid>

                <Box sx={{ flexShrink: 0, mt: 4 }}>
                    <Player
                        disableOpenFullScreen
                        showDownloadIcon={parsedLyrics.length > 0}
                        onDownloadClick={handleDownload}
                        sx={{ position: 'static', width: '100%', boxShadow: 'none', borderTop: 'none', background: 'transparent' }}
                    />
                </Box>
            </FadingBox>
        </Modal>
    );
};

export default FullScreenPlayer;