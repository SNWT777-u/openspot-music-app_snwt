// src/pages/About.tsx

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CardMedia, Stack, Alert, CircularProgress } from '@mui/material';
import { GitHub, Update, CheckCircle } from '@mui/icons-material';

// [ПЕРСОНАЛИЗАЦИЯ] Ссылки теперь указывают на ваш форк
const RELEASES_URL = 'https://github.com/ruslan/openspot-music-app_snwt/releases';
const GITHUB_REPO_URL = 'https://github.com/ruslan/openspot-music-app_snwt';

const About: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        setCheckingUpdate(true);
        setUpdateError(null);

        const currentVersion = await window.electronAPI.getAppVersion();
        setAppVersion(currentVersion);

        // [ПЕРСОНАЛИЗАЦИЯ] API-запрос к вашему форку
        const response = await fetch('https://api.github.com/repos/ruslan/openspot-music-app_snwt/releases/latest');

        if (response.status === 404) {
          // Обработка случая, когда релизов в форке еще нет
          setLatestVersion(currentVersion);
          setUpdateAvailable(false);
          console.log('No releases found on the fork. Assuming current version is the latest.');
          return;
        }

        if (!response.ok) {
          throw new Error(`GitHub API Error: HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.tag_name) {
          const remoteVersion = data.tag_name;
          setLatestVersion(remoteVersion);

          // Надежное сравнение версий
          const normalizedLocal = currentVersion.replace(/^v/, '');
          const normalizedRemote = remoteVersion.replace(/^v/, '');

          if (normalizedRemote !== normalizedLocal) {
            setUpdateAvailable(true);
          }
        } else {
          setLatestVersion(currentVersion);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
        setUpdateError(error instanceof Error ? error.message : 'An unknown error occurred.');
        if (appVersion) setLatestVersion(appVersion);
      } finally {
        setCheckingUpdate(false);
      }
    };

    checkForUpdates();
  }, [appVersion]);

  const handleUpdateClick = () => {
    window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
  };

  const handleGitHubClick = () => {
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', background: '#181818' }}>
      <CardMedia
        component="img"
        image="https://i.postimg.cc/LsLmXZTb/main.png"
        alt="OpenSpot Icon"
        sx={{ width: 120, height: 120, borderRadius: 4, mb: 3, boxShadow: 6 }}
      />
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>OpenSpot</Typography>

      {/* Информация о версиях */}
      <Stack direction="column" spacing={2} alignItems="center" sx={{ mb: 4, width: '100%', maxWidth: 400 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', width: '100%', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#b3b3b3' }}>Current Version:</Typography>
          <Typography variant="body2" sx={{ color: '#1db954', fontWeight: 600 }}>
            {appVersion ? `v${appVersion}` : 'Loading...'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', width: '100%', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#b3b3b3' }}>Latest Version:</Typography>
          <Typography variant="body2" sx={{ color: updateAvailable ? '#ff4444' : '#1db954', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            {checkingUpdate ? (
              <><CircularProgress size={16} color="inherit" /> Checking...</>
            ) : (
              <>
                {updateAvailable && <Update sx={{ fontSize: 16 }} />}
                {!updateAvailable && !updateError && <CheckCircle sx={{ fontSize: 16 }} />}
                {latestVersion || 'N/A'}
              </>
            )}
          </Typography>
        </Box>

        {updateAvailable && (
          <Alert severity="info" sx={{ width: '100%', backgroundColor: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', '& .MuiAlert-icon': { color: '#1db954' }, '& .MuiAlert-message': { color: '#fff' } }}>
            A new version is available! Click the button below to download.
          </Alert>
        )}
        {updateError && (
          <Alert severity="warning" sx={{ width: '100%' }}>
            {updateError}
          </Alert>
        )}
      </Stack>

      {/* Кнопки */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="success"
          startIcon={updateAvailable ? <Update /> : <CheckCircle />}
          onClick={handleUpdateClick}
          sx={{ borderRadius: 20, fontWeight: 600, backgroundColor: updateAvailable ? '#ff4444' : undefined, '&:hover': { backgroundColor: updateAvailable ? '#ff3333' : undefined } }}
        >
          {updateAvailable ? 'Update Available' : 'Check for Updates'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<GitHub />}
          onClick={handleGitHubClick}
          sx={{ borderRadius: 20, fontWeight: 600, borderColor: '#b3b3b3', color: '#b3b3b3', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
        >
          View on GitHub
        </Button>
      </Stack>

      {/* Секция благодарностей */}
      <Box sx={{ width: '100%', maxWidth: 500, padding: '24px', backgroundColor: 'rgba(29, 185, 84, 0.05)', borderRadius: '16px', border: '1px solid rgba(29, 185, 84, 0.2)', textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#1db954', fontWeight: 600, mb: 2 }}>
          Credits & Thanks
        </Typography>
        <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 2, lineHeight: 1.6 }}>
          This application is a fork of the original OpenSpot project by BlackHatDevX. The experience is powered by the amazing music streaming API provided by **king**.
        </Typography>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Your contributions are always welcome on GitHub!
        </Typography>
      </Box>
    </Box>
  );
};

export default About;