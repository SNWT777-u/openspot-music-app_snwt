// src/pages/Search.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  InputAdornment,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import { Search as SearchIcon, PlayArrow, Pause, Favorite, FavoriteBorder, Clear as ClearIcon } from '@mui/icons-material';
import { useMusic } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';
import type { Track, APITrack } from '../lib/music-api';
import { convertAPITrackToTrack } from '../lib/music-api';
import TrackMenu from '../components/TrackMenu';

// Расширенный список жанров для более полного вида
const GENRE_CATEGORIES = [
  { title: 'Pop', color: '#1d75de' }, { title: 'Rock', color: '#e01e37' },
  { title: 'Hip-Hop', color: '#ba5d07' }, { title: 'Electronic', color: '#006450' },
  { title: 'R&B', color: '#b491c8' }, { title: 'Jazz', color: '#d84000' },
  { title: 'Classical', color: '#7d4b32' }, { title: 'Metal', color: '#8d9295' },
  { title: 'Indie', color: '#e8115b' }, { title: 'K-Pop', color: '#148a08' },
  { title: 'Soul', color: '#dc148c' }, { title: 'Folk', color: '#b491c8' }
];

const Search: React.FC = () => {
  const { state, dispatch } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Отслеживаем, был ли выполнен поиск

  // Функция поиска, обернутая в useCallback для стабильности
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setError(null);
    setLoading(true);
    setHasSearched(true);

    try {
      const data = await apiService.searchTracks(query);
      if (data && data.tracks) {
        const tracks = data.tracks.map((track: APITrack) => {
          const converted = convertAPITrackToTrack(track);
          converted.liked = state.likedTracks.some(t => t.id === converted.id);
          return converted;
        });
        setSearchResults(tracks);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      setError(`Failed to fetch results: ${err.message}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [state.likedTracks]); // Зависит от likedTracks для корректного отображения лайков

  // "Живой" поиск с задержкой (Debouncing)
  useEffect(() => {
    // Не запускаем поиск для пустой строки, просто сбрасываем состояние
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // Задержка в полсекунды

    return () => clearTimeout(timer); // Очистка при каждом новом вводе
  }, [searchQuery, handleSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handlePlayPauseTrack = (track: Track) => {
    if (state.currentTrack?.id === track.id) {
      dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
    } else {
      dispatch({ type: 'SET_QUEUE', payload: searchResults });
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      if (!state.isPlaying) {
        dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
      }
    }
  };

  const handleToggleLike = (track: Track) => {
    dispatch({ type: 'TOGGLE_LIKE_TRACK', payload: track });
  };

  const renderContent = () => {
    if (loading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="success" /></Box>;
    }
    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }
    if (!hasSearched) {
      return (
        <Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Browse all</Typography>
          <Grid container spacing={2}>
            {GENRE_CATEGORIES.map(genre => (
              <Grid item xs={6} sm={4} md={3} key={genre.title}>
                <Box
                  onClick={() => setSearchQuery(genre.title)}
                  sx={{ position: 'relative', height: 180, borderRadius: 2, overflow: 'hidden', backgroundColor: genre.color, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.03)' } }}
                >
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, p: 2, position: 'absolute', top: 0, left: 0 }}>{genre.title}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }
    if (searchResults.length > 0) {
      return (
        <Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Results for "{searchQuery}"</Typography>
          <Grid container spacing={2}>
            {searchResults.map(track => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={track.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', transition: 'background-color 0.3s', '&:hover': { backgroundColor: '#2a2a2a' }, cursor: 'pointer' }} onClick={() => handlePlayPauseTrack(track)}>
                  <Box sx={{ position: 'relative', pt: '100%' }}>
                    <CardMedia
                      component="img" image={track.coverUrl} alt={track.title}
                      sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 1 }}
                    />
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); handlePlayPauseTrack(track); }}
                      sx={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'primary.main', color: '#000', opacity: 0, transform: 'translateY(10px)', transition: 'all 0.3s', '&:hover': { transform: 'scale(1.1) translateY(0)', backgroundColor: '#1ed760' }, '.MuiCard-root:hover &': { opacity: 1, transform: 'translateY(0)' } }}
                    >
                      {state.currentTrack?.id === track.id && state.isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography noWrap sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{track.title}</Typography>
                    <Typography noWrap variant="body2" sx={{ color: '#b3b3b3' }}>{track.artist}</Typography>
                     <TrackMenu track={track} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" sx={{ color: '#fff' }}>No results found for "{searchQuery}"</Typography>
        <Typography sx={{ color: '#b3b3b3' }}>Please check the spelling or try another search term.</Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 4, pb: '100px' }}>
      <Box sx={{ mb: 4, position: 'sticky', top: -24, /* Смещаем вверх, чтобы компенсировать паддинг родителя */ zIndex: 1, backgroundColor: '#121212', pt: 3, pb: 2, mx: -4, px: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="What do you want to listen to?"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            maxWidth: '400px',
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2a2a2a', borderRadius: '500px',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: '#3a3a3a' },
              '&.Mui-focused fieldset': { borderColor: '#fff' },
            },
            '& .MuiInputBase-input': { color: '#fff', py: '12px' },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#fff', ml: 1 }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton onClick={handleClearSearch} edge="end" sx={{ mr: 1 }}>
                    <ClearIcon sx={{ color: '#b3b3b3' }} />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {renderContent()}
    </Box>
  );
};

export default Search;