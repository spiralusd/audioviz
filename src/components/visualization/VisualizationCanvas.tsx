import React, { useRef, useEffect } from 'react';
import { useAudio, AudioData } from '../../contexts/AudioContext';
import { useVisualization, VisualizationType } from '../../contexts/VisualizationContext';
import { AudioService, AudioSourceType } from '../../services/AudioService';
import FullscreenButton from '../ui/FullscreenButton';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import './VisualizationCanvas.css';

// Define interface for 2D asteroid particles
interface Asteroid2DParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  points: number;
}

// Define interface for 3D asteroid particles
interface Asteroid3DParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  speedX: number;
  speedY: number;
  speedZ: number;
  rotation: number;
  rotationSpeed: number;
  points: number;
}

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    _asteroidParticles: Asteroid2DParticle[];
    _asteroid3DParticles: Asteroid3DParticle[];
  }
}

const VisualizationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { audioData, isPlaying } = useAudio();
  const { settings } = useVisualization();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts({ seekIncrement: 10 });
  
  // Animation frame reference
  const animationRef = useRef<number>(0);
  
  // Canvas context reference
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Debug the audioData and settings values
  useEffect(() => {
    console.log('AudioData updated:', audioData);
  }, [audioData]);

  useEffect(() => {
    console.log('Settings updated:', settings);
  }, [settings]);
  
  // Initialize canvas on component mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas ref is null');
      return;
    }
    
    console.log('Canvas dimensions:', canvas.width, canvas.height);
    
    // Get canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get canvas context');
      return;
    }
    
    // Store context in ref
    canvasCtxRef.current = ctx;
    console.log('Canvas context initialized');
    
    // Set canvas dimensions to match its display size
    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
    };
    
    // Initial resize
    resizeCanvas();
    
    // Add resize listener
    window.addEventListener('resize', resizeCanvas);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying || !audioData) {
      // If not playing, cancel any existing animation
      cancelAnimationFrame(animationRef.current);
      return;
    }
    
    const ctx = canvasCtxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    const draw = () => {
      const { width, height } = canvas;
      console.log('Draw called, isPlaying:', isPlaying, 'canvas size:', width, height);
      
      // Clear canvas
      ctx.clearRect(0, 0, width / window.devicePixelRatio, height / window.devicePixelRatio);
      
      // Get current audio data
      if (!audioData || !audioData.analyzer) {
        console.log('No audio data available in draw loop');
        return;
      }
      console.log('Audio data available:', audioData.analyzer.size);
      
      const { frequencyData, timeData, analyzer } = audioData;
      if (!frequencyData || !timeData) {
        console.log('Missing frequency or time data');
        return;
      }
      
      // Update data with frequency and time data
      // Use the analyzer's getValue method and convert to Uint8Array for visualization
      try {
        const freqData = analyzer.getValue() as Float32Array;
        // Get a second value for the waveform data to avoid the same data being used twice
        analyzer.set({ type: 'waveform' });
        const waveData = analyzer.getValue() as Float32Array;
        // Set back to FFT for next frame
        analyzer.set({ type: 'fft' });
        
        // Copy values to our Uint8Array buffers for visualization
        for (let i = 0; i < frequencyData.length; i++) {
          if (i < freqData.length) {
            // Convert from Float32 [-1,1] to Uint8 [0,255]
            frequencyData[i] = Math.min(255, Math.max(0, ((freqData[i] + 1) * 127.5)));
            timeData[i] = Math.min(255, Math.max(0, ((waveData[i] + 1) * 127.5)));
          }
        }
      } catch (error) {
        console.error('Error getting analyzer data:', error);
        return;
      }
      
      // Apply sensitivity to the data
      const applySensitivity = (data: Uint8Array, sensitivity: number): Uint8Array => {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          // Apply sensitivity as a multiplier, clamped to 0-255
          result[i] = Math.min(255, Math.max(0, Math.floor(data[i] * sensitivity)));
        }
        return result;
      };
      
      // Apply sensitivity to both data arrays
      const sensitizedFreqData = applySensitivity(frequencyData, settings.sensitivity);
      const sensitizedTimeData = applySensitivity(timeData, settings.sensitivity);
      
      // Log the active visualization type
      console.log('Drawing with type:', settings.type, 'sensitivity:', settings.sensitivity);
      
      // Draw based on visualization type
      switch (settings.type) {
        case VisualizationType.BARS_2D:
          console.log('Drawing bars with', sensitizedFreqData.length, 'data points');
          drawBars(ctx, sensitizedFreqData, width, height);
          break;
        case VisualizationType.WAVEFORM_2D:
          console.log('Drawing waveform with', sensitizedTimeData.length, 'data points');
          drawWaveform(ctx, sensitizedTimeData, width, height);
          break;
        case VisualizationType.CIRCULAR:
          console.log('Drawing circular with', sensitizedFreqData.length, 'data points');
          drawCircular(ctx, sensitizedFreqData, width, height);
          break;
        case VisualizationType.ASTEROIDS_2D:
          console.log('Drawing 2D asteroids');
          drawAsteroids2D(ctx, sensitizedFreqData, sensitizedTimeData, width, height);
          break;
        case VisualizationType.ASTEROIDS_3D:
          console.log('Drawing 3D asteroids');
          drawAsteroids3D(ctx, sensitizedFreqData, sensitizedTimeData, width, height);
          break;
        case VisualizationType.PARTICLES_3D:
          console.log('Drawing 3D particles');
          draw3DParticles(ctx, sensitizedFreqData, width, height);
          break;
        case VisualizationType.GEOMETRIC_3D:
          console.log('Drawing 3D geometric');
          draw3DGeometric(ctx, sensitizedFreqData, width, height);
          break;
        default:
          console.log('Using default visualization (bars)');
          drawBars(ctx, sensitizedFreqData, width, height);
      }
      
      // Draw audio progress bar for file playback
      const drawProgressBar = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const audioService = AudioService.getInstance();
        const source = audioService.getCurrentSource();
        
        // Only show progress for file sources
        if (!source || source.type !== AudioSourceType.FILE) return;
        
        const currentTime = audioService.getCurrentTime();
        const duration = audioService.getDuration();
        
        if (currentTime === null || duration === null || duration <= 0) return;
        
        const progress = currentTime / duration;
        const barHeight = 4; // Height in pixels
        const barY = height - barHeight - 4; // Position from bottom
        
        // Draw background
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        ctx.fillRect(0, barY, width, barHeight);
        
        // Draw progress
        ctx.fillStyle = settings.primaryColor;
        ctx.fillRect(0, barY, width * progress, barHeight);
        
        // Add glow effect if enabled
        if (settings.useGlow) {
          ctx.shadowBlur = settings.glowIntensity;
          ctx.shadowColor = settings.primaryColor;
          ctx.fillRect(0, barY, width * progress, barHeight);
          ctx.shadowBlur = 0;
        }
        
        // Draw time text
        const formatTime = (seconds: number) => {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs < 10 ? '0' + secs : secs}`;
        };
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(`${formatTime(currentTime)} / ${formatTime(duration)}`, 10, barY - 4);
      };
      
      // Draw progress bar on top of visualization if audio is playing
      const audioService = AudioService.getInstance();
      if (audioService.isAudioPlaying()) {
        drawProgressBar(ctx, width, height);
      }
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(draw);
    };
    
    // Start animation loop
    animationRef.current = requestAnimationFrame(draw);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, audioData, settings.type]);
  
  // Draw frequency bars visualization
  const drawBars = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Number of bars to display (based on available space)
    const numBars = Math.min(data.length, Math.floor(width / (settings.barWidth + settings.barSpacing)));
    
    // Calculate logarithmic distribution for frequency bands (20Hz - 20kHz)
    const minFreq = 20;    // 20Hz
    const maxFreq = 20000; // 20kHz
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logRange = logMax - logMin;
    
    // Create frequency bins with logarithmic distribution
    const freqBins: number[] = [];
    for (let i = 0; i < numBars; i++) {
      // Calculate the frequency for this bar on a log scale
      const logFreq = logMin + (i / numBars) * logRange;
      const freq = Math.pow(10, logFreq);
      
      // Convert to FFT bin index
      // Assuming standard sample rate of 44.1kHz, meaning frequency range is 0-22050 Hz
      const nyquist = 22050; 
      const binIndex = Math.floor((freq / nyquist) * (data.length / 2));
      freqBins.push(Math.min(binIndex, data.length - 1));
    }
    
    const barWidth = Math.max(1, settings.barWidth);
    const barSpacing = settings.barSpacing;
    const amplification = settings.amplification;
    
    console.log(`Drawing ${numBars} bars representing 20Hz-20kHz range with logarithmic scaling`);
    
    // Draw frequency-mapped bars
    for (let i = 0; i < numBars; i++) {
      // Get the data from the appropriate frequency bin
      const dataIndex = freqBins[i];
      const value = data[dataIndex] / 255.0;
      const barHeight = Math.max(2, value * height * amplification); // Ensure at least 2px height for visibility
      const x = i * (barWidth + barSpacing);
      const y = height - barHeight;
      
      // Use color from the color scheme based on frequency position
      const colorIndex = Math.floor((i / numBars) * settings.colorScheme.colors.length);
      const primaryColor = settings.colorScheme.colors[colorIndex % settings.colorScheme.colors.length];
      const secondaryColor = settings.colorScheme.colors[(colorIndex + 1) % settings.colorScheme.colors.length];
      
      // Add gradient effect if enabled
      if (settings.useGradient) {
        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = primaryColor;
      }
      
      // Add glow effect if enabled
      if (settings.useGlow) {
        ctx.shadowBlur = settings.glowIntensity;
        ctx.shadowColor = primaryColor;
      }
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    
    // Reset shadow after drawing
    ctx.shadowBlur = 0;
  };
  
  // Draw 3D particles visualization
  const draw3DParticles = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Clear with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Create pseudo-3D particles based on audio data
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2;
    
    // Sample the data to create particles
    const numParticles = 100;
    const sampleRate = Math.floor(data.length / numParticles);
    
    for (let i = 0; i < numParticles; i++) {
      const dataIndex = i * sampleRate;
      if (dataIndex >= data.length) break;
      
      // Get intensity from audio data
      const intensity = data[dataIndex] / 255;
      
      // Calculate position with pseudo-3D effect
      const angle = (i / numParticles) * Math.PI * 2;
      const radius = maxRadius * (0.2 + intensity * 0.8);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 2 + intensity * 10;
      
      // Use color from color scheme
      const colorIndex = Math.floor(intensity * (settings.colorScheme.colors.length - 1));
      const color = settings.colorScheme.colors[colorIndex];
      
      // Draw particle with glow if enabled
      ctx.beginPath();
      
      if (settings.useGlow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = intensity * settings.glowIntensity * 10;
      }
      
      ctx.fillStyle = color;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Reset shadow for next particle
      ctx.shadowBlur = 0;
    }
  };
  
  // Draw 3D geometric visualization
  const draw3DGeometric = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Clear with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Create a 3D-like geometric shape
    const centerX = width / 2;
    const centerY = height / 2;
    const maxSize = Math.min(width, height) * 0.4;
    
    // Function to rotate a point around a center
    const rotatePoint = (x: number, y: number, angle: number) => {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      const xNew = (x - centerX) * c - (y - centerY) * s + centerX;
      const yNew = (x - centerX) * s + (y - centerY) * c + centerY;
      return { x: xNew, y: yNew };
    };
    
    // Sample data for the shape
    const numPoints = 8;
    const sampleRate = Math.floor(data.length / numPoints);
    const points = [];
    
    // Generate base points for the shape
    for (let i = 0; i < numPoints; i++) {
      const dataIndex = i * sampleRate;
      if (dataIndex >= data.length) break;
      
      // Get intensity from audio data
      const intensity = data[dataIndex] / 255;
      
      // Calculate position with pseudo-3D effect
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = maxSize * (0.5 + intensity * 0.5);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      points.push({ x, y, intensity });
    }
    
    // Apply rotation if enabled
    if (settings.useRotation) {
      const now = Date.now() / 1000;
      const rotationAngle = now * settings.rotationSpeed;
      for (let i = 0; i < points.length; i++) {
        const rotated = rotatePoint(points[i].x, points[i].y, rotationAngle);
        points[i].x = rotated.x;
        points[i].y = rotated.y;
      }
    }
    
    // Draw the shape
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    
    // Use gradient or solid color
    if (settings.useGradient) {
      const gradient = ctx.createLinearGradient(
        centerX - maxSize, centerY - maxSize,
        centerX + maxSize, centerY + maxSize
      );
      gradient.addColorStop(0, settings.primaryColor);
      gradient.addColorStop(1, settings.secondaryColor);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = settings.primaryColor;
    }
    
    // Add glow effect if enabled
    if (settings.useGlow) {
      ctx.shadowColor = settings.primaryColor;
      ctx.shadowBlur = settings.glowIntensity * 5;
    }
    
    ctx.fill();
    
    // Draw connecting lines
    ctx.strokeStyle = settings.secondaryColor;
    ctx.lineWidth = settings.lineWidth;
    ctx.stroke();
    
    // Reset shadow for next frame
    ctx.shadowBlur = 0;
  };
  
  // Draw waveform visualization
  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Clear the entire canvas first to prevent artifacts
    ctx.clearRect(0, 0, width, height);
    
    const sliceWidth = width / data.length;
    const amplification = settings.amplification;
    const centerY = height / 2;
    
    ctx.lineWidth = settings.lineWidth;
    ctx.strokeStyle = settings.primaryColor;
    
    // Start fresh path
    ctx.beginPath();
    
    // Always start from left edge at center line
    ctx.moveTo(0, centerY);
    
    for (let i = 0; i < data.length; i++) {
      // Normalize to [-1, 1] range
      const value = data[i] / 128.0 - 1.0;
      
      // Apply sensitivity to the amplitude but keep waveform centered
      // This properly scales the wave instead of moving it up/down
      const scaledValue = value * amplification;
      const y = centerY + (scaledValue * centerY / 2); // Divide by 2 to prevent clipping at high sensitivity
      const x = i * sliceWidth;
      
      ctx.lineTo(x, y);
    }
    
    // End at the right edge
    ctx.lineTo(width, centerY);
    
    // Stroke the entire path at once
    ctx.stroke();
    
    // Add glow effect if enabled
    if (settings.useGlow) {
      ctx.shadowBlur = settings.glowIntensity;
      ctx.shadowColor = settings.primaryColor;
      ctx.stroke();
      // Reset shadow after drawing
      ctx.shadowBlur = 0;
    }
  };
  
  // Draw asteroids-style 2D particle visualization
  const drawAsteroids2D = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    timeData: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Clear with slight fade effect for trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Create asteroid-like particles
    const numParticles = 30;
    const particles = [];
    
    // Initialize particles if needed
    if (!window._asteroidParticles || window._asteroidParticles.length === 0) {
      window._asteroidParticles = [];
      
      for (let i = 0; i < numParticles; i++) {
        const size = 2 + Math.random() * 8;
        window._asteroidParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: size,
          speedX: (Math.random() - 0.5) * 2,
          speedY: (Math.random() - 0.5) * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          points: 3 + Math.floor(Math.random() * 5)
        });
      }
    }
    
    // Extract frequency bands for more specific audio reactivity
    const numBands = 5;
    const bandValues = [];
    
    // Get different frequency bands (bass, mid-low, mid, mid-high, high)
    for (let band = 0; band < numBands; band++) {
      const startIdx = Math.floor((freqData.length / numBands) * band);
      const endIdx = Math.floor((freqData.length / numBands) * (band + 1));
      
      let bandSum = 0;
      for (let i = startIdx; i < endIdx; i++) {
        bandSum += freqData[i];
      }
      bandValues.push(bandSum / (endIdx - startIdx) / 255); // Normalize to 0-1
    }
    
    // Interpret the bands
    const bassIntensity = bandValues[0];           // Bass (affects overall speed)
    const midLowIntensity = bandValues[1];         // Mid-low (affects rotation)
    const midIntensity = bandValues[2];            // Mid (affects size)
    const midHighIntensity = bandValues[3];        // Mid-high (affects color selection)
    const highIntensity = bandValues[4];           // High (affects parameter variations)
    
    // Get beat detection from time domain
    let peakValue = 0;
    for (let i = 0; i < timeData.length; i++) {
      peakValue = Math.max(peakValue, timeData[i]);
    }
    const beatIntensity = peakValue / 255;
    
    // Use a weighted sum of different bands for better expressiveness
    const intensity = bassIntensity * 0.5 + midIntensity * 0.3 + highIntensity * 0.2;
    
    // Update and draw particles
    window._asteroidParticles.forEach((p: Asteroid2DParticle) => {
      // Update position with more nuanced audio reactivity
      // Bass drives overall speed
      p.x += p.speedX * (1 + bassIntensity * 2.0);
      p.y += p.speedY * (1 + bassIntensity * 2.0);
      
      // Mid-low frequencies affect rotation
      p.rotation += p.rotationSpeed * (1 + midLowIntensity * 3.0);
      
      // Add reactive jitter based on high frequencies
      if (highIntensity > 0.6) {
        p.x += (Math.random() - 0.5) * highIntensity * 5;
        p.y += (Math.random() - 0.5) * highIntensity * 5;
      }
      
      // Add impulse on beat detection
      if (beatIntensity > 0.7) {
        p.speedX += (Math.random() - 0.5) * beatIntensity;
        p.speedY += (Math.random() - 0.5) * beatIntensity;
      }
      
      // Screen wrapping
      if (p.x < -p.size) p.x = width + p.size;
      if (p.x > width + p.size) p.x = -p.size;
      if (p.y < -p.size) p.y = height + p.size;
      if (p.y > height + p.size) p.y = -p.size;
      
      // Color based on mid-high frequencies for more dynamic color changes
      const colorIndex = Math.floor(midHighIntensity * (settings.colorScheme.colors.length - 1));
      const color = settings.colorScheme.colors[colorIndex];
      
      // Draw asteroid
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      ctx.beginPath();
      
      const points = p.points;
      // Use mid frequencies to affect size
      const size = p.size * (1 + midIntensity * 1.5);
      
      // Draw irregular polygon
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const jitter = 0.2 + Math.random() * 0.4;
        const radius = size * jitter;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        
        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      
      ctx.closePath();
      
      // Add glow effect if enabled
      if (settings.useGlow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = settings.glowIntensity * 5;
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = settings.lineWidth;
      ctx.stroke();
      
      ctx.restore();
    });
  };
  
  // Draw asteroids-style 3D particle visualization
  const drawAsteroids3D = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    timeData: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    // Clear with slight fade effect for trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Create asteroid-like particles with z-coordinate
    const numParticles = 50;
    
    // Initialize particles if needed
    if (!window._asteroid3DParticles || window._asteroid3DParticles.length === 0) {
      window._asteroid3DParticles = [];
      
      for (let i = 0; i < numParticles; i++) {
        const size = 5 + Math.random() * 15;
        window._asteroid3DParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 1000 - 500, // z-depth from -500 to 500
          size: size,
          speedX: (Math.random() - 0.5) * 3,
          speedY: (Math.random() - 0.5) * 3,
          speedZ: Math.random() * 10 + 5, // always moving toward viewer
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          points: 3 + Math.floor(Math.random() * 5)
        });
      }
    }
    
    // Center point for perspective projection
    const centerX = width / 2;
    const centerY = height / 2;
    const focalLength = 300;
    
    // Extract frequency bands for more specific audio reactivity
    const numBands = 5;
    const bandValues = [];
    
    // Get different frequency bands (bass, mid-low, mid, mid-high, high)
    for (let band = 0; band < numBands; band++) {
      const startIdx = Math.floor((freqData.length / numBands) * band);
      const endIdx = Math.floor((freqData.length / numBands) * (band + 1));
      
      let bandSum = 0;
      for (let i = startIdx; i < endIdx; i++) {
        bandSum += freqData[i];
      }
      bandValues.push(bandSum / (endIdx - startIdx) / 255); // Normalize to 0-1
    }
    
    // Interpret the bands
    const bassIntensity = bandValues[0];      // Bass (affects z-movement)
    const midLowIntensity = bandValues[1];    // Mid-low (affects x,y-movement)
    const midIntensity = bandValues[2];       // Mid (affects particle size)
    const midHighIntensity = bandValues[3];   // Mid-high (affects rotation)
    const highIntensity = bandValues[4];      // High (affects jitter/turbulence)
    
    // Get beat detection from time domain for impulse effects
    let peakValue = 0;
    for (let i = 0; i < timeData.length; i++) {
      peakValue = Math.max(peakValue, timeData[i]);
    }
    const beatIntensity = peakValue / 255;
    
    // Update and draw particles
    window._asteroid3DParticles.forEach((p: Asteroid3DParticle) => {
      // Update position with audio-reactive 3D movement
      // Mid-low frequencies control lateral movement
      p.x += p.speedX * (1 + midLowIntensity * 1.5);
      p.y += p.speedY * (1 + midLowIntensity * 1.5);
      
      // Bass frequencies control z-movement (depth)
      // Reduced speed for less aggressive flow
      p.z += p.speedZ * (1 + bassIntensity * 1.0);
      
      // Mid-high frequencies control rotation
      p.rotation += p.rotationSpeed * (1 + midHighIntensity * 2.0);
      
      // Add reactive turbulence based on high frequencies
      if (highIntensity > 0.6) {
        p.x += (Math.random() - 0.5) * highIntensity * 8;
        p.y += (Math.random() - 0.5) * highIntensity * 8;
        p.z += (Math.random() - 0.5) * highIntensity * 15;
      }
      
      // Add impulse on beat detection
      if (beatIntensity > 0.7) {
        // Strong beat detected - add impulse
        p.speedZ += beatIntensity * 2.5; // Push toward viewer (reduced by half)
        p.rotation += beatIntensity * Math.PI / 12; // Add rotational impulse (reduced)
      }
      
      // If particle moves too far in z-direction, reset it
      if (p.z > 500) {
        p.z = -500;
        p.x = Math.random() * width;
        p.y = Math.random() * height;
      }
      
      // Screen wrapping for x and y
      if (p.x < -p.size) p.x = width + p.size;
      if (p.x > width + p.size) p.x = -p.size;
      if (p.y < -p.size) p.y = height + p.size;
      if (p.y > height + p.size) p.y = -p.size;
      
      // 3D to 2D projection
      const scale = focalLength / (focalLength + p.z);
      const x2d = (p.x - centerX) * scale + centerX;
      const y2d = (p.y - centerY) * scale + centerY;
      const size2d = p.size * scale;
      
      // More dynamic coloring based on z-depth, bass intensity and mid-high frequency
      // This creates more vibrant color changes in sync with the audio
      const depthFactor = (p.z + 500) / 1000; // 0-1 based on depth
      const colorFactor = (depthFactor * 0.5) + (midHighIntensity * 0.5); // Blend depth with audio
      const colorIndex = Math.floor(colorFactor * (settings.colorScheme.colors.length - 1));
      const color = settings.colorScheme.colors[colorIndex];
      
      // Draw asteroid with perspective
      ctx.save();
      ctx.translate(x2d, y2d);
      ctx.rotate(p.rotation);
      ctx.scale(scale, scale); // Apply perspective scaling
      
      ctx.beginPath();
      
      const points = p.points;
      // Use mid frequencies to modulate size
      const size = size2d * (1 + midIntensity * 1.8);
      
      // Draw irregular polygon
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const jitter = 0.7 + Math.random() * 0.6;
        const radius = p.size * jitter;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        
        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      
      ctx.closePath();
      
      // Add glow effect based on z-position
      if (settings.useGlow) {
        const glowIntensity = Math.max(0, (500 - Math.abs(p.z)) / 500);
        ctx.shadowColor = color;
        ctx.shadowBlur = settings.glowIntensity * 5 * glowIntensity;
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = settings.lineWidth;
      ctx.stroke();
      
      // Optional: fill with semi-transparent color
      if (settings.useGradient) {
        ctx.fillStyle = color + '80'; // 50% alpha
        ctx.fill();
      }
      
      ctx.restore();
    });
  };
  
  // Draw circular visualization
  const drawCircular = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1;
    width = width / dpr;
    height = height / dpr;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const amplification = settings.amplification;
    const barWidth = (Math.PI * 2) / data.length;
    
    ctx.lineWidth = settings.lineWidth;
    
    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255.0;
      const barHeight = value * radius * amplification;
      const angle = i * barWidth;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      if (settings.useGradient) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, settings.secondaryColor);
        gradient.addColorStop(1, settings.primaryColor);
        ctx.strokeStyle = gradient;
      } else {
        ctx.strokeStyle = settings.primaryColor;
      }
      
      ctx.stroke();
    }
    
    // Add rotation animation if enabled
    if (settings.useRotation) {
      ctx.translate(centerX, centerY);
      ctx.rotate(0.005); // Rotate slightly each frame
      ctx.translate(-centerX, -centerY);
    }
  };
  
  return (
    <div ref={containerRef} className="visualization-canvas-container">
      <canvas ref={canvasRef} className="visualization-canvas" />
      <FullscreenButton containerRef={containerRef} />
    </div>
  );
};

export default VisualizationCanvas;
