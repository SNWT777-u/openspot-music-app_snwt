// src/components/TrackMenu.tsx

import React, { useState } from 'react';
import { Menu, MenuItem, IconButton, ListItemIcon, ListItemText } from '@mui/material';
import { MoreVert, PlaylistAdd } from '@mui/icons-material';
import { useMusic, Track } from '../contexts/MusicContext';

interface TrackMenuProps {
  track: Track;
}

const TrackMenu: React.FC<TrackMenuProps> = ({ track }) => {
  const { state, dispatch } = useMusic();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [playlistMenuAnchorEl, setPlaylistMenuAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const playlistMenuOpen = Boolean(playlistMenuAnchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPlaylistMenuAnchorEl(null);
  };

  const handlePlaylistMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPlaylistMenuAnchorEl(event.currentTarget);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    dispatch({ type: 'ADD_TRACK_TO_PLAYLIST', payload: { playlistId, track } });
    handleClose();
  };

  return (
    <>
      <IconButton
        aria-label="more"
        onClick={handleClick}
        sx={{ color: '#b3b3b3' }}
      >
        <MoreVert />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onMouseOver={handlePlaylistMenuOpen}>
          <ListItemIcon><PlaylistAdd fontSize="small" /></ListItemIcon>
          <ListItemText>Add to Playlist</ListItemText>
        </MenuItem>
        {/* Здесь можно добавить другие пункты, например, "Share", "View Artist" */}
      </Menu>

      {/* Вложенное меню для списка плейлистов */}
      <Menu
        anchorEl={playlistMenuAnchorEl}
        open={playlistMenuOpen}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {state.playlists.length > 0 ? (
          state.playlists.map(playlist => (
            <MenuItem key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)}>
              {playlist.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No playlists created</MenuItem>
        )}
      </Menu>
    </>
  );
};

export default TrackMenu;