// src/pages/PlaylistPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton, CircularProgress } from '@mui/material';
import { Favorite, AccessTime, Pause, FavoriteBorder, PlaylistPlay, Category, Public, PlayArrow } from '@mui/icons-material';
import { useMusic, Track } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';
import { convertAPITrackToTrack, APITrack } from '../lib/music-api';
import TrackMenu from '../components/TrackMenu';

interface PlaylistPageProps {
  title?: string;
  description?: string;
  tracks?: Track[];
  icon?: React.ReactNode;
  gradient?: string;
}

interface DisplayData {
  title: string;
  description: string;
  tracks: Track[];
  icon: React.ReactNode;
  gradient: string;
}

const PlaylistPage: React.FC<PlaylistPageProps> = (props) => {
  const { state: musicState, dispatch } = useMusic();
  const { playlistId, genreName, countryName } = useParams();
  const location = useLocation();

  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const resolveData = async () => {
      let data: DisplayData | null = null;
      // Приоритет №1: URL-параметры
      if (playlistId) {
        const p = musicState.playlists.find(p => p.id === playlistId);
        if (p) data = { title: p.name, description: `${p.tracks.length} songs`, tracks: p.tracks, icon: <PlaylistPlay sx={{ fontSize: 80 }} />, gradient: '#2a2a2a' };
      } else if (genreName) {
        const result = await apiService.searchTracks(genreName);
        const tracks = (result.tracks || []).map(t => convertAPITrackToTrack(t as APITrack));
        data = { title: genreName, description: `The best of ${genreName}`, tracks, icon: <Category sx={{ fontSize: 80 }} />, gradient: '#8d67ab' };
      } else if (countryName && location.state?.tracks) {
        data = { title: `${countryName} Top Hits`, description: `Popular in ${countryName}`, tracks: location.state.tracks, icon: <Public sx={{ fontSize: 80 }} />, gradient: '#4a4a4a' };
      }
      // Приоритет №2: Пропсы (для Liked/Recent)
      else if (props.title && props.tracks) {
        data = {
          title: props.title,
          description: props.description || '',
          tracks: props.tracks,
          icon: props.icon || <PlaylistPlay />,
          gradient: props.gradient || '#2a2a2a'
        };
      }

      if (isMounted) {
        setDisplayData(data);
        setIsLoading(false);
      }
    };

    resolveData();
    return () => { isMounted = false; };
  }, [playlistId, genreName, countryName, location.state, musicState.playlists, props]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!displayData) return <Typography sx={{ p: 4, color: '#fff' }}>Content not found.</Typography>;

  const { title, description, tracks, icon, gradient } = displayData;

  const handlePlayTrack = (track: Track) => {
    if (musicState.currentTrack?.id === track.id) {
      dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
    } else {
      dispatch({ type: 'SET_QUEUE', payload: tracks });
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      if (!musicState.isPlaying) {
        dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
      }
    }
  };

  const playAll = () => {
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0]);
    }
  };

  const handleToggleLike = (track: Track) => {
    dispatch({ type: 'TOGGLE_LIKE_TRACK', payload: track });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, p: 4, background: `linear-gradient(to bottom, ${gradient} 0%, #121212 100%)` }}>
        <Box sx={{ width: 232, height: 232, background: 'rgba(0,0,0,0.2)', boxShadow: '0 4px 60px rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>PLAYLIST</Typography>
          <Typography variant="h1" sx={{ fontSize: {xs: '3rem', md: '5rem'}, fontWeight: 900, color: '#fff', mb: 2, lineHeight: 1 }}>{title}</Typography>
          <Typography variant="body1" sx={{ color: '#b3b3b3' }}>{description}</Typography>
        </Box>
      </Box>

      <Box sx={{ p: 4, background: 'linear-gradient(to bottom, #1a1a1a 0%, #121212 400px)' }}>
        {tracks.length > 0 && (
          <IconButton onClick={playAll} sx={{ width: 56, height: 56, backgroundColor: 'primary.main', mb: 3, '&:hover': { backgroundColor: '#1ed760' } }}>
            <PlayArrow sx={{ fontSize: 32, color: '#000' }} />
          </IconButton>
        )}

        <Table>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#b3b3b3' } }}>
              <TableCell sx={{ width: '40px' }}>#</TableCell>
              <TableCell>Title</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Album</TableCell>
              <TableCell align="right"><AccessTime fontSize="small" /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracks.map((track, index) => {
              const isCurrent = musicState.currentTrack?.id === track.id;
              const isLiked = musicState.likedTracks.some(t => t.id === track.id);
              return (
                <TableRow key={`${track.id}-${index}`} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }, '& .MuiTableCell-root': { border: 'none', py: 1 } }}>
                  <TableCell onClick={() => handlePlayTrack(track)} sx={{ color: '#b3b3b3', width: '40px', textAlign: 'center' }}>
                    {isCurrent && musicState.isPlaying ? <Pause sx={{ color: 'primary.main' }} /> : isCurrent ? <PlayArrow sx={{ color: 'primary.main' }} /> : index + 1}
                  </TableCell>
                  <TableCell onClick={() => handlePlayTrack(track)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <img src={track.coverUrl} alt={track.title} width="40" height="40" style={{borderRadius: '4px'}}/>
                      <Box>
                        <Typography sx={{ color: isCurrent ? 'primary.main' : '#fff' }}>{track.title}</Typography>
                        <Typography variant="body2" sx={{ color: '#b3b3b3' }}>{track.artist}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell onClick={() => handlePlayTrack(track)} sx={{ color: '#b3b3b3', display: { xs: 'none', md: 'table-cell' } }}>{track.album}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleLike(track); }}>
                          {isLiked ? <Favorite sx={{ color: 'primary.main' }} /> : <FavoriteBorder sx={{ color: '#b3b3b3' }} />}
                       </IconButton>
                       <Typography variant="body2" sx={{ color: '#b3b3b3', minWidth: '40px', display: {xs: 'none', sm: 'block'} }}>{formatTime(track.duration)}</Typography>
                       <TrackMenu track={track} />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {tracks.length === 0 && <Typography sx={{color: '#b3b3b3', mt: 2}}>This playlist is empty. Add some tracks!</Typography>}
      </Box>
    </Box>
  );
};

export default PlaylistPage;