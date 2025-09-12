// src/App.tsx

import React from 'react';
// 1. Заменяем BrowserRouter на HashRouter
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import './App.css';

import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import LikedSongs from './pages/LikedSongs';
import RecentlyPlayed from './pages/RecentlyPlayed';
import About from './pages/About';
import { MusicProvider } from './contexts/MusicContext';

// 2. Полностью удаляем ненадежный компонент DefaultRouteHandler
// const DefaultRouteHandler: React.FC = () => { ... };

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1db954',
    },
    secondary: {
      main: '#535353',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a',
          '&:hover': {
            backgroundColor: '#3a3a3a',
          },
        },
      },
    },
  },
});

const App: React.FC = () => {
  // 3. Убираем лишние проверки и логи

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <MusicProvider>
        {/* 4. Используем HashRouter. Он универсален и не требует `basename` */}
        <Router>
          <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
            <Layout>
              <Routes>
                {/* 5. Добавляем чистое перенаправление с корневого пути */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/liked" element={<LikedSongs />} />
                <Route path="/recent" element={<RecentlyPlayed />} />
                <Route path="/about" element={<About />} />
                {/* 6. "*" для обработки любых несуществующих путей */}
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Layout>
          </Box>
        </Router>
      </MusicProvider>
    </ThemeProvider>
  );
};

export default App;