// src/components/NewPlaylistModal.tsx

import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Stack } from '@mui/material';

interface NewPlaylistModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#2a2a2a',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const NewPlaylistModal: React.FC<NewPlaylistModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" sx={{ color: '#fff', mb: 2 }}>
          Create New Playlist
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          label="Playlist Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} sx={{ color: '#b3b3b3' }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
            Create
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default NewPlaylistModal;