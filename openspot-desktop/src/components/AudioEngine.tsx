import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';

// Constants for better readability and management
const CROSSFADE_STEPS_PER_SECOND = 20;
const CROSSFADE_INTERVAL_MS = 1000 / CROSSFADE_STEPS_PER_SECOND;
const SEEK_THRESHOLD = 1.5; // Threshold for seeking
const PRELOAD_DELAY_MS = 500; // Delay before preloading to save resources
const SEEK_DEBOUNCE_MS = 250; // Debounce for seeking to prevent thrashing

interface AudioState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

const easeOutQuad = (t: number): number => t * (2 - t);

const AudioEngine: React.FC = () => {
  const { state, dispatch } = useMusic();
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    settings,
    queue,
    shuffledQueue,
    isShuffled,
    currentIndex,
    repeatMode,
  } = state;

  // Refs for audio elements
  const player1Ref = useRef<HTMLAudioElement>(null);
  const player2Ref = useRef<HTMLAudioElement>(null);

  // Refs for state management
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFadingRef = useRef<boolean>(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimeRef = useRef<number>(0);

  // Component states
  const [activePlayerKey, setActivePlayerKey] = useState<'p1' | 'p2'>('p1');
  const [nextTrackUrl, setNextTrackUrl] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isLoading: false,
    hasError: false,
  });

  // Memoized values
  const players = useMemo(
    () => ({
      p1: player1Ref.current,
      p2: player2Ref.current,
    }),
    [] // Refs don't change, so empty dependency
  );

  const activeAudio = players[activePlayerKey];
  const standbyAudio = players[activePlayerKey === 'p1' ? 'p2' : 'p1'];

  const currentQueue = useMemo(
    () => (isShuffled ? shuffledQueue : queue),
    [isShuffled, shuffledQueue, queue]
  );

  // === FUNCTION: Calculate next track index ===
  const getNextTrackIndex = useCallback((): number | null => {
    if (currentQueue.length < 2) return null;

    let nextIndex = currentIndex + 1;

    if (nextIndex >= currentQueue.length) {
      if (repeatMode === 'playlist') {
        nextIndex = 0;
      } else if (repeatMode === 'track') {
        return currentIndex;
      } else {
        return null;
      }
    }

    return nextIndex;
  }, [currentIndex, currentQueue.length, repeatMode]);

  // === FUNCTION: Safely preload next track ===
  const preloadNextTrack = useCallback(async () => {
    // Clear previous timeout if exists
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
      preloadTimeoutRef.current = null;
    }

    const nextIndex = getNextTrackIndex();

    if (nextIndex === null || !currentQueue[nextIndex]) {
      setNextTrackUrl(null);
      return;
    }

    // Add a small delay for optimization
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        const url = await apiService.getStreamUrl(currentQueue[nextIndex].id);
        setNextTrackUrl(url);

        // Preload audio in standby player if crossfade is enabled
        if (standbyAudio && settings.crossfade > 0) {
          standbyAudio.src = url;
          standbyAudio.load();
        }
      } catch (error) {
        console.error('AudioEngine: Failed to preload next track', error);
        setNextTrackUrl(null);
      }
    }, PRELOAD_DELAY_MS);
  }, [currentQueue, getNextTrackIndex, standbyAudio, settings.crossfade]);

  // === FUNCTION: Stop crossfade ===
  const stopCrossfade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    isFadingRef.current = false;

    // Reset volumes after crossfade
    if (activeAudio) activeAudio.volume = volume;
    if (standbyAudio) standbyAudio.volume = 0;
  }, [activeAudio, standbyAudio, volume]);

  // === FUNCTION: Start crossfade ===
  const startCrossfade = useCallback(() => {
    if (!nextTrackUrl || !activeAudio || !standbyAudio || isFadingRef.current) return;

    const crossfadeDuration = settings.crossfade;
    if (crossfadeDuration <= 0) return;

    isFadingRef.current = true;
    console.log('AudioEngine: Starting Smooth Crossfade...');

    standbyAudio.src = nextTrackUrl;
    standbyAudio.volume = 0;
    standbyAudio.play().catch(console.error);

    const startTime = Date.now();

    fadeIntervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsedTime / crossfadeDuration, 1);

      // Use easing function for smoothness
      const easedProgress = easeOutQuad(progress);

      if (activeAudio) activeAudio.volume = volume * (1 - easedProgress);
      if (standbyAudio) standbyAudio.volume = volume * easedProgress;

      if (progress >= 1) {
        stopCrossfade();
        // Switch players
        setActivePlayerKey(activePlayerKey === 'p1' ? 'p2' : 'p1');
        dispatch({ type: 'NEXT_TRACK' });
        // Pause and reset the old active player
        activeAudio.pause();
        activeAudio.currentTime = 0;
      }
    }, CROSSFADE_INTERVAL_MS);
  }, [nextTrackUrl, activeAudio, standbyAudio, settings.crossfade, volume, stopCrossfade, dispatch, activePlayerKey]);

  // === EFFECT: Preload next track ===
  useEffect(() => {
    preloadNextTrack();

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [preloadNextTrack]);

  // === EFFECT: Load current track ===
  useEffect(() => {
    if (!currentTrack) return;

    const loadTrack = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      setAudioState({ isLoading: true, hasError: false });

      try {
        const url = await apiService.getStreamUrl(currentTrack.id);

        // Determine which player to use
        const playerToUse = isFadingRef.current ? activeAudio : standbyAudio;
        const newPlayerKey = isFadingRef.current ? activePlayerKey : activePlayerKey === 'p1' ? 'p2' : 'p1';

        if (playerToUse) {
          playerToUse.src = url;
          playerToUse.load();

          // If not in crossfade, switch immediately
          if (!isFadingRef.current) {
            setActivePlayerKey(newPlayerKey);
          }
        }

        setAudioState({ isLoading: false, hasError: false });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('AudioEngine: Failed to load track', error);
        setAudioState({
          isLoading: false,
          hasError: true,
          errorMessage: 'Failed to load track',
        });
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load track' });
        dispatch({ type: 'SET_LOADING', payload: false });

        // Try next track after 2 seconds
        setTimeout(() => {
          dispatch({ type: 'NEXT_TRACK' });
        }, 2000);
      }
    };

    loadTrack();
  }, [currentTrack?.id, dispatch, activeAudio, standbyAudio, activePlayerKey]);

  // === EFFECT: Manage playback ===
  useEffect(() => {
    if (!activeAudio || audioState.isLoading) return;

    if (isFadingRef.current) return;

    activeAudio.volume = volume;

    // Manage play/pause
    if (isPlaying && activeAudio.paused) {
      activeAudio.play().catch((error) => {
        console.error('AudioEngine: Playback failed', error);
        dispatch({ type: 'SET_IS_PLAYING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: 'Playback failed' });
      });
    } else if (!isPlaying && !activeAudio.paused) {
      activeAudio.pause();
    }

    // Manage seeking with debounce
    const now = Date.now();
    if (
      Math.abs(activeAudio.currentTime - currentTime) > SEEK_THRESHOLD &&
      now - lastSeekTimeRef.current > SEEK_DEBOUNCE_MS
    ) {
      activeAudio.currentTime = currentTime;
      lastSeekTimeRef.current = now;
    }
  }, [isPlaying, volume, currentTime, activeAudio, audioState.isLoading, dispatch]);

  // === EFFECT: Active player events ===
  useEffect(() => {
    if (!activeAudio) return;

    const handleTimeUpdate = () => {
      const time = activeAudio.currentTime;
      const duration = activeAudio.duration;

      dispatch({ type: 'SET_CURRENT_TIME', payload: time });

      // Check for crossfade conditions
      if (
        settings.crossfade > 0 &&
        duration &&
        !isFadingRef.current &&
        nextTrackUrl &&
        time > duration - settings.crossfade - 0.5 // Small buffer
      ) {
        startCrossfade();
      }
    };

    const handleEnded = () => {
      if (!isFadingRef.current) {
        if (repeatMode === 'track') {
          activeAudio.currentTime = 0;
          activeAudio.play().catch(console.error);
        } else {
          dispatch({ type: 'NEXT_TRACK' });
        }
      }
    };

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: activeAudio.duration });
    };

    const handleError = (e: Event) => {
      console.error('AudioEngine: Playback error', e);
      setAudioState({
        isLoading: false,
        hasError: true,
        errorMessage: 'Playback error occurred',
      });
      dispatch({ type: 'SET_ERROR', payload: 'Playback error occurred' });

      // Automatically skip to next track on error
      setTimeout(() => {
        dispatch({ type: 'NEXT_TRACK' });
      }, 1000);
    };

    const handleCanPlay = () => {
      setAudioState((prev) => ({ ...prev, isLoading: false }));
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleWaiting = () => {
      setAudioState((prev) => ({ ...prev, isLoading: true }));
      dispatch({ type: 'SET_LOADING', payload: true });
    };

    // Attach event listeners
    activeAudio.addEventListener('timeupdate', handleTimeUpdate);
    activeAudio.addEventListener('ended', handleEnded);
    activeAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    activeAudio.addEventListener('error', handleError);
    activeAudio.addEventListener('canplay', handleCanPlay);
    activeAudio.addEventListener('waiting', handleWaiting);

    // Cleanup
    return () => {
      activeAudio.removeEventListener('timeupdate', handleTimeUpdate);
      activeAudio.removeEventListener('ended', handleEnded);
      activeAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      activeAudio.removeEventListener('error', handleError);
      activeAudio.removeEventListener('canplay', handleCanPlay);
      activeAudio.removeEventListener('waiting', handleWaiting);
    };
  }, [activeAudio, dispatch, settings.crossfade, nextTrackUrl, startCrossfade, repeatMode]);

  // === EFFECT: Cleanup on unmount ===
  useEffect(() => {
    return () => {
      stopCrossfade();
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      // Pause both players
      if (player1Ref.current) player1Ref.current.pause();
      if (player2Ref.current) player2Ref.current.pause();
    };
  }, [stopCrossfade]);

  // Sync local audioState to global if needed
  useEffect(() => {
    if (audioState.hasError) {
      dispatch({ type: 'SET_ERROR', payload: audioState.errorMessage || 'Audio error' });
    }
    if (audioState.isLoading !== state.isLoading) {
      dispatch({ type: 'SET_LOADING', payload: audioState.isLoading });
    }
  }, [audioState, dispatch, state.isLoading]);

  return (
    <>
      <audio ref={player1Ref} preload="auto" />
      <audio ref={player2Ref} preload="auto" />
    </>
  );
};

export default AudioEngine;
