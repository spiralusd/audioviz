import React, { createContext, useContext, useState, ReactNode } from 'react';

export enum VisualizationType {
  BARS_2D = 'bars_2d',
  WAVEFORM_2D = 'waveform_2d',
  CIRCULAR = 'circular',
  PARTICLES_3D = 'particles_3d',
  GEOMETRIC_3D = 'geometric_3d',
  ASTEROIDS_2D = 'asteroids_2d',
  ASTEROIDS_3D = 'asteroids_3d'
}

export enum CanvasOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: string[];
}

export interface VisualizationSettings {
  // Advanced controls for waveform and bars
  wavelengthSize: number; // Number of waveform samples to display (e.g. 128-2048)
  numFrequencyBands: number; // Number of frequency bands for bars (4-12)
  type: VisualizationType;
  visualizationType: VisualizationType; // Alias for type to maintain compatibility
  resolution: { width: number; height: number };
  width: number;
  height: number;
  orientation: CanvasOrientation;
  frameRate: 30 | 60;
  colorScheme: ColorScheme;
  sensitivity: number;
  showControls: boolean;
  isSimpleMode: boolean;
  
  // Bar visualization settings
  barWidth: number;
  barSpacing: number;
  amplification: number;
  
  // Color settings
  primaryColor: string;
  secondaryColor: string;
  useGradient: boolean;
  
  // Line settings
  lineWidth: number;
  
  // Effect settings
  useGlow: boolean;
  glowIntensity: number;
  useRotation: boolean;
  rotationSpeed: number;
}

interface VisualizationContextProps {
  settings: VisualizationSettings;
  updateSettings: (newSettings: Partial<VisualizationSettings>) => void;
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  availablePresets: { id: string; name: string }[];
  colorSchemes: ColorScheme[];
}

const defaultColorSchemes: ColorScheme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#aa00ff', '#00ff99']
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#ffffff', '#dddddd', '#bbbbbb', '#999999', '#777777', '#555555']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#ff7700', '#ff5500', '#ff0077', '#ffaa00', '#ff0000', '#ff9900']
  }
];

const defaultSettings: VisualizationSettings = {
  type: VisualizationType.BARS_2D,
  visualizationType: VisualizationType.BARS_2D,
  resolution: { width: 1280, height: 720 },
  width: 1280,
  height: 720,
  orientation: CanvasOrientation.HORIZONTAL,
  frameRate: 60,
  colorScheme: defaultColorSchemes[0],
  sensitivity: 1.0,
  showControls: true,
  isSimpleMode: true,
  
  // Bar visualization settings
  barWidth: 5,
  barSpacing: 2,
  amplification: 1.5,
  
  // Color settings
  primaryColor: defaultColorSchemes[0].colors[0],
  secondaryColor: defaultColorSchemes[0].colors[1],
  useGradient: true,
  
  // Line settings
  lineWidth: 2,
  
  // Effect settings
  useGlow: false,
  glowIntensity: 5,
  useRotation: false,
  rotationSpeed: 0.5,
  wavelengthSize: 1024, // Default for waveform
  numFrequencyBands: 8 // Default for bars
};

const VisualizationContext = createContext<VisualizationContextProps | undefined>(undefined);

export const useVisualization = (): VisualizationContextProps => {
  const context = useContext(VisualizationContext);
  if (!context) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
};

interface VisualizationProviderProps {
  children: ReactNode;
}

export const VisualizationProvider: React.FC<VisualizationProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<VisualizationSettings>(defaultSettings);
  const [presets, setPresets] = useState<{ id: string; name: string; settings: VisualizationSettings }[]>([]);
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>(defaultColorSchemes);

  const updateSettings = (updates: Partial<VisualizationSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  const savePreset = (name: string) => {
    const newPreset = {
      id: `preset-${Date.now()}`,
      name,
      settings: { ...settings }
    };
    
    setPresets(prevPresets => [...prevPresets, newPreset]);
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSettings(preset.settings);
    }
  };

  // Add a new color scheme
  const addColorScheme = (name: string, colors: string[]) => {
    const newScheme = {
      id: `scheme-${Date.now()}`,
      name,
      colors
    };
    
    setColorSchemes(prevSchemes => [...prevSchemes, newScheme]);
    return newScheme;
  };

  const value = {
    settings,
    updateSettings,
    savePreset,
    loadPreset,
    availablePresets: presets.map(p => ({ id: p.id, name: p.name })),
    colorSchemes
  };

  return <VisualizationContext.Provider value={value}>{children}</VisualizationContext.Provider>;
};
