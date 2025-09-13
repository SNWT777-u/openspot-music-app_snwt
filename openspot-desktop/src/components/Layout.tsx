// src/components/Layout.tsx

import React, { ReactNode, Suspense, useEffect, useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Favorite, QueueMusic, Info, Settings as SettingsIcon, Add as AddIcon, PlaylistPlay } from '@mui/icons-material';
import Player from './Player';
import AudioEngine from './AudioEngine'; // Используем новый стабильный движок
import { useMusic } from '../contexts/MusicContext';
import TopBar from './TopBar';
import NewPlaylistModal from './NewPlaylistModal';

const FullScreenPlayer = React.lazy(() => import('./FullScreenPlayer'));
const drawerWidth = 240;

const menuItems = [
  { text: 'Home', icon: <Home />, path: '/home' },
  { text: 'Search', icon: <Search />, path: '/search' },
  { text: 'Liked Songs', icon: <Favorite />, path: '/liked' },
  { text: 'Recently Played', icon: <QueueMusic />, path: '/recent' },
];

const secondaryMenuItems = [
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'About', icon: <Info />, path: '/about' },
];

interface LayoutProps { children: ReactNode; }

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { state, dispatch } = useMusic();
  const [modalOpen, setModalOpen] = useState(false);

  // Улучшенная логика для подсветки активного пункта меню, включая плейлисты
  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const handleCreatePlaylist = (name: string) => {
    dispatch({ type: 'CREATE_PLAYLIST', payload: name });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (e.code === 'Space' || e.code === 'MediaPlayPause') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <NewPlaylistModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreatePlaylist} />

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#000',
            borderRight: '1px solid #2a2a2a',
            userSelect: 'none',
            // [ИСПРАВЛЕНО] Правильная и надежная структура для сайдбара
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* === Верхний блок (не растягивается) === */}
        <Box sx={{ flexShrink: 0, px: 2, pt: 3, pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1db954', px: 1 }}>OpenSpot</Typography>
        </Box>
        <List>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.text} component={Link} to={item.path} sx={{ color: active ? '#fff' : '#b3b3b3', '&:hover': { color: '#fff' } }}>
                <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            );
          })}
        </List>

        {/* === Средний блок (растягивается и скроллится) === */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Divider sx={{ my: 1, backgroundColor: '#2a2a2a' }} />
            <Box sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', fontWeight: 500 }}>YOUR PLAYLISTS</Typography>
                <IconButton size="small" onClick={() => setModalOpen(true)}><AddIcon sx={{ color: '#b3b3b3', '&:hover': {color: '#fff'} }} /></IconButton>
            </Box>
            <List dense>
                {state.playlists.map(playlist => (
                    <ListItem key={playlist.id} component={Link} to={`/playlist/${playlist.id}`} sx={{ color: isActive(`/playlist/${playlist.id}`) ? '#fff' : '#b3b3b3', '&:hover': { color: '#fff' } }}>
                        <ListItemIcon sx={{minWidth: '40px', color: 'inherit'}}><PlaylistPlay/></ListItemIcon>
                        <ListItemText primary={<Typography noWrap>{playlist.name}</Typography>} />
                    </ListItem>
                ))}
            </List>
        </Box>

        {/* === Нижний блок (не растягивается) === */}
        <Box sx={{ flexShrink: 0 }}>
            <List>
              {secondaryMenuItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                      <ListItem key={item.text} component={Link} to={item.path} sx={{ color: active ? '#fff' : '#b3b3b3', '&:hover': { color: '#fff' } }}>
                        <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItem>
                  );
              })}
            </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <TopBar />
        <AudioEngine />
        <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#121212', marginBottom: '90px', paddingTop: '56px' }}>
          {children}
        </Box>
        <Player sx={{ zIndex: 1200, position: 'fixed', left: drawerWidth, right: 0 }} />
        <Suspense fallback={null}><FullScreenPlayer /></Suspense>
      </Box>
    </Box>
  );
};

export default Layout;