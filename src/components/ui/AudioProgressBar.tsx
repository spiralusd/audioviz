import React, { useState, useEffect } from 'react';
import { AudioService } from '../../services/AudioService';
import './AudioProgressBar.css';

const AudioProgressBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  
  // Update time regularly while playing
  useEffect(() => {
    const audioService = AudioService.getInstance();
    
    const updateTime = () => {
      if (isDragging) return; // Don't update position while dragging
      
      const time = audioService.getCurrentTime();
      const totalDuration = audioService.getDuration();
      
      setCurrentTime(time);
      setDuration(totalDuration);
    };
    
    const intervalId = setInterval(updateTime, 250); // Update 4 times per second
    updateTime(); // Initial update
    
    return () => clearInterval(intervalId);
  }, [isDragging]);
  
  // Format time in MM:SS format
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle mouse events for scrubbing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    
    // Calculate position and update immediately on click
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setDragPosition(Math.max(0, Math.min(1, position)));
    
    // Immediately seek on click
    if (duration === null) return;
    const audioService = AudioService.getInstance();
    audioService.seekTo(position * duration);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    
    // Update position during drag
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    setDragPosition(clampedPosition);
    
    // Update audio position in real-time during drag
    if (duration !== null) {
      const audioService = AudioService.getInstance();
      audioService.seekTo(clampedPosition * duration);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    
    // Final seek position on mouse up
    if (duration !== null) {
      const audioService = AudioService.getInstance();
      audioService.seekTo(dragPosition * duration);
    }
    
    setIsDragging(false);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle direct click without drag
    e.preventDefault();
    
    // Calculate position and update immediately on click
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    setDragPosition(clampedPosition);
    
    // Immediate seek
    if (duration !== null) {
      const audioService = AudioService.getInstance();
      audioService.seekTo(clampedPosition * duration);
    }
  };
  
  // Calculate position from mouse event
  const updateDragPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setDragPosition(Math.max(0, Math.min(1, position))); // Clamp between 0-1
  };
  
  // Calculate progress percentage
  const progress = isDragging 
    ? dragPosition
    : (currentTime !== null && duration !== null && duration > 0) 
      ? currentTime / duration
      : 0;
  
  return (
    <div className="audio-progress-container">
      <span className="audio-time-display">{formatTime(currentTime)}</span>
      
      <div 
        className="audio-progress-bar"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="audio-progress-fill" 
          style={{ width: `${progress * 100}%` }}
        />
        <div 
          className="audio-progress-handle"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      
      <span className="audio-time-display">{formatTime(duration)}</span>
    </div>
  );
};

export default AudioProgressBar;
