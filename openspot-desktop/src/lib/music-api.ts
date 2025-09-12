import axios, { AxiosResponse } from 'axios';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  liked: boolean; // Make this required instead of optional
  // Add any other fields as needed
}

// API response types that match the actual search API
export interface APITrack {
  id: number;
  title: string;
  artist: string;
  artistId: number;
  albumTitle: string;
  albumCover: string;
  albumId: string;
  releaseDate: string;
  genre: string;
  duration: number;
  audioQuality: {
    maximumBitDepth: number;
    maximumSamplingRate: number;
    isHiRes: boolean;
  };
  version: string | null;
  label: string;
  labelId: number;
  upc: string;
  mediaCount: number;
  parental_warning: boolean;
  streamable: boolean;
  purchasable: boolean;
  previewable: boolean;
  genreId: number;
  genreSlug: string;
  genreColor: string;
  releaseDateStream: string;
  releaseDateDownload: string;
  maximumChannelCount: number;
  images: {
    small: string;
    thumbnail: string;
    large: string;
    back: string | null;
  };
  isrc: string;
}

export interface SearchResponse {
  tracks: APITrack[];
  total: number;
}

const API_BASE_URL_EXAMPLE = 'https://dab.yeet.su/ap';

const apiClient = axios.create({
  baseURL: API_BASE_URL_EXAMPLE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function searchTracks(query: string, offset = 0, limit = 20): Promise<SearchResponse> {
  console.warn('searchTracks is being called from renderer, but should be called via electronAPI.');
  // Возвращаем пустой результат, чтобы избежать падения приложения.
  return { tracks: [], total: 0 };
}

export async function getStreamUrl(trackId: string): Promise<string> {
  console.warn('getStreamUrl is being called from renderer, but should be called via electronAPI.');
  // Возвращаем пустую строку.
  return '';
}

export function convertAPITrackToTrack(apiTrack: APITrack): Track {
  let coverUrl = '';
  if (apiTrack.images) {
    coverUrl = apiTrack.images.large || apiTrack.images.small || apiTrack.images.thumbnail || '';
  } else if (apiTrack.albumCover) {
    coverUrl = apiTrack.albumCover;
  }

  return {
    id: apiTrack.id.toString(),
    title: apiTrack.title,
    artist: apiTrack.artist,
    album: apiTrack.albumTitle || 'Unknown Album',
    duration: apiTrack.duration,
    coverUrl: coverUrl,
    audioUrl: '',
    liked: false
  };
}