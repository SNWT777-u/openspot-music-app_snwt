import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

// Types
export interface Settings {
  crossfade: number;
  theme?: 'light' | 'dark';
  playbackQuality?: 'low' | 'medium' | 'high';
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  liked: boolean;
  addedAt?: number;
}

export interface MusicState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Track[];
  shuffledQueue: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'track' | 'playlist';
  likedTracks: Track[];
  recentlyPlayed: Track[];
  isFullScreenPlayerOpen: boolean;
  settings: Settings;
  playlists: Playlist[];
  isLoading: boolean;
  error: string | null;
}

// Actions
export type MusicAction =
  | { type: 'SET_CURRENT_TRACK'; payload: Track }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_QUEUE'; payload: Track[] }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREVIOUS_TRACK' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_REPEAT_MODE'; payload: 'off' | 'track' | 'playlist' }
  | { type: 'TOGGLE_LIKE_TRACK'; payload: Track }
  | { type: 'ADD_TO_RECENTLY_PLAYED'; payload: Track }
  | { type: 'LOAD_LIKED_TRACKS'; payload: Track[] }
  | { type: 'LOAD_RECENTLY_PLAYED'; payload: Track[] }
  | { type: 'OPEN_FULLSCREEN_PLAYER' }
  | { type: 'CLOSE_FULLSCREEN_PLAYER' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'CREATE_PLAYLIST'; payload: string }
  | { type: 'DELETE_PLAYLIST'; payload: string }
  | { type: 'ADD_TRACK_TO_PLAYLIST'; payload: { playlistId: string; track: Track } }
  | { type: 'REMOVE_TRACK_FROM_PLAYLIST'; payload: { playlistId: string; trackId: string } }
  | { type: 'LOAD_SETTINGS'; payload: Settings }
  | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'LOAD_PLAYLISTS'; payload: Playlist[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: MusicState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  queue: [],
  shuffledQueue: [],
  currentIndex: 0,
  isShuffled: false,
  repeatMode: 'off',
  likedTracks: [],
  recentlyPlayed: [],
  isFullScreenPlayerOpen: false,
  settings: {
    crossfade: 3,
    theme: 'dark',
    playbackQuality: 'medium',
  },
  playlists: [],
  isLoading: false,
  error: null,
};

// Utility functions
const shuffleArray = (array: Track[], currentTrackId?: string): Track[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (currentTrackId) {
    const idx = arr.findIndex(t => t.id === currentTrackId);
    if (idx > 0) {
      const [track] = arr.splice(idx, 1);
      arr.unshift(track);
    }
  }
  return arr;
};

