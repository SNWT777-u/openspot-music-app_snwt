const { contextBridge, ipcRenderer } = require('electron');
const {join} = require("node:path");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Music controls
  playPause: () => ipcRenderer.invoke('play-pause'),
  nextTrack: () => ipcRenderer.invoke('next-track'),
  previousTrack: () => ipcRenderer.invoke('previous-track'),
  setVolume: (volume) => ipcRenderer.invoke('set-volume', volume),
  
  // File system
  onMusicFolderSelected: (callback) => ipcRenderer.on('music-folder-selected', callback),
  
  // Platform info
  platform: process.platform,
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppIconPath: () => join(__dirname, '../build/icon.png'),

  // Persistence
  getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  searchTracks: (query) => ipcRenderer.invoke('search-tracks', query),
  getStreamUrl: (trackId) => ipcRenderer.invoke('get-stream-url', trackId),
  getLyrics: (artist, title) => ipcRenderer.invoke('get-lyrics', artist, title),
}); 