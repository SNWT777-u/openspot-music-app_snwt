// src/pages/Settings.tsx

import React from 'react';
import { Box, Typography, Slider, Paper } from '@mui/material';
import { useMusic } from '../contexts/MusicContext';

const Settings: React.FC = () => {
  const { state, dispatch } = useMusic();
  const { settings } = state;

  const handleCrossfadeChange = (event: Event, newValue: number | number[]) => {
    const crossfadeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    dispatch({ type: 'UPDATE_SETTINGS', payload: { crossfade: crossfadeValue } });
  };

  const marks = [
    { value: 0, label: 'Off' },
    { value: 3, label: '3s' },
    { value: 6, label: '6s' },
    { value: 9, label: '9s' },
    { value: 12, label: '12s' },
  ];

  return (
    <Box sx={{ p: 4, pb: '100px', maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 4 }}>
        Settings
      </Typography>

      <Paper sx={{ p: 3, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
          Playback
        </Typography>

        <Box sx={{ mt: 3, px: 2 }}>
          <Typography gutterBottom sx={{ color: '#b3b3b3' }}>
            Crossfade
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Allows you to seamlessly transition between songs.
          </Typography>
          <Slider
            aria-label="Crossfade duration"
            value={settings.crossfade}
            onChange={handleCrossfadeChange}
            step={1}
            marks={marks}
            min={0}
            max={12}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}s`}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;