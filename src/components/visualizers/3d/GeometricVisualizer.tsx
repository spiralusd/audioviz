import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useAudio } from '../../../contexts/AudioContext';
import { useVisualization } from '../../../contexts/VisualizationContext';

interface GeometricVisualizerProps {
  width: number;
  height: number;
}

const GeometricVisualizer: React.FC<GeometricVisualizerProps> = ({ width, height }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { getFrequencyData, detectBeat, isPlaying } = useAudio();
  const { settings } = useVisualization();
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometriesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create geometric shapes
    const geometries: THREE.Mesh[] = [];
    const shapes = [
      new THREE.IcosahedronGeometry(5, 0), // Outer shape
      new THREE.DodecahedronGeometry(4, 0),
      new THREE.OctahedronGeometry(3, 0),
      new THREE.TetrahedronGeometry(2, 0),
      new THREE.TorusGeometry(6, 0.5, 16, 100) // Outer ring
    ];

    // Create materials with wireframe
    const createMaterial = (color: string) => {
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        emissive: new THREE.Color(color).multiplyScalar(0.3),
        shininess: 100,
        transparent: true,
        opacity: 0.8
      });
    };

    // Get colors from settings
    const { colorScheme } = settings;
    const colors = colorScheme.colors;

    // Create meshes
    shapes.forEach((geometry, i) => {
      const material = createMaterial(colors[i % colors.length]);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      geometries.push(mesh);
    });

    geometriesRef.current = geometries;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Animation function
    const animate = () => {
      if (!isPlaying) {
        // Still animate but more slowly when not playing
        geometriesRef.current.forEach((mesh, i) => {
          mesh.rotation.x += 0.001;
          mesh.rotation.y += 0.001;
        });
        
        rendererRef.current?.render(scene, camera);
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const frequencyData = getFrequencyData();
      if (!frequencyData) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Detect beat for pulse effect
      const isBeat = detectBeat(0.15);
      
      // Divide frequency data into bands for different shapes
      const bandSize = Math.floor(frequencyData.length / geometriesRef.current.length);
      
      // Update each geometric shape based on audio data
      geometriesRef.current.forEach((mesh, i) => {
        // Get average frequency value for this band
        const startIndex = i * bandSize;
        const endIndex = startIndex + bandSize;
        let sum = 0;
        
        for (let j = startIndex; j < endIndex; j++) {
          // Normalize to 0-1 range
          sum += ((frequencyData[j] || -80) + 100) / 100;
        }
        
        const average = sum / bandSize;
        
        // Apply sensitivity
        const { sensitivity } = settings;
        const scale = 1 + average * sensitivity * (isBeat ? 1.3 : 1.0);
        
        // Scale the mesh
        mesh.scale.set(scale, scale, scale);
        
        // Rotate based on audio intensity
        mesh.rotation.x += 0.01 * average;
        mesh.rotation.y += 0.01 * average;
        
        // Update material color based on audio intensity
        const material = mesh.material as THREE.MeshPhongMaterial;
        
        // Get color from scheme based on intensity
        const colorIndex = Math.floor(average * colors.length);
        const color = colors[Math.min(colorIndex, colors.length - 1)];
        
        material.color.set(color);
        material.emissive.set(color).multiplyScalar(0.3 + average * 0.7);
        material.opacity = 0.5 + average * 0.5;
      });

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
      geometriesRef.current.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [width, height, getFrequencyData, detectBeat, isPlaying, settings]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default GeometricVisualizer;
