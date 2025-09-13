import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Types

export interface Settings {
  crossfade: number; // Длительность кроссфейда в секундах
}

export interface Playlist {
  id: string; // Уникальный ID, например, `playlist_1678886400000`
  name: string;
  tracks: Track[];
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
  | { type: 'CREATE_PLAYLIST'; payload: string } // payload = имя плейлиста
  | { type: 'DELETE_PLAYLIST'; payload: string } // payload = ID плейлиста
  | { type: 'ADD_TRACK_TO_PLAYLIST'; payload: { playlistId: string; track: Track } }
  | { type: 'LOAD_SETTINGS'; payload: Settings }
    | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'LOAD_PLAYLISTS'; payload: Playlist[] };


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
    crossfade: 3, // По умолчанию 3 секунды, 0 - выключено
  },
  playlists: [],
};

// Reducer
const shuffleArray = (array: Track[], currentTrackId?: string): Track[] => {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure current track stays at the same index if possible
  if (currentTrackId) {
    const idx = arr.findIndex(t => t.id === currentTrackId);
    if (idx > 0) {
      const [track] = arr.splice(idx, 1);
      arr.unshift(track);
    }
  }
  return arr;
};

const musicReducer = (state: MusicState, action: MusicAction): MusicState => {
  switch (action.type) {
    case 'SET_CURRENT_TRACK': {
      let currentIndex = 0;
      if (state.isShuffled && state.shuffledQueue.length > 0) {
        currentIndex = state.shuffledQueue.findIndex(t => t.id === action.payload.id);
      } else {
        currentIndex = state.queue.findIndex(t => t.id === action.payload.id);
      }
      return {
        ...state,
        currentTrack: action.payload,
        isPlaying: state.isPlaying,
        currentIndex,
      };
    }

    case 'TOGGLE_PLAY_PAUSE':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_VOLUME':
      return { ...state, volume: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_QUEUE': {
      const shuffled = state.isShuffled ? shuffleArray(action.payload, state.currentTrack?.id) : [];
      return { ...state, queue: action.payload, shuffledQueue: shuffled, currentIndex: 0 };
    }

    case 'NEXT_TRACK': {
      const queue = state.isShuffled ? state.shuffledQueue : state.queue;
      if (queue.length === 0) return state;
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (state.repeatMode === 'playlist') {
          nextIndex = 0;
        } else {
          return { ...state, isPlaying: false };
        }
      }
      const nextTrack = queue[nextIndex];
      const recentlyPlayed = [nextTrack, ...state.recentlyPlayed.filter(t => t.id !== nextTrack.id)];
      return {
        ...state,
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        currentTime: 0,
        isPlaying: true,
        recentlyPlayed: recentlyPlayed.slice(0, 50),
      };
    }

    case 'PREVIOUS_TRACK': {
      const queue = state.isShuffled ? state.shuffledQueue : state.queue;
      if (queue.length === 0) return state;
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.repeatMode === 'playlist') {
          prevIndex = queue.length - 1;
        } else {
          prevIndex = 0;
        }
      }
      const prevTrack = queue[prevIndex];
      const recentlyPlayed = [prevTrack, ...state.recentlyPlayed.filter(t => t.id !== prevTrack.id)];
      return {
        ...state,
        currentIndex: prevIndex,
        currentTrack: prevTrack,
        currentTime: 0,
        isPlaying: true,
        recentlyPlayed: recentlyPlayed.slice(0, 50),
      };
    }

    case 'TOGGLE_SHUFFLE': {
      const isShuffled = !state.isShuffled;
      let shuffledQueue = state.shuffledQueue;
      let currentIndex = state.currentIndex;
      if (isShuffled) {
        shuffledQueue = shuffleArray(state.queue, state.currentTrack?.id);
        currentIndex = shuffledQueue.findIndex(t => t.id === state.currentTrack?.id);
      } else {
        currentIndex = state.queue.findIndex(t => t.id === state.currentTrack?.id);
      }
      return { ...state, isShuffled, shuffledQueue, currentIndex };
    }

    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };

    case 'TOGGLE_LIKE_TRACK': {
      const track = action.payload;
      const isLiked = state.likedTracks.some(t => t.id === track.id);
      if (isLiked) {
        return { ...state, likedTracks: state.likedTracks.filter(t => t.id !== track.id) };
      }
      return { ...state, likedTracks: [...state.likedTracks, { ...track, liked: true }] };
    }

    case 'ADD_TO_RECENTLY_PLAYED': {
      const recentlyPlayed = [action.payload, ...state.recentlyPlayed.filter(t => t.id !== action.payload.id)];
      return { ...state, recentlyPlayed: recentlyPlayed.slice(0, 50) };
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
      const newPlaylist: Playlist = { id: `playlist_${Date.now()}`, name: action.payload, tracks: [] };
      return { ...state, playlists: [...state.playlists, newPlaylist] };
    }

    case 'DELETE_PLAYLIST':
      return { ...state, playlists: state.playlists.filter(p => p.id !== action.payload) };

    case 'ADD_TRACK_TO_PLAYLIST': {
      return {
        ...state,
        playlists: state.playlists.map(playlist => {
          if (playlist.id === action.payload.playlistId) {
            if (playlist.tracks.some(t => t.id === action.payload.track.id)) {
              return playlist;
            }
            return { ...playlist, tracks: [...playlist.tracks, action.payload.track] };
          }
          return playlist;
        }),
      };
    }

    case 'LOAD_SETTINGS':
      return { ...state, settings: { ...initialState.settings, ...action.payload } };

    case 'LOAD_PLAYLISTS':
      return { ...state, playlists: action.payload };

    default:
      return state;
  }
};

