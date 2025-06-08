import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useAudio } from '../../../contexts/AudioContext';
import { useVisualization } from '../../../contexts/VisualizationContext';

interface ParticleVisualizerProps {
  width: number;
  height: number;
}

const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({ width, height }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { getFrequencyData, detectBeat, isPlaying } = useAudio();
  const { settings } = useVisualization();
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particles
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Initialize particles in a sphere
    for (let i = 0; i < particleCount; i++) {
      // Position
      const radius = Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);     // x
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // y
      positions[i * 3 + 2] = radius * Math.cos(phi);                   // z

      // Color - will be updated in animation loop
      colors[i * 3] = 1.0;     // r
      colors[i * 3 + 1] = 0.5; // g
      colors[i * 3 + 2] = 0.5; // b
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    // Create the particle system
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Animation function
    const animate = () => {
      if (!isPlaying || !particlesRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const frequencyData = getFrequencyData();
      if (!frequencyData) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Get positions and colors from the particle system
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
      
      // Get settings
      const { colorScheme, sensitivity } = settings;
      const schemeColors = colorScheme.colors.map(color => {
        const c = new THREE.Color(color);
        return { r: c.r, g: c.g, b: c.b };
      });

      // Detect beat for pulse effect
      const isBeat = detectBeat(0.15);
      const beatScale = isBeat ? 1.2 : 1.0;

      // Update particles based on audio data
      for (let i = 0; i < positions.length / 3; i++) {
        // Get frequency data for this particle
        const frequencyIndex = Math.floor((i / (positions.length / 3)) * frequencyData.length);
        const audioValue = ((frequencyData[frequencyIndex] || -80) + 100) / 100; // Normalize to 0-1
        
        // Scale the position based on audio data
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Calculate distance from center
        const distance = Math.sqrt(x * x + y * y + z * z);
        
        // Normalize direction vector
        const nx = x / distance;
        const ny = y / distance;
        const nz = z / distance;
        
        // Apply audio-reactive movement
        const scale = 1.0 + audioValue * sensitivity * beatScale;
        positions[i * 3] = nx * distance * scale;
        positions[i * 3 + 1] = ny * distance * scale;
        positions[i * 3 + 2] = nz * distance * scale;
        
        // Update color based on audio frequency and color scheme
        const colorIndex = Math.floor(audioValue * schemeColors.length);
        const color = schemeColors[Math.min(colorIndex, schemeColors.length - 1)];
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      // Mark attributes as needing update
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
      
      // Rotate the particle system slowly
      particlesRef.current.rotation.y += 0.002;
      particlesRef.current.rotation.x += 0.001;

      // Render the scene
      rendererRef.current?.render(scene, camera);
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose of Three.js objects
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        (particlesRef.current.material as THREE.Material).dispose();
      }
    };
  }, [width, height, getFrequencyData, detectBeat, isPlaying, settings]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default ParticleVisualizer;
