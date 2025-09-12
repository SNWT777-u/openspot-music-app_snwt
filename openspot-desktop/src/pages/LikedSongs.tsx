// src/pages/LikedSongs.tsx

import React from 'react';
import { Favorite, History } from '@mui/icons-material';
import { useMusic } from '../contexts/MusicContext';
import PlaylistPage from './PlaylistPage';

const LikedSongs: React.FC = () => {
  const { state } = useMusic();

  return (
    <PlaylistPage
      title="Liked Songs"
      description={`${state.likedTracks.length} liked songs`}
      tracks={state.likedTracks}
      icon={<Favorite sx={{ fontSize: 80, color: '#fff' }} />}
      gradient="#5037a1"
    />
  );
};

export default LikedSongs;