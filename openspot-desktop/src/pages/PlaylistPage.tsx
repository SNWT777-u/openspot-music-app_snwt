// src/pages/PlaylistPage.tsx

import React from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from '@mui/material';
import { PlayArrow, Favorite, AccessTime, Pause, FavoriteBorder } from '@mui/icons-material';
import { MusicNote, PlaylistPlay } from '@mui/icons-material';
import { useMusic, Track } from '../contexts/MusicContext';
import { useParams } from 'react-router-dom';
import TrackMenu from '../components/TrackMenu';

interface PlaylistPageProps {
  title?: string;
  description?: string;
  tracks?: Track[];
  icon?: React.ReactNode;
  gradient?: string;
}

const PlaylistPage: React.FC<PlaylistPageProps> = (props) => {
  const { state, dispatch } = useMusic();
  const { playlistId } = useParams<{ playlistId: string }>(); // 2. Получаем ID плейлиста из URL

  // 3. Логика определения, какой плейлист отображать
  let playlistData;
  if (playlistId) {
    const userPlaylist = state.playlists.find(p => p.id === playlistId);
    if (userPlaylist) {
      playlistData = {
        title: userPlaylist.name,
        description: `${userPlaylist.tracks.length} songs`,
        tracks: userPlaylist.tracks,
        icon: <PlaylistPlay sx={{ fontSize: 80, color: '#fff' }} />,
        gradient: '#2a2a2a'
      };
    } else {
      // Плейлист не найден
      return <Typography>Playlist not found.</Typography>;
    }
  } else {
    // Если ID нет, используем пропсы (для Liked/Recent)
    playlistData = props;
  }

  const { title, description, tracks, icon, gradient } = playlistData;
  if (!tracks) return null; // Если треков нет, ничего не рендерим


  const handlePlayTrack = (track: Track, index: number) => {
    if (state.currentTrack?.id === track.id) {
      dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
    } else {
      dispatch({ type: 'SET_QUEUE', payload: tracks });
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      if (!state.isPlaying) {
        dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
      }
    }
  };

  const playAll = () => {
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0], 0);
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
      {/* Шапка плейлиста */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, p: 4, background: `linear-gradient(to bottom, ${gradient} 0%, #121212 100%)` }}>
        <Box
          sx={{
            width: 232, height: 232,
            background: 'rgba(255,255,255,0.1)',
            boxShadow: '0 4px 60px rgba(0,0,0,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>PLAYLIST</Typography>
          <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 900, color: '#fff', mb: 2, lineHeight: 1 }}>{title}</Typography>
          <Typography variant="body1" sx={{ color: '#b3b3b3' }}>{description}</Typography>
        </Box>
      </Box>

      {/* Кнопки и список треков */}
      <Box sx={{ p: 4, background: 'linear-gradient(to bottom, #1a1a1a 0%, #121212 400px)' }}>
        <IconButton
          onClick={playAll}
          sx={{ width: 56, height: 56, backgroundColor: 'primary.main', mb: 3, '&:hover': { backgroundColor: '#1ed760' } }}
        >
          <PlayArrow sx={{ fontSize: 32, color: '#000' }} />
        </IconButton>

        <Table>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#b3b3b3' } }}>
              <TableCell sx={{ width: '40px' }}>#</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Album</TableCell>
              <TableCell align="right"><AccessTime fontSize="small" /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracks.map((track, index) => {
              const isCurrent = state.currentTrack?.id === track.id;
              const isLiked = state.likedTracks.some(t => t.id === track.id);
              return (
                <TableRow
                  key={track.id}
                  onClick={() => handlePlayTrack(track, index)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    '& .MuiTableCell-root': { border: 'none', py: 1 },
                  }}
                >
                  <TableCell sx={{ color: '#b3b3b3', width: '40px' }}>
                    {isCurrent && state.isPlaying ? <Pause sx={{ color: 'primary.main' }} /> :
                     isCurrent ? <PlayArrow sx={{ color: 'primary.main' }} /> : index + 1}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <img src={track.coverUrl} alt={track.title} width="40" height="40" />
                      <Box>
                        <Typography sx={{ color: isCurrent ? 'primary.main' : '#fff' }}>{track.title}</Typography>
                        <Typography variant="body2" sx={{ color: '#b3b3b3' }}>{track.artist}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#b3b3b3' }}>{track.album}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleLike(track); }}>
                          {isLiked ? <Favorite sx={{ color: 'primary.main' }} /> : <FavoriteBorder sx={{ color: '#b3b3b3' }} />}
                       </IconButton>
                       <Typography variant="body2" sx={{ color: '#b3b3b3' }}>{formatTime(track.duration)}</Typography>
                      <TrackMenu track={track} />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default PlaylistPage;