import React, { useState } from 'react';
import './VisualizationSettings.css';
import { 
  useVisualization, 
  VisualizationType, 
  CanvasOrientation,
  ColorScheme
} from '../../contexts/VisualizationContext';
import { AudioService } from '../../services/AudioService';

const VisualizationSettings: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    savePreset, 
    loadPreset, 
    availablePresets,
    colorSchemes
  } = useVisualization();
  
  const [presetName, setPresetName] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);


  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (presetName.trim()) {
      savePreset(presetName);
      setPresetName('');
    }
  };

  const handleResolutionChange = (width: number, height: number) => {
    updateSettings({ resolution: { width, height } });
  };

  const handleColorSchemeChange = (schemeId: string) => {
    const scheme = colorSchemes.find(s => s.id === schemeId);
    if (scheme) {
      updateSettings({ colorScheme: scheme });
    }
  };

  return (
    <div className={`visualization-settings ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="header">
        <h3>Visualization Settings</h3>
        <button 
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="settings-content">
          {/* Interface Mode at the Top */}
          <div className="settings-section">
            <h4>Interface Mode</h4>
            <div className="button-group">
              <button 
                className={settings.isSimpleMode ? 'active' : ''}
                onClick={() => updateSettings({ isSimpleMode: true })}
              >
                Simple
              </button>
              <button 
                className={!settings.isSimpleMode ? 'active' : ''}
                onClick={() => updateSettings({ isSimpleMode: false })}
              >
                Advanced
              </button>
            </div>
          </div>
          <div className="settings-section">
            <h4>Visualization Type</h4>
            <div className="button-group">
              <button 
                className={settings.type === VisualizationType.BARS_2D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.BARS_2D })}
              >
                Frequency Bars
              </button>
              <button 
                className={settings.type === VisualizationType.WAVEFORM_2D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.WAVEFORM_2D })}
              >
                Waveform
              </button>
              <button 
                className={settings.type === VisualizationType.CIRCULAR ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.CIRCULAR })}
              >
                Circular
              </button>
              <button 
                className={settings.type === VisualizationType.ASTEROIDS_2D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.ASTEROIDS_2D })}
              >
                Asteroids 2D
              </button>
            </div>
            <div className="button-group">
              <button 
                className={settings.type === VisualizationType.PARTICLES_3D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.PARTICLES_3D })}
              >
                3D Particles
              </button>
              <button 
                className={settings.type === VisualizationType.GEOMETRIC_3D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.GEOMETRIC_3D })}
              >
                3D Geometric
              </button>
              <button 
                className={settings.type === VisualizationType.ASTEROIDS_3D ? 'active' : ''}
                onClick={() => updateSettings({ type: VisualizationType.ASTEROIDS_3D })}
              >
                Asteroids 3D
              </button>
            </div>
          </div>

          {/* Sensitivity Section moved here */}
          <div className="settings-section">
            <div className="sensitivity-header">
              <h4>Sensitivity</h4>
              <span className="sensitivity-value">{settings.sensitivity}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sensitivity}
              onChange={(e) => {
                const sensitivity = parseInt((e.target as HTMLInputElement).value, 10);
                updateSettings({ sensitivity });
                // Update analyzer sensitivity in real-time
                const audioService = AudioService.getInstance();
                // Map sensitivity slider (0-100) to analyzer ranges (-100 to -30 dB) for minDb
                // and (-30 to 0 dB) for maxDb
                const minDb = -100 + (70 * sensitivity / 100); // -100 to -30
                const maxDb = -30 + (30 * sensitivity / 100);  // -30 to 0
                audioService.setAnalyzerSensitivity(minDb, maxDb);
              }}
              onInput={(e) => {
                const sensitivity = parseInt((e.target as HTMLInputElement).value, 10);
                updateSettings({ sensitivity });
                // Update analyzer sensitivity in real-time
                const audioService = AudioService.getInstance();
                const minDb = -100 + (70 * sensitivity / 100); // -100 to -30
                const maxDb = -30 + (30 * sensitivity / 100);  // -30 to 0
                audioService.setAnalyzerSensitivity(minDb, maxDb);
              }}
              className="settings-slider"
            />
            <div className="range-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Orientation</h4>
            <div className="button-group">
              <button 
                className={settings.orientation === CanvasOrientation.HORIZONTAL ? 'active' : ''}
                onClick={() => updateSettings({ orientation: CanvasOrientation.HORIZONTAL })}
              >
                Horizontal
              </button>
              <button 
                className={settings.orientation === CanvasOrientation.VERTICAL ? 'active' : ''}
                onClick={() => updateSettings({ orientation: CanvasOrientation.VERTICAL })}
              >
                Vertical
              </button>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Resolution</h4>
            <div className="button-group">
              <button 
                className={settings.resolution.width === 1280 && settings.resolution.height === 720 ? 'active' : ''}
                onClick={() => handleResolutionChange(1280, 720)}
              >
                720p
              </button>
              <button 
                className={settings.resolution.width === 1920 && settings.resolution.height === 1080 ? 'active' : ''}
                onClick={() => handleResolutionChange(1920, 1080)}
              >
                1080p
              </button>
              <button 
                className={settings.resolution.width === 720 && settings.resolution.height === 1280 ? 'active' : ''}
                onClick={() => handleResolutionChange(720, 1280)}
              >
                Vertical 720p
              </button>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Frame Rate</h4>
            <div className="button-group">
              <button 
                className={settings.frameRate === 30 ? 'active' : ''}
                onClick={() => updateSettings({ frameRate: 30 })}
              >
                30 FPS
              </button>
              <button 
                className={settings.frameRate === 60 ? 'active' : ''}
                onClick={() => updateSettings({ frameRate: 60 })}
              >
                60 FPS
              </button>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Color Scheme</h4>
            <select 
              value={settings.colorScheme.id}
              onChange={(e) => handleColorSchemeChange(e.target.value)}
              className="select-input"
            >
              {colorSchemes.map(scheme => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
            
            <div className="color-preview">
              {settings.colorScheme.colors.map((color, index) => (
                <div 
                  key={index}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          


          {/* Advanced Controls: show only in Advanced mode, always visible */}
          {settings.isSimpleMode ? (
            // Simple mode: show Sensitivity only
            <div className="settings-section">
              <div className="sensitivity-header">
                <h4>Sensitivity</h4>
                <span className="sensitivity-value">{settings.sensitivity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sensitivity}
                onChange={(e) => {
                  const sensitivity = parseInt((e.target as HTMLInputElement).value, 10);
                  updateSettings({ sensitivity });
                  const audioService = AudioService.getInstance();
                  const minDb = -100 + (70 * sensitivity / 100); // -100 to -30
                  const maxDb = -30 + (30 * sensitivity / 100);  // -30 to 0
                  audioService.setAnalyzerSensitivity(minDb, maxDb);
                }}
                onInput={(e) => {
                  const sensitivity = parseInt((e.target as HTMLInputElement).value, 10);
                  updateSettings({ sensitivity });
                  const audioService = AudioService.getInstance();
                  const minDb = -100 + (70 * sensitivity / 100); // -100 to -30
                  const maxDb = -30 + (30 * sensitivity / 100);  // -30 to 0
                  audioService.setAnalyzerSensitivity(minDb, maxDb);
                }}
                className="settings-slider"
              />
              <div className="range-labels">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          ) : (
            // Advanced mode: show advanced controls, hide Sensitivity
            <div className="settings-section advanced-controls">
              <h4>Advanced Controls</h4>
              <div className="advanced-slider-group">
                <label htmlFor="wavelengthSize-slider">Wavelength Size: <span>{settings.wavelengthSize}</span></label>
                <input
                  id="wavelengthSize-slider"
                  type="range"
                  min="128"
                  max="2048"
                  step="8"
                  value={settings.wavelengthSize}
                  onChange={e => updateSettings({ wavelengthSize: parseInt(e.target.value, 10) })}
                  className="settings-slider"
                />
              </div>
              <div className="advanced-slider-group">
                <label htmlFor="numFrequencyBands-slider">Frequency Bands: <span>{settings.numFrequencyBands}</span></label>
                <input
                  id="numFrequencyBands-slider"
                  type="range"
                  min="4"
                  max="12"
                  step="1"
                  value={settings.numFrequencyBands}
                  onChange={e => updateSettings({ numFrequencyBands: parseInt(e.target.value, 10) })}
                  className="settings-slider"
                />
              </div>
            </div>
          )}
          
          
          <div className="settings-section">
            <h4>Presets</h4>
            {availablePresets.length > 0 ? (
              <select 
                onChange={(e) => loadPreset(e.target.value)}
                className="select-input"
                defaultValue=""
              >
                <option value="" disabled>Load a preset</option>
                {availablePresets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="no-presets">No saved presets</p>
            )}
            
            <form onSubmit={handleSavePreset} className="save-preset-form">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="preset-input"
              />
              <button type="submit" className="save-button">Save</button>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default VisualizationSettings;
