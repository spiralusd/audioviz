import { useEffect } from 'react';
import { AudioService } from '../services/AudioService';

interface KeyboardShortcutOptions {
  seekIncrement?: number; // Amount to seek in seconds
}

/**
 * Hook to handle keyboard shortcuts for audio playback control
 */
const useKeyboardShortcuts = (options: KeyboardShortcutOptions = {}) => {
  const { seekIncrement = 5 } = options;
  
  useEffect(() => {
    const audioService = AudioService.getInstance();
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard shortcuts when target is an input element
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return;
      }
      
      switch (event.code) {
        case 'Space':
          // Toggle play/pause
          event.preventDefault();
          if (audioService.isCurrentlyPlaying()) {
            audioService.pause();
          } else {
            audioService.play();
          }
          break;
          
        case 'ArrowLeft':
          // Seek backward
          event.preventDefault();
          const currentTime = audioService.getCurrentTime() || 0;
          audioService.seekTo(Math.max(0, currentTime - seekIncrement));
          break;
          
        case 'ArrowRight':
          // Seek forward
          event.preventDefault();
          const time = audioService.getCurrentTime() || 0;
          const duration = audioService.getDuration() || Number.MAX_VALUE;
          audioService.seekTo(Math.min(duration, time + seekIncrement));
          break;
          
        case 'KeyM':
          // Toggle mute
          event.preventDefault();
          const volume = audioService.getVolume();
          if (volume > 0) {
            // Store current volume and mute
            (window as any).previousVolume = volume;
            audioService.setVolume(0);
          } else {
            // Restore previous volume
            const prevVol = (window as any).previousVolume || 1.0;
            audioService.setVolume(prevVol);
          }
          break;
          
        case 'KeyF':
          // Toggle fullscreen
          event.preventDefault();
          const container = document.querySelector('.visualization-canvas-container');
          
          if (!document.fullscreenElement) {
            container?.requestFullscreen().catch(err => {
              console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
          } else {
            document.exitFullscreen().catch(err => {
              console.error(`Error attempting to exit fullscreen: ${err.message}`);
            });
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [seekIncrement]);
};

export default useKeyboardShortcuts;
