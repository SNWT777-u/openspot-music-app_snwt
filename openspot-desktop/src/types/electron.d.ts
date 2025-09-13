declare global {
  interface Window {
    electronAPI: {
      // Music controls
      playPause: () => Promise<any>;
      nextTrack: () => Promise<any>;
      previousTrack: () => Promise<any>;
      setVolume: (volume: number) => Promise<any>;
      
      // File system
      onMusicFolderSelected: (callback: (event: any, path: string) => void) => void;
      
      // Platform info
      platform: string;
      
      // App info
      getAppVersion: () => Promise<string>;
      getAppIconPath: () => string;
      
      // Persistence
      getStoreValue: (key: string) => Promise<any>;
      setStoreValue: (key: string, value: any) => Promise<void>;
      
      // Window controls
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      
      // Remove listeners
      removeAllListeners: (channel: string) => void;

      searchTracks: (query: string) => Promise<{ success: boolean; data?: SearchResponse; error?: string }>;
      getStreamUrl: (trackId: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      getLyrics: (artist: string, title: string) => Promise<{ success: boolean; data?: { lyrics: string }; error?: string }>;
    };
  }
}

export {}; 