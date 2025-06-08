import React from 'react';
import { useVisualization, VisualizationType, CanvasOrientation } from '../../contexts/VisualizationContext';

// Import visualizers
import BarVisualizer from './2d/BarVisualizer';
import WaveformVisualizer from './2d/WaveformVisualizer';
import ParticleVisualizer from './3d/ParticleVisualizer';
import GeometricVisualizer from './3d/GeometricVisualizer';

const VisualizationContainer: React.FC = () => {
  const { settings } = useVisualization();
  const { type, resolution, orientation } = settings;

  // Set container style based on orientation
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden'
  };

  // Set visualization dimensions based on orientation
  const { width, height } = resolution;
  const isHorizontal = orientation === CanvasOrientation.HORIZONTAL;

  // Render the selected visualizer
  const renderVisualizer = () => {
    switch (type) {
      case VisualizationType.BARS_2D:
        return <BarVisualizer width={width} height={height} />;
      case VisualizationType.WAVEFORM_2D:
        return <WaveformVisualizer width={width} height={height} />;
      case VisualizationType.PARTICLES_3D:
        return <ParticleVisualizer width={width} height={height} />;
      case VisualizationType.GEOMETRIC_3D:
        return <GeometricVisualizer width={width} height={height} />;
      default:
        return <div>Select a visualization type</div>;
    }
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: isHorizontal ? width : height,
          height: isHorizontal ? height : width,
          transform: isHorizontal ? 'none' : 'rotate(90deg)',
          transition: 'transform 0.5s ease-in-out',
          position: 'relative'
        }}
      >
        {renderVisualizer()}
      </div>
    </div>
  );
};

export default VisualizationContainer;
