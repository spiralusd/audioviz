import React, { useRef, useEffect } from 'react';
import { useAudio } from '../../../contexts/AudioContext';
import { useVisualization } from '../../../contexts/VisualizationContext';

interface WaveformVisualizerProps {
  width: number;
  height: number;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getWaveformData, isPlaying } = useAudio();
  const { settings } = useVisualization();
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isPlaying) {
        // Clear canvas if not playing
        ctx.clearRect(0, 0, width, height);
        return;
      }

      const waveformData = getWaveformData();
      if (!waveformData) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Use user-selected wavelength size (clamp between 128 and 2048)
      const numSamples = Math.max(128, Math.min(settings.wavelengthSize || 1024, 2048));
      const bufferLength = Math.min(waveformData.length, numSamples);
      const sliceWidth = width / bufferLength;

      // Get colors from color scheme
      const { colorScheme, sensitivity } = settings;
      const colors = colorScheme.colors;
      const primaryColor = colors[0];
      // Sensitivity: 0 = no effect, 100 = max effect (map linearly)
      const sensitivityScale = (sensitivity ?? 50) / 100;

      // Start drawing path
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = primaryColor;

      // Move to the first point
      let x = 0;
      
      // Compute max vertical amplitude scaling so waveform never exceeds canvas
      const margin = 6; // px margin from top/bottom
      const maxAmplitude = (height / 2) - margin;
      // Sensitivity at 100 means full amplitude, but always clamp to maxAmplitude
      const amplitude = maxAmplitude * sensitivityScale;
      for (let i = 0; i < bufferLength; i++) {
        // Waveform data is typically in range -1 to 1
        // Clamp y so it never exceeds canvas
        const y = (height / 2) + Math.max(-maxAmplitude, Math.min(waveformData[i] * amplitude, maxAmplitude));
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      // Add a mirror effect with gradient
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(0, height / 2, 0, height);
      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / colors.length, colors[i] + '80'); // Add 50% transparency
      }
      ctx.strokeStyle = gradient;
      
      x = 0;
      for (let i = 0; i < bufferLength; i++) {
        // Mirror the waveform
        const y = (height / 2) - (waveformData[i] * height / 2 * sensitivity);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();

      // Request next frame
      animationRef.current = requestAnimationFrame(draw);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, getWaveformData, isPlaying, settings]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default WaveformVisualizer;
