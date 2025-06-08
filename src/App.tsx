import React from 'react';
import { AudioProvider } from './contexts/AudioContext';
import { VisualizationProvider } from './contexts/VisualizationContext';
import MainLayout from './components/ui/MainLayout';
import './App.css';

function App() {
  return (
    <AudioProvider>
      <VisualizationProvider>
        <MainLayout />
      </VisualizationProvider>
    </AudioProvider>
  );
}

export default App;