// Context
const MusicContext = createContext<{
  state: MusicState;
  dispatch: React.Dispatch<MusicAction>;
} | undefined>(undefined);

// Provider
export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  
  // Load persisted data on mount
  // Загрузка всех данных при старте
  useEffect(() => {

     const loadPersistedData = async () => {
      try {
        if (!window.electronAPI) return;
        // Загружаем настройки
        const savedSettings = await window.electronAPI.getStoreValue('settings');
        if (savedSettings) {
          dispatch({ type: 'LOAD_SETTINGS', payload: savedSettings });
        }

        // Загружаем плейлисты
        const savedPlaylists = await window.electronAPI.getStoreValue('playlists');
        if (savedPlaylists && Array.isArray(savedPlaylists)) {
          dispatch({ type: 'LOAD_PLAYLISTS', payload: savedPlaylists });
        }
        
        // Load recently played
        const savedRecentlyPlayed = await window.electronAPI.getStoreValue('recentlyPlayed');
        if (savedRecentlyPlayed && Array.isArray(savedRecentlyPlayed)) {
          dispatch({ type: 'LOAD_RECENTLY_PLAYED', payload: savedRecentlyPlayed });
        }
      } catch (error) {
        console.error('Failed to load persisted data:', error);
      }
    };
    
    loadPersistedData();
  }, []);

  // Сохранение настроек при их изменении
  useEffect(() => {
    if (state.settings !== initialState.settings && window.electronAPI) {
      window.electronAPI.setStoreValue('settings', state.settings);
    }
  }, [state.settings]);

  // Сохранение плейлистов при их изменении
  useEffect(() => {
    if (state.playlists !== initialState.playlists && window.electronAPI) {
      window.electronAPI.setStoreValue('playlists', state.playlists);
    }
  }, [state.playlists]);
  
  // Save liked tracks whenever they change
  useEffect(() => {
    const saveLikedTracks = async () => {
      try {
        await window.electronAPI.setStoreValue('likedTracks', state.likedTracks);
      } catch (error) {
        console.error('Failed to save liked tracks:', error);
      }
    };
    
    // Only save if we have liked tracks (avoid saving empty array on initial load)
    if (state.likedTracks.length > 0 || state.likedTracks !== initialState.likedTracks) {
      saveLikedTracks();
    }
  }, [state.likedTracks]);
  
  // Save recently played whenever they change
  useEffect(() => {
    const saveRecentlyPlayed = async () => {
      try {
        await window.electronAPI.setStoreValue('recentlyPlayed', state.recentlyPlayed);
      } catch (error) {
        console.error('Failed to save recently played:', error);
      }
    };
    
    // Only save if we have recently played tracks (avoid saving empty array on initial load)
    if (state.recentlyPlayed.length > 0 || state.recentlyPlayed !== initialState.recentlyPlayed) {
      saveRecentlyPlayed();
    }
  }, [state.recentlyPlayed]);
  
  return (
    <MusicContext.Provider value={{ state, dispatch }}>
      {children}
    </MusicContext.Provider>
  );
};

// Hook
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}; 