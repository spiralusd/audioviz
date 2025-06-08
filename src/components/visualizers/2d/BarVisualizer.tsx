import React, { useRef, useEffect } from 'react';
import { useAudio } from '../../../contexts/AudioContext';
import { useVisualization } from '../../../contexts/VisualizationContext';

interface BarVisualizerProps {
  width: number;
  height: number;
}

const BarVisualizer: React.FC<BarVisualizerProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getFrequencyData, isPlaying } = useAudio();
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

      const frequencyData = getFrequencyData();
      if (!frequencyData) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Use user-selected number of frequency bands (clamped between 4 and 12)
      const numBands = Math.max(4, Math.min(settings.numFrequencyBands || 8, 12));
      const fftSize = frequencyData.length;
      const barWidth = settings.barWidth;
      const barSpacing = settings.barSpacing;
      const totalWidth = numBands * barWidth + (numBands - 1) * barSpacing;
      const xOffset = (width - totalWidth) / 2;
      const { colorScheme, sensitivity } = settings;
      const colors = colorScheme.colors;
      // Sensitivity: 0 = no effect, 100 = max effect (map linearly)
      const sensitivityScale = (sensitivity ?? 50) / 100;

      // Logarithmic binning for frequency bands
      const minFreq = 20;
      const maxFreq = 20000;
      const nyquist = 22050;
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const logRange = logMax - logMin;

      const freqBins: number[] = [];
      for (let i = 0; i < numBands; i++) {
        const logFreq = logMin + (i / numBands) * logRange;
        const freq = Math.pow(10, logFreq);
        const binIndex = Math.floor((freq / nyquist) * (fftSize / 2));
        freqBins.push(Math.min(binIndex, fftSize - 1));
      }

      // Draw bars
      for (let i = 0; i < numBands; i++) {
        const dataIndex = freqBins[i];
        const normalizedValue = (frequencyData[dataIndex] + 100) / 100;
        // Clamp amplitude for comfort
        const barHeight = Math.max(2, normalizedValue * height * sensitivityScale);
        const colorIndex = Math.floor((i / numBands) * colors.length);
        const color = colors[colorIndex % colors.length];
        const x = xOffset + i * (barWidth + barSpacing);
        const y = height - barHeight;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

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
  }, [width, height, getFrequencyData, isPlaying, settings]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default BarVisualizer;
