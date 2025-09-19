import axios, { AxiosResponse } from 'axios';

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://dab.yeet.su/api',
  TIMEOUT: 30000,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
};

// Interfaces
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  liked: boolean;
  genre?: string;
  releaseDate?: string;
}

export interface APITrack {
  id: number | string;
  title: string;
  artist: string;
  artistId?: number;
  albumTitle: string;
  albumCover?: string;
  albumId?: string;
  releaseDate?: string;
  genre?: string;
  duration: number;
  audioQuality?: {
    maximumBitDepth: number;
    maximumSamplingRate: number;
    isHiRes: boolean;
  };
  version?: string | null;
  label?: string;
  labelId?: number;
  upc?: string;
  mediaCount?: number;
  parentalWarning?: boolean;
  streamable?: boolean;
  purchasable?: boolean;
  previewable?: boolean;
  genreId?: number;
  genreSlug?: string;
  genreColor?: string;
  releaseDateStream?: string;
  releaseDateDownload?: string;
  maximumChannelCount?: number;
  images?: {
    small?: string;
    thumbnail?: string;
    large?: string;
    back?: string | null;
  };
  isrc?: string;
}

export interface SearchResponse {
  tracks: APITrack[];
  total: number;
  offset: number;
  limit: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Utility function to convert APITrack to Track
export function convertAPITrackToTrack(apiTrack: APITrack): Track {
  const coverUrl =
    apiTrack.images?.large ||
    apiTrack.images?.thumbnail ||
    apiTrack.images?.small ||
    apiTrack.albumCover ||
    '';

  return {
    id: apiTrack.id.toString(),
    title: apiTrack.title || 'Unknown Title',
    artist: apiTrack.artist || 'Unknown Artist',
    album: apiTrack.albumTitle || 'Unknown Album',
    duration: apiTrack.duration || 0,
    coverUrl,
    audioUrl: '',
    liked: false,
    genre: apiTrack.genre,
    releaseDate: apiTrack.releaseDate,
  };
}

// Axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    params: config.params,
  });
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const apiError: APIError = {
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.message || error.message || 'An error occurred',
      details: error.response?.data?.details,
    };
    console.error('API Error:', apiError);
    return Promise.reject(apiError);
  }
);

export async function searchTracks(
  query: string,
  offset: number = API_CONFIG.DEFAULT_OFFSET,
  limit: number = API_CONFIG.DEFAULT_LIMIT
): Promise<SearchResponse> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('searchTracks: Using Electron IPC');
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
        message: result.error || 'Failed to search tracks via Electron',
      });
    } catch (error) {
      throw new APIError({
        code: 'ELECTRON_IPC_FAILED',
        message: `Electron IPC failed: ${error.message}`,
        details: { error },
      });
    }
  }

  console.log('searchTracks: Using HTTP API');
  const params = new URLSearchParams({
    q: query,
    offset: offset.toString(),
    limit: limit.toString(),
    type: 'track',
  });

  const response = await apiClient.get<SearchResponse>(`/search?${params}`);
  return {
    ...response.data,
    offset,
    limit,
  };
}

export async function getStreamUrl(trackId: string): Promise<string> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('getStreamUrl: Using Electron IPC');
    try {
      const result = await window.electronAPI.getStreamUrl(trackId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new APIError({
        code: 'ELECTRON_API_ERROR',
        message: result.error || 'Failed to get stream URL via Electron',
      });
    } catch (error) {
      throw new APIError({
        code: 'ELECTRON_IPC_FAILED',
        message: `Electron IPC failed: ${error.message}`,
        details: { error },
      });
    }
  }

  console.log('getStreamUrl: Using HTTP API');
  const params = new URLSearchParams({ trackId });
  const response = await apiClient.get<{ url: string }>(`/stream?${params}`);
  if (!response.data?.url) {
    throw new APIError({
      code: 'STREAM_URL_NOT_FOUND',
      message: 'Stream URL not found in response',
    });
  }
  return response.data.url;
  }
