// src/components/AudioEngine.tsx

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { apiService } from '../lib/apiService';

// Константы для улучшения читаемости и управления
const CROSSFADE_STEPS_PER_SECOND = 20;
const CROSSFADE_INTERVAL_MS = 1000 / CROSSFADE_STEPS_PER_SECOND;
const SEEK_THRESHOLD = 1.5; // Порог для определения необходимости перемотки
const PRELOAD_DELAY_MS = 500; // Задержка перед предзагрузкой для экономии ресурсов

interface AudioState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

const easeOutQuad = (t: number) => t * (2 - t);

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
    repeatMode
  } = state;

  // Рефы для аудио элементов
  const player1Ref = useRef<HTMLAudioElement>(null);
  const player2Ref = useRef<HTMLAudioElement>(null);

  // Рефы для управления состоянием
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFadingRef = useRef<boolean>(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimeRef = useRef<number>(0);

  // Состояния компонента
  const [activePlayerKey, setActivePlayerKey] = useState<'p1' | 'p2'>('p1');
  const [nextTrackUrl, setNextTrackUrl] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isLoading: false,
    hasError: false
  });

  // Мемоизированные значения
  const players = useMemo(() => ({
    p1: player1Ref.current,
    p2: player2Ref.current
  }), [player1Ref.current, player2Ref.current]);

  const activeAudio = players[activePlayerKey];
  const standbyAudio = players[activePlayerKey === 'p1' ? 'p2' : 'p1'];

  const currentQueue = useMemo(() =>
    isShuffled ? shuffledQueue : queue,
    [isShuffled, shuffledQueue, queue]
  );

  // === ФУНКЦИЯ: Вычисление индекса следующего трека ===
  const getNextTrackIndex = useCallback(() => {
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

  // === ФУНКЦИЯ: Безопасная предзагрузка следующего трека ===
  const preloadNextTrack = useCallback(async () => {
    // Очищаем предыдущий таймаут если есть
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
      preloadTimeoutRef.current = null;
    }

    const nextIndex = getNextTrackIndex();

    if (nextIndex === null || !currentQueue[nextIndex]) {
      setNextTrackUrl(null);
      return;
    }

    // Добавляем небольшую задержку для оптимизации
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        const url = await apiService.getStreamUrl(currentQueue[nextIndex].id);
        setNextTrackUrl(url);

        // Предзагружаем аудио в standby плеер если возможно
        if (standbyAudio && settings.crossfade > 0) {
          standbyAudio.src = url;
          standbyAudio.load();
        }
      } catch (error) {
        console.error("AudioEngine: Failed to preload next track", error);
        setNextTrackUrl(null);
      }
    }, PRELOAD_DELAY_MS);
  }, [currentQueue, getNextTrackIndex, standbyAudio, settings.crossfade]);

  // === ФУНКЦИЯ: Остановка кроссфейда ===
  const stopCrossfade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    isFadingRef.current = false;
  }, []);

  // === ФУНКЦИЯ: Запуск кроссфейда ===
  const startCrossfade = useCallback(() => {
        if (!nextTrackUrl || !activeAudio || !standbyAudio || isFadingRef.current) return;

    const crossfadeDuration = settings.crossfade;
        if (crossfadeDuration <= 0) return;

        isFadingRef.current = true;
        console.log("AudioEngine: Starting Smooth Crossfade...");

        standbyAudio.src = nextTrackUrl;
        standbyAudio.volume = 0;
        standbyAudio.play().catch(console.error);

        const startTime = Date.now();

        fadeIntervalRef.current = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsedTime / crossfadeDuration, 1);

            // [ИЗМЕНЕНО] Используем easing-функцию для плавности
            const easedProgress = easeOutQuad(progress);

            if (activeAudio) activeAudio.volume = volume * (1 - easedProgress);
            if (standbyAudio) standbyAudio.volume = volume * easedProgress;

            if (progress >= 1) {
                stopCrossfade();
                dispatch({ type: 'NEXT_TRACK' });
            }
        }, CROSSFADE_INTERVAL_MS);
    }, [nextTrackUrl, activeAudio, standbyAudio, settings.crossfade, volume, stopCrossfade, dispatch]);

  // === ЭФФЕКТ: Предзагрузка следующего трека ===
  useEffect(() => {
    preloadNextTrack();

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [preloadNextTrack]);

  // === ЭФФЕКТ: Загрузка текущего трека ===
  useEffect(() => {
    if (!currentTrack) return;

    let isMounted = true;

    const loadTrack = async () => {
      setAudioState({ isLoading: true, hasError: false });

      try {
        const url = await apiService.getStreamUrl(currentTrack.id);

        if (!isMounted) return;

        // Определяем какой плеер использовать
        const playerToUse = isFadingRef.current ? activeAudio : standbyAudio;
        const newPlayerKey = isFadingRef.current ? activePlayerKey : (activePlayerKey === 'p1' ? 'p2' : 'p1');

        if (playerToUse) {
          playerToUse.src = url;
          playerToUse.load();

          // Если не в процессе кроссфейда, переключаемся сразу
          if (!isFadingRef.current) {
            setActivePlayerKey(newPlayerKey);
          }
        }

        setAudioState({ isLoading: false, hasError: false });
      } catch (error) {
        console.error("AudioEngine: Failed to load track", error);

        if (isMounted) {
          setAudioState({
            isLoading: false,
            hasError: true,
            errorMessage: 'Failed to load track'
          });

          // Пробуем следующий трек через 2 секунды
          setTimeout(() => {
            dispatch({ type: 'NEXT_TRACK' });
          }, 2000);
        }
      }
    };

    loadTrack();

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]); // Зависим только от ID трека

  // === ЭФФЕКТ: Управление воспроизведением ===
  useEffect(() => {
    if (!activeAudio || audioState.isLoading) return;

    if (isFadingRef.current) return;

    activeAudio.volume = volume;

    // Управление воспроизведением
    if (isPlaying && activeAudio.paused) {
      activeAudio.play().catch((error) => {
        console.error("AudioEngine: Playback failed", error);
        dispatch({ type: 'SET_IS_PLAYING', payload: false });
      });
    } else if (!isPlaying && !activeAudio.paused) {
      activeAudio.pause();
    }

    // Управление перемоткой (с защитой от частых обновлений)
    const now = Date.now();
        if (Math.abs(activeAudio.currentTime - currentTime) > SEEK_THRESHOLD && now - lastSeekTimeRef.current > 250) {
            activeAudio.currentTime = currentTime;
            lastSeekTimeRef.current = now;
        }
    }, [isPlaying, volume, currentTime, activeAudio, audioState.isLoading]);

  // === ЭФФЕКТ: События активного плеера ===
  useEffect(() => {
    if (!activeAudio) return;

    const handleTimeUpdate = () => {
      const time = activeAudio.currentTime;
      const duration = activeAudio.duration;

      dispatch({ type: 'SET_CURRENT_TIME', payload: time });

      // Проверка условий для кроссфейда
      if (settings.crossfade > 0 &&
          duration &&
          !isFadingRef.current &&
          nextTrackUrl &&
          time > duration - settings.crossfade) {
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
      console.error("AudioEngine: Playback error", e);
      setAudioState({
        isLoading: false,
        hasError: true,
        errorMessage: 'Playback error occurred'
      });

      // Автоматически переходим к следующему треку при ошибке
      setTimeout(() => {
        dispatch({ type: 'NEXT_TRACK' });
      }, 1000);
    };

    const handleCanPlay = () => {
      setAudioState(prev => ({ ...prev, isLoading: false }));
    };

    const handleWaiting = () => {
      setAudioState(prev => ({ ...prev, isLoading: true }));
    };

    // Подписываемся на события
    activeAudio.addEventListener('timeupdate', handleTimeUpdate);
    activeAudio.addEventListener('ended', handleEnded);
    activeAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    activeAudio.addEventListener('error', handleError);
    activeAudio.addEventListener('canplay', handleCanPlay);
    activeAudio.addEventListener('waiting', handleWaiting);

    // Очистка
    return () => {
      activeAudio.removeEventListener('timeupdate', handleTimeUpdate);
      activeAudio.removeEventListener('ended', handleEnded);
      activeAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      activeAudio.removeEventListener('error', handleError);
      activeAudio.removeEventListener('canplay', handleCanPlay);
      activeAudio.removeEventListener('waiting', handleWaiting);
    };
  }, [activeAudio, dispatch, settings.crossfade, nextTrackUrl, startCrossfade, repeatMode]);

  // === ЭФФЕКТ: Очистка при размонтировании ===
  useEffect(() => {
    return () => {
      stopCrossfade();
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [stopCrossfade]);

  // Опционально: можно передавать состояние загрузки/ошибки в контекст
  useEffect(() => {
    if (audioState.hasError || audioState.isLoading) {
      // dispatch({ type: 'SET_LOADING_STATE', payload: audioState });
    }
  }, [audioState]);

  return (
    <>
      <audio
        ref={player1Ref}
        preload="auto"
        onContextMenu={(e) => e.preventDefault()}
      />
      <audio
        ref={player2Ref}
        preload="auto"
        onContextMenu={(e) => e.preventDefault()}
      />
    </>
  );
};

export default AudioEngine;