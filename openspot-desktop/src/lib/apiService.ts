// src/lib/apiService.ts

import axios from 'axios';
import type { SearchResponse } from './music-api';

// Вспомогательная функция для определения среды выполнения
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
};

// Создаем инстанс axios для использования в браузере.
// URL относительный, чтобы create-react-app мог его перехватить и проксировать.
const browserApiClient = axios.create({
  baseURL: '/api', // <-- Важно! Относительный путь для прокси
  timeout: 30000,
});

// Наш новый гибридный сервис
export const apiService = {
  /**
   * Ищет треки. Работает и в Electron, и в браузере.
   */
  searchTracks: async (query: string): Promise<SearchResponse> => {
    if (isElectron()) {
      console.log('API Service: Running in Electron, using IPC.');
      const result = await window.electronAPI.searchTracks(query);
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Electron API search failed');
      }
    } else {
      console.log('API Service: Running in Browser, using HTTP proxy.');
      const params = new URLSearchParams({ q: query, offset: '0', limit: '20', type: 'track' });
      const response = await browserApiClient.get(`/?${params}`);
      return response.data;
    }
  },

  /**
   * Получает URL для стриминга. Работает и в Electron, и в браузере.
   */
  getStreamUrl: async (trackId: string): Promise<string> => {
    if (isElectron()) {
      console.log('API Service: Running in Electron, using IPC.');
      const result = await window.electronAPI.getStreamUrl(trackId);
      // Теперь TypeScript знает, что result - это { success, data?, error? }
      if (result.success && result.data) {
        return result.data; // result.data - это string
      } else {
        throw new Error(result.error || 'Electron API stream URL failed');
      }
    } else {
      console.log('API Service: Running in Browser, using HTTP proxy.');
      // Эта часть уже возвращает строку, так что здесь все было в порядке
      return `https://dab.yeet.su/api/stream?trackId=${trackId}`;
    }
  },
};