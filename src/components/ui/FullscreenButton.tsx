import React, { useState, useEffect } from 'react';
import './FullscreenButton.css';

interface FullscreenButtonProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ containerRef }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Update fullscreen state when it changes outside this component
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };
  
  return (
    <button 
      className={`fullscreen-button ${isFullscreen ? 'active' : ''}`}
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {isFullscreen ? '⤧' : '⤢'}
    </button>
  );
};

export default FullscreenButton;
