import React, { useState } from 'react';
import './MainLayout.css';
import VisualizationCanvas from '../visualization/VisualizationCanvas';
import AudioControls from './AudioControls';
import VisualizationSettings from './VisualizationSettings';
import ExportControls from './ExportControls';

const MainLayout: React.FC = () => {
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  
  return (
    <div className="main-layout">
      <div className="visualization-area">
        <VisualizationCanvas />
        
        {/* Toggle controls button */}
        <button 
          className="toggle-controls-button"
          onClick={() => setControlsVisible(!controlsVisible)}
        >
          {controlsVisible ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>
      
      {controlsVisible && (
        <div className="controls-panel">
          <div className="controls-section">
            <AudioControls />
          </div>
          
          <div className="controls-section">
            <VisualizationSettings />
          </div>
          
          <div className="controls-section">
            <ExportControls />
          </div>
        </div>
      )}
      

    </div>
  );
};

export default MainLayout;
