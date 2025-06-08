import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { AudioSourceType } from '../../services/AudioService';
import AudioProgressBar from './AudioProgressBar';
import VolumeControl from './VolumeControl';
import './AudioControls.css';

type AudioSourceTab = 'file' | 'microphone' | 'stream';

const AudioControls: React.FC = () => {
  const { 
    currentSource, 
    isPlaying, 
    loadFile, 
    loadStream, 
    initMicrophone, 
    play, 
    pause, 
    stop, 
    error, 
    clearError 
  } = useAudio();
  
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AudioSourceTab>('file');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [activeTab, error, clearError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      loadFile(files[0]);
    }
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamUrl) {
      loadStream(streamUrl);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div className="audio-controls">
      <div className="audio-header">
        <h3 className="audio-title">Audio Source</h3>
        <button 
          className="audio-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      <div className={`audio-content ${isExpanded ? '' : 'collapsed'}`}>
        <div className="audio-source-tabs">
          <button 
            className={`audio-source-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            File
          </button>
          <button 
            className={`audio-source-tab ${activeTab === 'microphone' ? 'active' : ''}`}
            onClick={() => setActiveTab('microphone')}
          >
            Microphone
          </button>
          <button 
            className={`audio-source-tab ${activeTab === 'stream' ? 'active' : ''}`}
            onClick={() => setActiveTab('stream')}
          >
            Stream
          </button>
        </div>
        
        <div className="audio-source-content">
          {activeTab === 'file' && (
            <div className="file-input-container">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="file-input-button"
              >
                Select Audio File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".mp3,.wav,.flac,.ogg,.aac"
                style={{ display: 'none' }}
              />
              {currentSource?.type === 'file' && (
                <div className="audio-row" style={{ marginTop: '8px' }}>
                  <span>Selected: {currentSource.name}</span>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'microphone' && (
            <div className="audio-tab-content">
              {error ? (
                <div className="audio-error-message">
                  <p>{error}</p>
                  <button 
                    className="audio-control-button" 
                    onClick={() => {
                      clearError();
                      initMicrophone();
                    }}
                  >
                    Retry Microphone Access
                  </button>
                </div>
              ) : (
                <button 
                  className="audio-control-button" 
                  onClick={() => initMicrophone()}
                >
                  Start Microphone
                </button>
              )}
            </div>
          )}
          
          {activeTab === 'stream' && (
            <form onSubmit={handleStreamSubmit} className="audio-row">
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="Enter stream URL"
                className="url-input"
              />
              <button type="submit" className="file-input-button" style={{ marginLeft: '8px' }}>Load</button>
              {currentSource?.type === 'stream' && (
                <div className="audio-row" style={{ marginTop: '8px' }}>
                  <span>Stream: {currentSource.name}</span>
                </div>
              )}
            </form>
          )}
        </div>
        
        <div className="audio-group">
          <h4 className="audio-group-title">Playback Controls</h4>
          
          <div className="audio-controls-buttons">
            <button 
              onClick={handlePlayPause}
              disabled={!currentSource}
              className={`audio-button ${isPlaying ? 'pause-button' : 'play-button'}`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button 
              onClick={() => stop()}
              disabled={!currentSource}
              className="audio-button stop-button"
            >
              Stop
            </button>
          </div>
          
          {currentSource && (
            <div>
              <AudioProgressBar />
              <VolumeControl />
            </div>
          )}
        </div>
        
        {currentSource && (
          <div className="audio-group">
            <h4 className="audio-group-title">Current Source</h4>
            <div className="audio-row">
              <span>Name: {currentSource.name}</span>
            </div>
            <div className="audio-row">
              <span>Type: {currentSource.type}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioControls;
