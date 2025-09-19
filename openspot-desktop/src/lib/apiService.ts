import axios, { CancelTokenSource } from 'axios';
import { SearchResponse, APIError } from './music-api';

// Configuration
const API_CONFIG = {
  BASE_URL: '/api', // Relative path for proxy
  TIMEOUT: 30000,
};

// Utility function to check Electron environment
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
};

// Axios instance for browser
const browserApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request cancellation management
const cancelTokens: Map<string, CancelTokenSource> = new Map();

const createCancelToken = (key: string): CancelTokenSource => {
  // Cancel previous request if exists
  cancelTokens.get(key)?.cancel('Request superseded');
  const source = axios.CancelToken.source();
  cancelTokens.set(key, source);
  return source;
};

// Structured logging
const log = (message: string, metadata: Record<string, any> = {}) => {
  console.log(`API Service: ${message}`, metadata);
};

const handleError = (error: any): APIError => {
  if (axios.isCancel(error)) {
    return {
      code: 'REQUEST_CANCELLED',
      message: 'Request was cancelled',
      details: { error },
    };
  }
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An error occurred',
    details: error.details || { error },
  };
};

// API Service
export const apiService = {
  searchTracks: async (
    query: string,
    offset: number = 0,
    limit: number = 20
  ): Promise<SearchResponse> => {
    const requestKey = `search_${query}_${offset}_${limit}`;
    const cancelToken = createCancelToken(requestKey);

    if (isElectron()) {
      log('Running in Electron, using IPC for search', { query, offset, limit });
      try {
        const result = await window.electronAPI.searchTracks(query, offset, limit);
        if (result.success && result.data) {
          return {
            ...result.data,
            offset,
            limit,
          };
        }
        throw new APIError({
          code: 'ELECTRON_API_ERROR',
          message: result.error || 'Electron API search failed',
        });
      } catch (error) {
        throw handleError(error);
      } finally {
        cancelTokens.delete(requestKey);
      }
    }

    log('Running in Browser, using HTTP proxy for search', { query, offset, limit });
    try {
      const params = new URLSearchParams({
        q: query,
        offset: offset.toString(),
        limit: limit.toString(),
        type: 'track',
      });
      const response = await browserApiClient.get<SearchResponse>(`/search?${params}`, {
        cancelToken: cancelToken.token,
      });
      return {
        ...response.data,
        offset,
        limit,
      };
    } catch (error) {
      throw handleError(error);
    } finally {
      cancelTokens.delete(requestKey);
    }
  },

  getStreamUrl: async (trackId: string): Promise<string> => {
    const requestKey = `stream_${trackId}`;
    const cancelToken = createCancelToken(requestKey);

    if (isElectron()) {
      log('Running in Electron, using IPC for stream URL', { trackId });
      try {
        const result = await window.electronAPI.getStreamUrl(trackId);
        if (result.success && result.data) {
          return result.data;
        }
        throw new APIError({
          code: 'ELECTRON_API_ERROR',
          message: result.error || 'Electron API stream URL failed',
        });
      } catch (error) {
        throw handleError(error);
      } finally {
        cancelTokens.delete(requestKey);
      }
    }

    log('Running in Browser, using HTTP proxy for stream URL', { trackId });
    try {
      const params = new URLSearchParams({ trackId });
      const response = await browserApiClient.get<{ url: string }>(`/stream?${params}`, {
        cancelToken: cancelToken.token,
      });
      if (!response.data?.url) {
        throw new APIError({
          code: 'STREAM_URL_NOT_FOUND',
          message: 'Stream URL not found in response',
        });
      }
      return response.data.url;
    } catch (error) {
      throw handleError(error);
    } finally {
      cancelTokens.delete(requestKey);
    }
  },

  getLyrics: async (artist: string, title: string): Promise<{ lyrics: string }> => {
    const requestKey = `lyrics_${artist}_${title}`;
    const cancelToken = createCancelToken(requestKey);

    if (isElectron()) {
      log('Running in Electron, using IPC for lyrics', { artist, title });
      try {
        const result = await window.electronAPI.getLyrics(artist, title);
        if (result.success && result.data) {
          return result.data;
        }
        throw new APIError({
          code: 'ELECTRON_API_ERROR',
          message: result.error || 'Electron API lyrics failed',
        });
      } catch (error) {
        throw handleError(error);
      } finally {
        cancelTokens.delete(requestKey);
      }
    }

    log('Running in Browser, using HTTP proxy for lyrics', { artist, title });
    try {
      const params = new URLSearchParams({ artist, title });
      const response = await browserApiClient.get<{ lyrics: string }>(`/lyrics?${params}`, {
        cancelToken: cancelToken.token,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    } finally {
      cancelTokens.delete(requestKey);
    }
  },
};

// Cleanup on module unload (optional, if supported)
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    cancelTokens.forEach((source) => source.cancel('Window unloading'));
    cancelTokens.clear();
  });
}
