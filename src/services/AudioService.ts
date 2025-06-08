import * as Tone from 'tone';

export enum AudioSourceType {
  FILE = 'file',
  MICROPHONE = 'microphone',
  STREAM = 'stream'
}

export interface AudioSource {
  type: AudioSourceType;
  name: string;
  source: Tone.ToneAudioNode | null;
  analyser: Tone.Analyser | null;
}

export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext;
  private toneContext: any; // Using any for Tone.Context to avoid type issues
  private currentSource: AudioSource | null = null;
  private player: Tone.Player | null = null;
  private microphone: Tone.UserMedia | null = null;
  private analyser: Tone.Analyser | null = null;
  private isPlaying: boolean = false;
  private volumeNode: Tone.Volume | null = null;
  private currentVolume: number = 1.0; // Default volume (range 0.0 to 1.0)

  private constructor() {
    this.audioContext = new AudioContext();
    this.toneContext = Tone.getContext();
    this.volumeNode = new Tone.Volume();
    this.volumeNode.toDestination();
    
    // Create analyzer with initial settings
    this.createAnalyzer(-100, -30);
  }
  
  /**
   * Create a new analyzer with the specified sensitivity settings
   * @param minDb Minimum decibel value (-100 to 0)
   * @param maxDb Maximum decibel value (-100 to 0, must be greater than minDb)
   */
  private createAnalyzer(minDb: number, maxDb: number): void {
    console.log(`Creating new analyzer with sensitivity: minDb=${minDb}, maxDb=${maxDb}`);
    
    // Disconnect and dispose of old analyzer if it exists
    if (this.analyser) {
      try {
        this.analyser.dispose();
      } catch (error) {
        console.warn('Error disposing old analyzer:', error);
      }
    }
    
    try {
      // Create new analyzer with explicit settings
      this.analyser = new Tone.Analyser({
        type: 'fft',
        size: 1024,
        smoothing: 0.8
      });
      
      // In Tone.js 14+, the actual analyzer node is accessible through the "analyser" property
      // Note: different versions of Tone.js may use different property names
      if ((this.analyser as any).analyser && typeof (this.analyser as any).analyser.minDecibels !== 'undefined') {
        // This is the actual Web Audio API AnalyserNode
        const nativeNode = (this.analyser as any).analyser;
        console.log('Found native AnalyserNode through .analyser property');
        
        // Set properties directly on the native Web Audio API node
        nativeNode.minDecibels = minDb;
        nativeNode.maxDecibels = maxDb;
        
        console.log(`Native node settings: minDecibels=${nativeNode.minDecibels}, maxDecibels=${nativeNode.maxDecibels}`);
      } 
      // Try different known paths to the analyser node
      else if ((this.analyser as any)._analyser) {
        console.log('Found native AnalyserNode through _analyser property');
        const nativeNode = (this.analyser as any)._analyser;
        nativeNode.minDecibels = minDb;
        nativeNode.maxDecibels = maxDb;
      }
      // Input.input might be the actual AnalyserNode in some Tone.js versions
      else if ((this.analyser as any).input && (this.analyser as any).input.input) {
        console.log('Found potential AnalyserNode through input.input');
        const nativeNode = (this.analyser as any).input.input;
        
        if (typeof nativeNode.minDecibels !== 'undefined') {
          nativeNode.minDecibels = minDb;
          nativeNode.maxDecibels = maxDb;
          console.log(`Set through input.input: ${nativeNode.minDecibels}, ${nativeNode.maxDecibels}`);
        }
      }
      // Last resort: try to get the internal node through the context
      else if ((this.analyser as any)._context) {
        console.log('Trying to access through _context...');
        // Just log what we find to the console for debugging
        console.log('Context:', (this.analyser as any)._context);
      } else {
        // If all else fails, dump the entire structure to console for inspection
        console.warn('Could not find the native AnalyserNode, dumping structure:');
        for (const key in this.analyser) {
          console.log(`${key}:`, (this.analyser as any)[key]);
        }
      }
      
      // Reconnect to current source if exists
      this.reconnectAudioGraph();
      
    } catch (error) {
      console.error('Error creating analyzer:', error);
    }
  }
  
  /**
   * Reconnects the audio graph when analyzer changes
   */
  private reconnectAudioGraph(): void {
    if (!this.analyser) return;
    
    try {
      // Connect to the volume node
      this.analyser.connect(this.volumeNode as Tone.Volume);
      
      // Reconnect current source if it exists
      if (this.currentSource && this.currentSource.source) {
        if (this.currentSource.type === AudioSourceType.FILE || 
            this.currentSource.type === AudioSourceType.STREAM) {
          if (this.player) {
            this.player.connect(this.analyser as Tone.ToneAudioNode);
            this.currentSource.analyser = this.analyser;
          }
        } else if (this.currentSource.type === AudioSourceType.MICROPHONE) {
          if (this.microphone) {
            this.microphone.connect(this.analyser as Tone.ToneAudioNode);
            this.currentSource.analyser = this.analyser;
          }
        }
      }
    } catch (error) {
      console.error('Error reconnecting audio graph:', error);
    }
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public async loadAudioFile(file: File): Promise<AudioSource> {
    try {
      // Stop any current playback
      await this.stop();

      // Create a new player
      this.player = new Tone.Player({
        url: URL.createObjectURL(file),
        autostart: false,
        loop: false,
      }).toDestination();

      // Connect to analyzer
      this.player.connect(this.analyser as Tone.ToneAudioNode);

      // Create and return the audio source
      this.currentSource = {
        type: AudioSourceType.FILE,
        name: file.name,
        source: this.player,
        analyser: this.analyser
      };

      return this.currentSource;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  public async initMicrophone(): Promise<AudioSource> {
    try {
      // Stop any current playback
      await this.stop();

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support audio input');
      }

      // Request microphone permissions first to get a more specific error if denied
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create a new microphone input
      this.microphone = new Tone.UserMedia();
      await this.microphone.open();
      this.microphone.connect(this.analyser as Tone.ToneAudioNode);
      this.microphone.toDestination();

      // Create and return the audio source
      this.currentSource = {
        type: AudioSourceType.MICROPHONE,
        name: 'Microphone Input',
        source: this.microphone,
        analyser: this.analyser
      };

      this.isPlaying = true;
      return this.currentSource;
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      // Provide more specific error messages based on the error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone access denied. Please grant permission in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Microphone is in use by another application. Please close other applications and try again.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Microphone constraints cannot be satisfied. Please try a different microphone.');
      } else if (error.name === 'TypeError' && error.message.includes('getUserMedia')) {
        throw new Error('Browser security requires HTTPS for microphone access.');
      } else {
        throw new Error(`Could not access microphone: ${error.message || 'Unknown error'}`);
      }
    }
  }

  public async loadStreamUrl(url: string): Promise<AudioSource> {
    try {
      // Stop any current playback
      await this.stop();

      // Create a new player for streaming
      this.player = new Tone.Player({
        url: url,
        autostart: false,
        loop: false,
      });

      // Connect player to volume node and then to analyzer
      this.player.connect(this.volumeNode as Tone.Volume);
      this.volumeNode?.connect(this.analyser as Tone.Analyser);
      
      // Apply current volume setting
      this.setVolume(this.currentVolume);

      // Create and return the audio source
      this.currentSource = {
        type: AudioSourceType.STREAM,
        name: 'Audio Stream',
        source: this.player,
        analyser: this.analyser
      };

      return this.currentSource;
    } catch (error) {
      console.error('Error loading audio stream:', error);
      throw error;
    }
  }

  public async play(): Promise<void> {
    if (!this.currentSource || this.isPlaying) return;

    try {
      await Tone.start();
      
      if (this.currentSource.type === AudioSourceType.FILE || 
          this.currentSource.type === AudioSourceType.STREAM) {
        if (this.player) {
          await this.player.start();
        }
      }

      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (!this.currentSource || !this.isPlaying) return;

    try {
      if (this.currentSource.type === AudioSourceType.FILE || 
          this.currentSource.type === AudioSourceType.STREAM) {
        if (this.player) {
          this.player.stop();
        }
      }

      this.isPlaying = false;
    } catch (error) {
      console.error('Error pausing audio:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.currentSource) return;

    try {
      if (this.currentSource.type === AudioSourceType.FILE || 
          this.currentSource.type === AudioSourceType.STREAM) {
        if (this.player) {
          this.player.stop();
          this.player.disconnect();
        }
      } else if (this.currentSource.type === AudioSourceType.MICROPHONE) {
        if (this.microphone) {
          this.microphone.close();
          this.microphone.disconnect();
        }
      }

      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping audio:', error);
      throw error;
    }
  }

  // Set volume level (0.0 to 1.0)
  public setVolume(volume: number): void {
    if (!this.volumeNode) {
      console.log('No volume node available');
      return;
    }
    
    try {
      // Clamp volume to valid range
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.currentVolume = clampedVolume;
      
      // Convert to decibels (0 = 0dB, 0.5 = -6dB, 0 = -Infinity dB)
      let decibelValue = -70; // Near-mute for zero
      
      if (clampedVolume > 0) {
        // Map 0-1 to -40dB to 0dB logarithmically
        decibelValue = 20 * Math.log10(clampedVolume);
      }
      
      this.volumeNode.volume.value = decibelValue;
      console.log(`Volume set to ${clampedVolume.toFixed(2)} (${decibelValue.toFixed(1)}dB)`);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }
  
  // Get current volume level (0.0 to 1.0)
  public getVolume(): number {
    return this.currentVolume;
  }

  public getAnalyser(): Tone.Analyser | null {
    return this.analyser;
  }

  public getCurrentSource(): AudioSource | null {
    return this.currentSource;
  }
  
  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
  
  public setAnalyzerSensitivity(minDb: number, maxDb: number): void {
    console.log(`Setting analyzer sensitivity to: minDb=${minDb}, maxDb=${maxDb}`);
    
    if (!this.analyser) {
      console.warn('No analyzer available to update sensitivity');
      this.createAnalyzer(minDb, maxDb);
      return;
    }
    
    try {
      // Try to directly access and modify the native Web Audio AnalyserNode
      // based on several known property locations in different Tone.js versions
      let success = false;
      
      // Try direct property access on Tone.js Analyser - newer versions (Tone.js 14.x+)
      if ((this.analyser as any).analyser && typeof (this.analyser as any).analyser.minDecibels !== 'undefined') {
        const nativeNode = (this.analyser as any).analyser;
        nativeNode.minDecibels = minDb;
        nativeNode.maxDecibels = maxDb;
        console.log(`Updated native node through .analyser: min=${nativeNode.minDecibels}, max=${nativeNode.maxDecibels}`);
        success = true;
      } 
      // Try older Tone.js versions - might use _analyser
      else if ((this.analyser as any)._analyser) {
        const nativeNode = (this.analyser as any)._analyser;
        nativeNode.minDecibels = minDb;
        nativeNode.maxDecibels = maxDb;
        console.log(`Updated native node through ._analyser: min=${nativeNode.minDecibels}, max=${nativeNode.maxDecibels}`);
        success = true;
      }
      // Try accessing through input chain
      else if ((this.analyser as any).input && 
               ((this.analyser as any).input.input || (this.analyser as any).input._nativeAudioNode)) {
        const nativeNode = (this.analyser as any).input.input || (this.analyser as any).input._nativeAudioNode;
        if (typeof nativeNode.minDecibels !== 'undefined') {
          nativeNode.minDecibels = minDb;
          nativeNode.maxDecibels = maxDb;
          console.log(`Updated through input: min=${nativeNode.minDecibels}, max=${nativeNode.maxDecibels}`);
          success = true;
        }
      }
      
      // If none of the direct approaches worked, recreate the analyzer
      if (!success) {
        console.log('Direct property access failed, recreating analyzer with new settings');
        this.createAnalyzer(minDb, maxDb);
      }
      
      // Always get the current state for verification
      try {
        // Attempt to read the values we just set (for logging only)
        // Try multiple known property paths
        const paths = ['analyser', '_analyser', 'input.input', 'input._nativeAudioNode'];
        
        for (const path of paths) {
          try {
            const parts = path.split('.');
            let obj: any = this.analyser;
            
            for (const part of parts) {
              obj = obj?.[part];
              if (!obj) break;
            }
            
            if (obj && typeof obj.minDecibels !== 'undefined') {
              console.log(`Verification - ${path}: minDecibels=${obj.minDecibels}, maxDecibels=${obj.maxDecibels}`);
            }
          } catch (e) {}
        }
      } catch (e) {}
    } catch (error) {
      console.error('Error setting analyzer sensitivity:', error);
    }
  }

  public isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  public getAudioContext(): AudioContext {
    return this.audioContext;
  }

  public getToneContext(): Tone.Context {
    return this.toneContext;
  }
  
  // Get current playback time in seconds
  public getCurrentTime(): number | null {
    if (!this.player || !this.isPlaying) {
      return null;
    }
    
    try {
      // Access currentTime property instead of progress
      return this.player.toSeconds(this.player.now());
    } catch (error) {
      console.error('Error getting current time:', error);
      return null;
    }
  }
  
  // Get total duration in seconds
  public getDuration(): number | null {
    if (!this.player || !this.player.buffer) {
      return null;
    }
    
    try {
      return this.player.buffer.duration;
    } catch (error) {
      console.error('Error getting duration:', error);
      return null;
    }
  }
  
  // Seek to a specific position in seconds
  public seekTo(seconds: number): void {
    if (!this.player) {
      console.log('No player available for seeking');
      return;
    }
    
    try {
      // Make sure seconds is within valid range
      const duration = this.getDuration() || 0;
      const validPosition = Math.max(0, Math.min(seconds, duration));
      
      this.player.seek(validPosition);
      console.log(`Seeking to ${validPosition.toFixed(2)} seconds`);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  // Get frequency data for visualization
  public getFrequencyData(): Float32Array | null {
    if (!this.analyser) {
      console.log('No analyzer available for frequency data');
      return null;
    }
    
    try {
      // Log current analyser settings if available
      const analyserNode = (this.analyser as any)._node;
      if (analyserNode) {
        console.log(`[getFrequencyData] Current analyser settings: minDecibels=${analyserNode.minDecibels}, maxDecibels=${analyserNode.maxDecibels}`);
      } else {
        console.log('[getFrequencyData] Could not access underlying AnalyserNode');
      }
      
      // Ensure analyzer is in FFT mode
      if (this.analyser.type !== 'fft') {
        this.analyser.set({ type: 'fft' });
      }
      
      const data = this.analyser.getValue() as Float32Array;
      
      // Log sample data for debugging (first, middle, last)
      if (data && data.length > 0) {
        const mid = Math.floor(data.length / 2);
        const last = data.length - 1;
        console.log(`FFT data samples: [0]=${data[0].toFixed(4)}, [${mid}]=${data[mid].toFixed(4)}, [${last}]=${data[last].toFixed(4)}`);
      } else {
        console.log('Empty FFT data received');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting frequency data:', error);
      return null;
    }
  }

  // Get waveform data for visualization
  public getWaveformData(): Float32Array | null {
    if (!this.analyser) {
      console.log('No analyzer available for waveform data');
      return null;
    }
    
    try {
      // Log current analyser settings if available
      const analyserNode = (this.analyser as any)._node;
      if (analyserNode) {
        console.log(`[getWaveformData] Before switch: minDecibels=${analyserNode.minDecibels}, maxDecibels=${analyserNode.maxDecibels}`);
      }
      
      // Switch analyzer to waveform mode temporarily
      this.analyser.set({ type: 'waveform' });
      
      // Log after switching to waveform mode
      if (analyserNode) {
        console.log(`[getWaveformData] After switch to waveform: minDecibels=${analyserNode.minDecibels}, maxDecibels=${analyserNode.maxDecibels}`);
      }
      
      const waveformData = this.analyser.getValue() as Float32Array;
      
      // Switch back to FFT mode
      this.analyser.set({ type: 'fft' });
      
      // Log sample data for debugging (first, middle, last)
      if (waveformData && waveformData.length > 0) {
        const mid = Math.floor(waveformData.length / 2);
        const last = waveformData.length - 1;
        console.log(`Waveform samples: [0]=${waveformData[0].toFixed(4)}, [${mid}]=${waveformData[mid].toFixed(4)}, [${last}]=${waveformData[last].toFixed(4)}`);
      } else {
        console.log('Empty waveform data received');
      }
      
      return waveformData;
    } catch (error) {
      console.error('Error getting waveform data:', error);
      return null;
    }
  }

  // Detect beats in the audio
  public detectBeat(threshold: number = 0.15): boolean {
    const frequencyData = this.getFrequencyData();
    if (!frequencyData) return false;
    
    // Focus on bass frequencies (typically where beats are most prominent)
    const bassRange = frequencyData.slice(0, 10);
    const average = bassRange.reduce((sum, value) => sum + Math.abs(value), 0) / bassRange.length;
    
    return average > threshold;
  }
}
