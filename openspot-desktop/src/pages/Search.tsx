// src/pages/Search.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Alert, Skeleton,
} from '@mui/material';
import { Search as SearchIcon, PlayArrow, Pause, Favorite, FavoriteBorder, Clear as ClearIcon } from '@mui/icons-material';
import { useMusic } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';
import type { Track, APITrack } from '../lib/music-api';
import { convertAPITrackToTrack } from '../lib/music-api';
import TrackMenu from '../components/TrackMenu';
import {Link} from "react-router-dom";

// Расширенный список жанров для более полного вида
const GENRE_CATEGORIES = [
    { title: 'Pop', color: '#1d75de' }, { title: 'Rock', color: '#e01e37' },
    { title: 'Hip-Hop', color: '#ba5d07' }, { title: 'Electronic', color: '#006450' },
    { title: 'Indie', color: '#e8115b' }, { title: 'K-Pop', color: '#148a08' },
];

const CHART_COUNTRIES: Record<string, { name: string, color: string }> = {
  'United States': { name: 'United States', color: '#b03333' },
  'United Kingdom': { name: 'United Kingdom', color: '#2a55a0' },
  'Russia': { name: 'Russia', color: '#0039A6' },
  'Brazil': { name: 'Brazil', color: '#3b8b51' },
  'India': { name: 'India', color: '#ff9933' },
  'Germany': { name: 'Germany', color: '#ffce00' },
};
const CONCURRENT_REQUESTS = 4;


