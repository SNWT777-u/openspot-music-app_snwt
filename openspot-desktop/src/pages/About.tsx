import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CardMedia, Stack, Alert, CircularProgress } from '@mui/material';
import { GitHub, Update, CheckCircle } from '@mui/icons-material';


const RELEASES_URL = 'https://github.com/BlackHatDevX/openspot-music-app/releases';
const GITHUB_REPO_URL = 'https://github.com/BlackHatDevX/openspot-music-app';

const About: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        setCheckingUpdate(true);
        setUpdateError(null);

        // 3. Получаем текущую версию приложения через Electron API
        const currentVersion = await window.electronAPI.getAppVersion();
        setAppVersion(currentVersion);

        // Получаем последнюю версию с GitHub
        const response = await fetch('https://api.github.com/repos/BlackHatDevX/openspot-music-app/releases/latest');
        if (!response.ok) {
          throw new Error(`GitHub API Error: HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.tag_name) {
          const remoteVersion = data.tag_name;
          setLatestVersion(remoteVersion);

          // 4. [ИСПРАВЛЕНО] Надежное сравнение версий
          const normalizedLocal = currentVersion.replace(/^v/, '');
          const normalizedRemote = remoteVersion.replace(/^v/, '');

          if (normalizedRemote !== normalizedLocal) {
            setUpdateAvailable(true);
          }
        } else {
          // Если тег не найден, считаем, что мы на последней версии
          setLatestVersion(currentVersion);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
        setUpdateError(error instanceof Error ? error.message : 'An unknown error occurred.');
        // В случае ошибки, отображаем текущую версию как последнюю
        if (appVersion) setLatestVersion(appVersion);
      } finally {
        setCheckingUpdate(false);
      }
    };

    checkForUpdates();
  }, [appVersion]); // Перезапускаем проверку, если appVersion изменится (хотя это маловероятно)

  const handleUpdateClick = () => {
    window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
  };

  const handleGitHubClick = () => {
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#181818' }}>
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
          <Alert severity="info" sx={{ width: '100%', backgroundColor: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.3)', '& .MuiAlert-icon': { color: '#1db954' } }}>
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
        <Button variant="contained" color="success" startIcon={updateAvailable ? <Update /> : <CheckCircle />} onClick={handleUpdateClick} sx={{ borderRadius: 20, fontWeight: 600, backgroundColor: updateAvailable ? '#ff4444' : undefined }}>
          {updateAvailable ? 'Update Available' : 'Check for Updates'}
        </Button>
        <Button variant="outlined" startIcon={<GitHub />} onClick={handleGitHubClick} sx={{ borderRadius: 20, fontWeight: 600, borderColor: '#b3b3b3', color: '#b3b3b3', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
          View on GitHub
        </Button>
      </Stack>

      {/* Credits Section */}
      <Box sx={{ 
        width: '100%', 
        maxWidth: 500, 
        padding: '24px', 
        backgroundColor: 'rgba(29, 185, 84, 0.05)', 
        borderRadius: '16px',
        border: '1px solid rgba(29, 185, 84, 0.2)',
        textAlign: 'center'
      }}>
        <Typography variant="h6" sx={{ color: '#1db954', fontWeight: 600, mb: 2 }}>
          Special Thanks
        </Typography>
        <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 3, lineHeight: 1.6 }}>
          OpenSpot wouldn't be possible without the amazing music streaming API provided by{' '}
          <Box
            component="span"
            sx={{ 
              color: '#1db954', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Box
              component="img"
              alt="king"
              sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '4px',
                verticalAlign: 'middle'
              }}
            />
            king
          </Box>
          . Their service provides high-quality audio streaming and comprehensive music metadata that powers the entire OpenSpot experience.
        </Typography>
      </Box>
    </Box>
  );
};

export default About;
