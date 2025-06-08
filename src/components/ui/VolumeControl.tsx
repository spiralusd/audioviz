import React, { useState, useEffect } from 'react';
import { AudioService } from '../../services/AudioService';
import './VolumeControl.css';

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [previousVolume, setPreviousVolume] = useState<number>(1.0);
  
  // Initialize volume from AudioService
  useEffect(() => {
    const audioService = AudioService.getInstance();
    setVolume(audioService.getVolume());
  }, []);
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    const audioService = AudioService.getInstance();
    audioService.setVolume(newVolume);
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Handle input event for real-time updates during slider movement
  const handleVolumeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const newVolume = parseFloat((e.target as HTMLInputElement).value);
    setVolume(newVolume);
    
    const audioService = AudioService.getInstance();
    audioService.setVolume(newVolume);
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    const audioService = AudioService.getInstance();
    
    if (isMuted) {
      // Unmute - restore previous volume
      setIsMuted(false);
      setVolume(previousVolume);
      audioService.setVolume(previousVolume);
    } else {
      // Mute - save current volume and set to 0
      setPreviousVolume(volume);
      setIsMuted(true);
      setVolume(0);
      audioService.setVolume(0);
    }
  };
  
  // Determine which volume icon to display based on current volume
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return '🔇';
    } else if (volume < 0.5) {
      return '🔉';
    } else {
      return '🔊';
    }
  };
  
  return (
    <div className="volume-control">
      <button 
        className="volume-button"
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {getVolumeIcon()}
      </button>
      
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleVolumeChange}
        onInput={handleVolumeInput}
        className="volume-slider"
        title={`Volume: ${Math.round(volume * 100)}%`}
      />
      
      <span className="volume-percentage">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
};

export default VolumeControl;
