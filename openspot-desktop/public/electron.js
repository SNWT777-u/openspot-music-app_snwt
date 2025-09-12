const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const axios = require('axios'); // Добавляем axios для сетевых запросов

// Add electron-store for persistence
const Store = require('electron-store');
const store = new Store();

let mainWindow;

// --- СЕКЦИЯ API ЛОГИКИ (ПЕРЕНЕСЕНО ИЗ music-api.ts) ---
// Делаем запросы из main-процесса, чтобы обойти ограничения CORS в renderer-процессе
const API_BASE_URL = 'https://dab.yeet.su/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
});

async function searchTracksInMain(query) {
  const params = new URLSearchParams({ q: query, offset: '0', limit: '20', type: 'track' });
  const response = await apiClient.get(`/search?${params}`);
  return response.data;
}

// --- КОНЕЦ СЕКЦИИ API ЛОГИКИ ---


function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icon.png'),
  });

  // Load the app - Убедимся, что порт 3001
  const startUrl = isDev ? 'http://localhost:3006' : `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- СЕКЦИЯ IPC ОБРАБОТЧИКОВ ---

// Music controls (placeholders)
ipcMain.handle('play-pause', () => ({ success: true }));
ipcMain.handle('next-track', () => ({ success: true }));
ipcMain.handle('previous-track', () => ({ success: true }));
ipcMain.handle('set-volume', (event, volume) => ({ success: true, volume }));

// Persistence handlers
ipcMain.handle('get-store-value', (event, key) => store.get(key));
ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
});

// [НОВОЕ] API Proxy handlers
ipcMain.handle('search-tracks', async (event, query) => {
  try {
    const results = await searchTracksInMain(query);
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main Process Error] Search Tracks:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stream-url', async (event, trackId) => {
  try {
    const response = await apiClient.get(`/stream?trackId=${trackId}`);
    // Проверяем, что данные и URL существуют
    if (response.data && response.data.url) {
      return { success: true, data: response.data.url };
    } else {
      // Если ответ пришел, но URL в нем нет
      throw new Error('Stream URL not found in API response.');
    }
  } catch (error) {
    console.error('[Main Process Error] Get Stream URL:', error.message);
    // Обрабатываем как сетевые ошибки, так и нашу собственную
    return { success: false, error: error.message };
  }
});

// [НОВОЕ] Window and App Info handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

// --- КОНЕЦ СЕКЦИИ IPC ОБРАБОТЧИКОВ ---


// Menu setup (без изменений)
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open Music Folder',
        accelerator: 'CmdOrCtrl+O',
        click: async () => {
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Music Folder'
          });
          if (!result.canceled) {
            mainWindow.webContents.send('music-folder-selected', result.filePaths[0]);
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);