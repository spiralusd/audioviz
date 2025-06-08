import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AudioService, AudioSource, AudioSourceType } from '../services/AudioService';
import * as Tone from 'tone';

export interface AudioData {
  analyzer: Tone.Analyser | null;
  frequencyData: Uint8Array | null;
  timeData: Uint8Array | null;
}

interface AudioContextProps {
  audioService: AudioService;
  currentSource: AudioSource | null;
  isPlaying: boolean;
  audioData: AudioData | null;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  loadStream: (url: string) => Promise<void>;
  initMicrophone: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  getFrequencyData: () => Float32Array | null;
  getWaveformData: () => Float32Array | null;
  detectBeat: (threshold?: number) => boolean;
  clearError: () => void;
}

const AudioContext = createContext<AudioContextProps | undefined>(undefined);

export const useAudio = (): AudioContextProps => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [audioService] = useState<AudioService>(AudioService.getInstance());
  const [currentSource, setCurrentSource] = useState<AudioSource | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize audio data
  useEffect(() => {
    if (currentSource && currentSource.analyser) {
      console.log('Setting up audio data with analyzer', currentSource.analyser);
      const analyzer = currentSource.analyser;
      const frequencyData = new Uint8Array(analyzer.size);
      const timeData = new Uint8Array(analyzer.size);
      
      // Set analyzer to initial FFT state
      analyzer.set({ type: 'fft', size: analyzer.size });
      
      console.log('Creating audio data with buffer sizes:', analyzer.size);
      
      setAudioData({
        analyzer,
        frequencyData,
        timeData
      });
    } else {
      console.log('No current source or analyzer available');
      setAudioData(null);
    }
  }, [currentSource]);

  useEffect(() => {
    // Cleanup function when component unmounts
    return () => {
      audioService.stop();
    };
  }, [audioService]);

  const loadFile = async (file: File): Promise<void> => {
    const source = await audioService.loadAudioFile(file);
    setCurrentSource(source);
    setIsPlaying(false);
  };

  const loadStream = async (url: string): Promise<void> => {
    const source = await audioService.loadStreamUrl(url);
    setCurrentSource(source);
    setIsPlaying(false);
  };

  const initMicrophone = async (): Promise<void> => {
    try {
      setError(null);
      const source = await audioService.initMicrophone();
      setCurrentSource(source);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to initialize microphone:', err);
      setError('Could not access microphone. Please ensure you have granted microphone permissions.');
    }
  };
  
  const clearError = (): void => {
    setError(null);
  };

  const play = async (): Promise<void> => {
    await audioService.play();
    setIsPlaying(true);
  };

  const pause = async (): Promise<void> => {
    await audioService.pause();
    setIsPlaying(false);
  };

  const stop = async (): Promise<void> => {
    await audioService.stop();
    setIsPlaying(false);
  };

  const getFrequencyData = (): Float32Array | null => {
    return audioService.getFrequencyData();
  };

  const getWaveformData = (): Float32Array | null => {
    return audioService.getWaveformData();
  };

  const detectBeat = (threshold?: number): boolean => {
    return audioService.detectBeat(threshold);
  };

  const value = {
    audioService,
    currentSource,
    isPlaying,
    audioData,
    error,
    loadFile,
    loadStream,
    initMicrophone,
    play,
    pause,
    stop,
    getFrequencyData,
    getWaveformData,
    detectBeat,
    clearError
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
