// src/components/AudioController.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useMusic } from '../contexts/MusicContext';
import {apiService} from "../lib/apiService";

// 1. Убираем прямой импорт API. Теперь вся сетевая логика в main-процессе.
// import { getStreamUrl } from '../lib/music-api';

const AudioController: React.FC = () => {
  const { state, dispatch } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 2. [ИЗМЕНЕНО] Получаем URL для стриминга через electronAPI
  useEffect(() => {
    const fetchStream = async () => {
      if (state.currentTrack) {
        setError(null);
        setStreamUrl(null);
        try {
          // [ИСПРАВЛЕНИЕ] Просто получаем URL. apiService сам обработает ошибки.
          const url = await apiService.getStreamUrl(state.currentTrack.id);
          setStreamUrl(url || null);
        } catch (err: any) {
          console.error('Failed to load stream:', err);
          setError('Failed to load stream.');
          setStreamUrl(null);
        }
      } else {
        setStreamUrl(null);
      }
    };
    fetchStream();
  }, [state.currentTrack]);
  // 3. Устанавливаем источник для <audio> элемента, когда streamUrl изменился (без изменений)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (streamUrl) {
      console.log('🎵 Setting new stream URL for direct playback');
      audio.src = streamUrl;
      audio.load(); // Говорим элементу загрузить новый источник
    } else {
      audio.src = ''; // Очищаем источник, если URL пуст
    }
  }, [streamUrl]); // Этот эффект зависит только от streamUrl

  // 4. Управляем воспроизведением/паузой (без изменений)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      if (audio.src) {
        audio.play().catch(err => console.error('Play failed:', err));
      }
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  // 5. Громкость и перемотка (без изменений)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = state.volume;
  }, [state.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - state.currentTime) > 1) {
      audio.currentTime = state.currentTime;
    }
  }, [state.currentTime]);

  // 6. Обработчики событий <audio> для обновления состояния (без изменений)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        dispatch({ type: 'SET_DURATION', payload: audio.duration });
      }
    };

    const onEnded = () => {
      if (state.repeatMode === 'track') {
        audio.currentTime = 0;
        audio.play().catch(err => console.error('Replay failed:', err));
      } else {
        dispatch({ type: 'NEXT_TRACK' });
      }
    };

    const onError = (e: Event) => {
      console.error('Audio element error:', e);
      setError('Audio playback error.');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [dispatch, state.repeatMode]);

  // 7. Очистка ресурсов при смене трека (без изменений)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.src = '';
        audioRef.current.load();
        console.log('🎵 AudioController: Track changed, resources cleaned up.');
      }
    };
  }, [state.currentTrack?.id]);

  return <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />;
};

export default AudioController;