const Search: React.FC = () => {
  const { state, dispatch } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Отслеживаем, был ли выполнен поиск

  const [trendingData, setTrendingData] = useState<Record<string, string[]> | null>(null);
  const [cachedCharts, setCachedCharts] = useState<Record<string, Track[]>>({});
  const [chartsLoading, setChartsLoading] = useState<Record<string, boolean>>({});

  // Эффект для загрузки списка трендов
    // Эффект для загрузки списка трендов
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/BlackHatDevX/trending-music-os/refs/heads/main/trending.json')
      .then(res => res.json())
      .then(data => setTrendingData(data))
      .catch(err => {
        console.error("Failed to load trending data:", err);
        setChartsLoading({});
      });
  }, []); // Пустой массив зависимостей - запускается один раз

  useEffect(() => {
    if (!trendingData) return;
    let isMounted = true;

    const fetchAllChartsInBatches = async () => {
      const allTracksToFetch: { country: string; rawName: string }[] = [];
      const initialLoadingState: Record<string, boolean> = {};

      for (const countryName of Object.keys(CHART_COUNTRIES)) {
        const trackNames = trendingData[countryName.toLowerCase()];
        if (trackNames && !cachedCharts[countryName]) {
          initialLoadingState[countryName] = true;
          trackNames.slice(0, 10).forEach(name => allTracksToFetch.push({ country: countryName, rawName: name }));
        } else {
          initialLoadingState[countryName] = false;
        }
      }
      if (!isMounted) return;
      setChartsLoading(initialLoadingState);
      if (allTracksToFetch.length === 0) return;

      const trackPromises = allTracksToFetch.map(item => {
        // [УЛУЧШЕННЫЙ ПАРСИНГ]
        let artist = '', title = '', preciseQuery = '';
        const parts = item.rawName.split(' - ');
        const words = item.rawName.split(' ');

        if (parts.length >= 2) { // "Artist - Title" формат
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else if (words.length > 1) { // "title artist" формат
          artist = words[words.length - 1].trim();
          title = words.slice(0, -1).join(' ').trim();
        } else { // Только название
          title = item.rawName.trim();
        }
        preciseQuery = `${title} ${artist}`;

        return apiService.searchTracks(encodeURIComponent(preciseQuery))
          .then(res => {
            const bestMatch = res.tracks?.find(t =>
              (artist && t.artist.toLowerCase() === artist.toLowerCase()) ||
              t.title.toLowerCase() === title.toLowerCase()
            ) || res.tracks?.[0];
            return { ...item, track: bestMatch ? convertAPITrackToTrack(bestMatch as APITrack) : null };
          })
          .catch(() => ({ ...item, track: null }));
      });

      const newChartsData: Record<string, Track[]> = {};
      for (let i = 0; i < trackPromises.length; i += CONCURRENT_REQUESTS) {
        if (!isMounted) return;
        const batch = trackPromises.slice(i, i + CONCURRENT_REQUESTS);
        const batchResults = await Promise.all(batch);

        batchResults.forEach(result => {
          if (result.track) {
            if (!newChartsData[result.country]) newChartsData[result.country] = [];
            newChartsData[result.country].push(result.track);
          }
        });

        if (isMounted) {
          setCachedCharts(prev => ({ ...prev, ...newChartsData }));
        }
      }

      if (isMounted) setChartsLoading({});
    };

    fetchAllChartsInBatches();
    return () => { isMounted = false; };
  }, [trendingData, cachedCharts]);


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

  const handleClearSearch = () => setSearchQuery('');
  const handlePlayPauseTrack = (track: Track, queue: Track[]) => { /* ... (изменился, чтобы принимать очередь) ... */ };

  const renderContent = () => {
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="success" /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    if (!hasSearched) {
      return (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Browse all</Typography>
            <Grid container spacing={2}>
              {GENRE_CATEGORIES.map(genre => (
                <Grid item xs={6} sm={4} md={3} key={genre.title}>
                  <Link to={`/genre/${genre.title}`} style={{ textDecoration: 'none' }}>
                    <Box sx={{ position: 'relative', height: 180, borderRadius: 2, overflow: 'hidden', backgroundColor: genre.color, '&:hover': { transform: 'scale(1.03)', transition: 'transform 0.2s' } }}>
                      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, p: 2, zIndex: 2 }}>{genre.title}</Typography>
                    </Box>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Popular around the world</Typography>
            <Grid container spacing={2}>
              {Object.keys(CHART_COUNTRIES).map(name => (
                <Grid item xs={6} sm={4} md={3} key={name}>
                  {chartsLoading[name] ? (
                    // [УЛУЧШЕНИЕ] Показываем скелет-загрузчик для каждой карточки
                    <Skeleton variant="rectangular" sx={{ height: 180, borderRadius: 2, bgcolor: 'grey.900' }} />
                  ) : (
                    <Link to={`/chart/${name}`} state={{ country: name, tracks: cachedCharts[name] || [] }} style={{ textDecoration: 'none' }}>
                      <Card sx={{ height: 180, p: 2, display: 'flex', alignItems: 'flex-end', backgroundColor: CHART_COUNTRIES[name].color, '&:hover': { transform: 'scale(1.03)', transition: 'transform 0.2s' } }}>
                        <Typography variant="h5" color="white" fontWeight={700}>{name}</Typography>
                      </Card>
                    </Link>
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      );
    }

    if (searchResults.length > 0) {
        return (
            <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Results for "{searchQuery}"</Typography>
                <Grid container spacing={2}>
                    {searchResults.map(track => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={track.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', '&:hover': { backgroundColor: '#2a2a2a' } }}>
                                <Box sx={{ position: 'relative', pt: '100%', cursor: 'pointer' }} onClick={() => handlePlayPauseTrack(track, searchResults)}>
                                    <CardMedia component="img" image={track.coverUrl} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                                    <IconButton onClick={(e) => { e.stopPropagation(); handlePlayPauseTrack(track, searchResults); }} sx={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'primary.main', color: '#000', opacity: 0, '&:hover': { transform: 'scale(1.1)', backgroundColor: '#1ed760' }, '.MuiCard-root:hover &': { opacity: 1 } }}>
                                        {state.currentTrack?.id === track.id && state.isPlaying ? <Pause /> : <PlayArrow />}
                                    </IconButton>
                                </Box>
                                <CardContent sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ minWidth: 0 }}><Typography noWrap>{track.title}</Typography><Typography noWrap variant="body2" color="text.secondary">{track.artist}</Typography></Box>
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