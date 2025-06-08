import React, { useState } from 'react';
import './ExportControls.css';
import { useVisualization } from '../../contexts/VisualizationContext';
import { useAudio } from '../../contexts/AudioContext';

interface ExportOptions {
  includeAudio: boolean;
  format: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
  resolution: { width: number; height: number };
  frameRate: 30 | 60;
}

const ExportControls: React.FC = () => {
  const { settings } = useVisualization();
  const { currentSource } = useAudio();
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeAudio: true,
    format: 'mp4',
    quality: 'high',
    resolution: settings.resolution,
    frameRate: settings.frameRate
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const startRecording = () => {
    // This is a simplified version - in a real implementation, 
    // we would need to capture the canvas and audio stream
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    try {
      // Get canvas stream
      const canvasStream = canvas.captureStream(exportOptions.frameRate);
      
      // Combine with audio stream if needed
      let combinedStream = canvasStream;
      if (exportOptions.includeAudio && currentSource) {
        // In a real implementation, we would get the audio stream from the audio context
        // This is just a placeholder
        const audioContext = new AudioContext();
        const audioStream = audioContext.createMediaStreamDestination().stream;
        
        // Combine streams
        const tracks = [...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()];
        combinedStream = new MediaStream(tracks);
      }
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: exportOptions.format === 'mp4' ? 'video/mp4' : 'video/webm',
        videoBitsPerSecond: getVideoBitrate(exportOptions.quality)
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: exportOptions.format === 'mp4' ? 'video/mp4' : 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio-visualizer-${Date.now()}.${exportOptions.format}`;
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  // Helper function to determine video bitrate based on quality setting
  const getVideoBitrate = (quality: string): number => {
    switch (quality) {
      case 'high':
        return 8000000; // 8 Mbps
      case 'medium':
        return 4000000; // 4 Mbps
      case 'low':
        return 2000000; // 2 Mbps
      default:
        return 4000000;
    }
  };

  return (
    <div className={`export-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="header">
        <h3>Export</h3>
        <button 
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="export-content">
          <div className="export-section">
            <h4>Audio</h4>
            <div className="option-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAudio}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeAudio: e.target.checked
                  })}
                />
                Include Audio
              </label>
            </div>
          </div>
          
          <div className="export-section">
            <h4>Format</h4>
            <div className="button-group">
              <button 
                className={exportOptions.format === 'mp4' ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  format: 'mp4'
                })}
              >
                MP4
              </button>
              <button 
                className={exportOptions.format === 'webm' ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  format: 'webm'
                })}
              >
                WebM
              </button>
            </div>
          </div>
          
          <div className="export-section">
            <h4>Quality</h4>
            <div className="button-group">
              <button 
                className={exportOptions.quality === 'low' ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  quality: 'low'
                })}
              >
                Low
              </button>
              <button 
                className={exportOptions.quality === 'medium' ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  quality: 'medium'
                })}
              >
                Medium
              </button>
              <button 
                className={exportOptions.quality === 'high' ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  quality: 'high'
                })}
              >
                High
              </button>
            </div>
          </div>
          
          <div className="export-section">
            <h4>Resolution</h4>
            <div className="button-group">
              <button 
                className={exportOptions.resolution.width === 1280 && exportOptions.resolution.height === 720 ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  resolution: { width: 1280, height: 720 }
                })}
              >
                720p
              </button>
              <button 
                className={exportOptions.resolution.width === 1920 && exportOptions.resolution.height === 1080 ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  resolution: { width: 1920, height: 1080 }
                })}
              >
                1080p
              </button>
            </div>
          </div>
          
          <div className="export-section">
            <h4>Frame Rate</h4>
            <div className="button-group">
              <button 
                className={exportOptions.frameRate === 30 ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  frameRate: 30
                })}
              >
                30 FPS
              </button>
              <button 
                className={exportOptions.frameRate === 60 ? 'active' : ''}
                onClick={() => setExportOptions({
                  ...exportOptions,
                  frameRate: 60
                })}
              >
                60 FPS
              </button>
            </div>
          </div>
          
          <div className="record-controls">
            {!isRecording ? (
              <button 
                className="record-button"
                onClick={startRecording}
              >
                Start Recording
              </button>
            ) : (
              <button 
                className="stop-button"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            )}
          </div>
          
          <div className="export-note">
            <p>Note: Recording will capture the current visualization with the selected export settings.</p>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default ExportControls;