// Reducer
const musicReducer = (state: MusicState, action: MusicAction): MusicState => {
  switch (action.type) {
    case 'SET_CURRENT_TRACK': {
      const queue = state.isShuffled ? state.shuffledQueue : state.queue;
      const currentIndex = queue.findIndex(t => t.id === action.payload.id);
      return {
        ...state,
        currentTrack: action.payload,
        currentIndex: currentIndex >= 0 ? currentIndex : state.currentIndex,
        currentTime: 0,
      };
    }

    case 'TOGGLE_PLAY_PAUSE':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: Math.max(0, action.payload) };

    case 'SET_DURATION':
      return { ...state, duration: Math.max(0, action.payload) };

    case 'SET_QUEUE': {
      const shuffled = state.isShuffled ? shuffleArray(action.payload, state.currentTrack?.id) : [];
      return { ...state, queue: action.payload, shuffledQueue: shuffled, currentIndex: 0 };
    }

    case 'NEXT_TRACK': {
      const queue = state.isShuffled ? state.shuffledQueue : state.queue;
      if (queue.length === 0) return { ...state, isPlaying: false };
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (state.repeatMode === 'playlist') {
          nextIndex = 0;
        } else {
          return { ...state, isPlaying: false };
        }
      }
      const nextTrack = queue[nextIndex];
      return {
        ...state,
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        currentTime: 0,
        isPlaying: true,
        recentlyPlayed: [nextTrack, ...state.recentlyPlayed.filter(t => t.id !== nextTrack.id)].slice(0, 50),
      };
    }

    case 'PREVIOUS_TRACK': {
      const queue = state.isShuffled ? state.shuffledQueue : state.queue;
      if (queue.length === 0) return state;
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.repeatMode === 'playlist' ? queue.length - 1 : 0;
      }
      const prevTrack = queue[prevIndex];
      return {
        ...state,
        currentIndex: prevIndex,
        currentTrack: prevTrack,
        currentTime: 0,
        isPlaying: true,
        recentlyPlayed: [prevTrack, ...state.recentlyPlayed.filter(t => t.id !== prevTrack.id)].slice(0, 50),
      };
    }

    case 'TOGGLE_SHUFFLE': {
      const isShuffled = !state.isShuffled;
      const shuffledQueue = isShuffled ? shuffleArray(state.queue, state.currentTrack?.id) : [];
      const currentIndex = isShuffled
        ? shuffledQueue.findIndex(t => t.id === state.currentTrack?.id) || 0
        : state.queue.findIndex(t => t.id === state.currentTrack?.id) || 0;
      return { ...state, isShuffled, shuffledQueue, currentIndex };
    }

    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };

    case 'TOGGLE_LIKE_TRACK': {
      const track = { ...action.payload, liked: !action.payload.liked };
      const likedTracks = track.liked
        ? [...state.likedTracks, track]
        : state.likedTracks.filter(t => t.id !== track.id);
      return { ...state, likedTracks };
    }

    case 'ADD_TO_RECENTLY_PLAYED': {
      return {
        ...state,
        recentlyPlayed: [action.payload, ...state.recentlyPlayed.filter(t => t.id !== action.payload.id)].slice(0, 50),
      };
    }

    case 'LOAD_LIKED_TRACKS':
      return { ...state, likedTracks: action.payload };

    case 'LOAD_RECENTLY_PLAYED':
      return { ...state, recentlyPlayed: action.payload };

    case 'OPEN_FULLSCREEN_PLAYER':
      return { ...state, isFullScreenPlayerOpen: true };

    case 'CLOSE_FULLSCREEN_PLAYER':
      return { ...state, isFullScreenPlayerOpen: false };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'CREATE_PLAYLIST': {
      const timestamp = Date.now();
      const newPlaylist: Playlist = {
        id: `playlist_${timestamp}`,
        name: action.payload,
        tracks: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return { ...state, playlists: [...state.playlists, newPlaylist] };
    }

    case 'DELETE_PLAYLIST':
      return { ...state, playlists: state.playlists.filter(p => p.id !== action.payload) };

    case 'ADD_TRACK_TO_PLAYLIST': {
      return {
        ...state,
        playlists: state.playlists.map(playlist =>
          playlist.id === action.payload.playlistId
            ? {
                ...playlist,
                tracks: playlist.tracks.some(t => t.id === action.payload.track.id)
                  ? playlist.tracks
                  : [...playlist.tracks, { ...action.payload.track, addedAt: Date.now() }],
                updatedAt: Date.now(),
              }
            : playlist
        ),
      };
    }

    case 'REMOVE_TRACK_FROM_PLAYLIST': {
      return {
        ...state,
        playlists: state.playlists.map(playlist =>
          playlist.id === action.payload.playlistId
            ? { ...playlist, tracks: playlist.tracks.filter(t => t.id !== action.payload.trackId), updatedAt: Date.now() }
            : playlist
        ),
      };
    }

    case 'LOAD_SETTINGS':
      return { ...state, settings: { ...initialState.settings, ...action.payload } };

    case 'LOAD_PLAYLISTS':
      return { ...state, playlists: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
};

// Context
interface MusicContextType {
  state: MusicState;
  dispatch: React.Dispatch<MusicAction>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Provider
export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(musicReducer, initialState);

  // Debounced save function
  const saveToStore = useCallback(
    debounce(async (key: string, value: any) => {
      try {
        if (window.electronAPI) {
          await window.electronAPI.setStoreValue(key, value);
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to save ${key}: ${error}` });
      }
    }, 500),
    []
  );

  // Load persisted data
  useEffect(() => {
    let mounted = true;

    const loadPersistedData = async () => {
      if (!window.electronAPI || !mounted) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const [settings, playlists, likedTracks, recentlyPlayed] = await Promise.all([
          window.electronAPI.getStoreValue('settings'),
          window.electronAPI.getStoreValue('playlists'),
          window.electronAPI.getStoreValue('likedTracks'),
          window.electronAPI.getStoreValue('recentlyPlayed'),
        ]);

        if (settings && mounted) {
          dispatch({ type: 'LOAD_SETTINGS', payload: settings });
        }
        if (playlists && Array.isArray(playlists) && mounted) {
          dispatch({ type: 'LOAD_PLAYLISTS', payload: playlists });
        }
        if (likedTracks && Array.isArray(likedTracks) && mounted) {
          dispatch({ type: 'LOAD_LIKED_TRACKS', payload: likedTracks });
        }
        if (recentlyPlayed && Array.isArray(recentlyPlayed) && mounted) {
          dispatch({ type: 'LOAD_RECENTLY_PLAYED', payload: recentlyPlayed });
        }
      } catch (error) {
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: `Failed to load persisted data: ${error}` });
        }
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    loadPersistedData();

    return () => {
      mounted = false;
    };
  }, []);

  // Save state changes
  useEffect(() => {
    if (state.settings !== initialState.settings) {
      saveToStore('settings', state.settings);
    }
  }, [state.settings, saveToStore]);

  useEffect(() => {
    if (state.playlists !== initialState.playlists) {
      saveToStore('playlists', state.playlists);
    }
  }, [state.playlists, saveToStore]);

  useEffect(() => {
    if (state.likedTracks.length > 0) {
      saveToStore('likedTracks', state.likedTracks);
    }
  }, [state.likedTracks, saveToStore]);

  useEffect(() => {
    if (state.recentlyPlayed.length > 0) {
      saveToStore('recentlyPlayed', state.recentlyPlayed);
    }
  }, [state.recentlyPlayed, saveToStore]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};

// Hook
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
