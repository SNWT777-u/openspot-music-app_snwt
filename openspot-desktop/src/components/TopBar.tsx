// src/components/TopBar.tsx

import React, { useState, useEffect } from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos, Remove, CropSquare, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    if (isElectron) {
      // Запрашиваем платформу один раз при монтировании
      setPlatform(window.electronAPI.platform);
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <Box
      sx={{
        // В Layout.tsx мы используем paddingLeft на main-контейнере,
        // так что здесь left должен быть 0.
        position: 'fixed',
        top: 0,
        left: 240, // Ширина сайдбара
        right: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'rgba(18, 18, 18, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        WebkitAppRegion: 'drag',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ WebkitAppRegion: 'no-drag' }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff' }}>
          <ArrowBackIosNew fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => navigate(1)} sx={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff' }}>
          <ArrowForwardIos fontSize="small" />
        </IconButton>
      </Stack>

      {isElectron && platform !== 'darwin' && (
        <Stack direction="row" spacing={1} sx={{ WebkitAppRegion: 'no-drag' }}>
          <IconButton size="small" onClick={handleMinimize} sx={{ color: '#fff' }}>
            <Remove fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleMaximize} sx={{ color: '#fff' }}>
            <CropSquare fontSize="small" sx={{ transform: 'scale(0.8)' }} />
          </IconButton>
          <IconButton size="small" onClick={handleClose} sx={{ color: '#fff', '&:hover': { backgroundColor: 'rgba(232, 17, 35, 0.9)'} }}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
};

// [ИСПРАВЛЕНИЕ] Добавляем эту строку, чтобы файл стал модулем
export default TopBar;