// src/pages/RecentlyPlayed.tsx

import React from 'react';
import { History } from '@mui/icons-material';
import { useMusic } from '../contexts/MusicContext';
import PlaylistPage from './PlaylistPage';

const RecentlyPlayed: React.FC = () => {
  const { state } = useMusic();

  return (
    <PlaylistPage
      title="Recently Played"
      description="Your listening history"
      tracks={state.recentlyPlayed}
      icon={<History sx={{ fontSize: 80, color: '#fff' }} />}
      gradient="#2c7255"
    />
  );
};

export default RecentlyPlayed;