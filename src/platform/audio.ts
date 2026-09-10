type Sound = 'eat' | 'collision' | 'victory' | 'ui';
interface Voice { oscillator: OscillatorNode; gain: GainNode }

/** Small procedural cues; no audio graph is created before a user gesture. */
export class GardenAudio {
  private context: AudioContext | null = null;
  private muted = false;
  private disposed = false;
  private readonly voices = new Set<Voice>();

  unlock(): void {
    if (this.disposed || this.muted) return;
    try {
      if (!this.context) {
        if (typeof globalThis.AudioContext !== 'function') return;
        this.context = new AudioContext();
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      // Audio can be unavailable or blocked by a browser policy.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopVoices();
  }

  play(event: Sound): void {
    if (this.disposed || this.muted || this.context?.state !== 'running') return;
    switch (event) {
      case 'eat':
        this.tone(660, 880, 0.10, 0, 'sine', 0.11);
        this.tone(990, 1120, 0.13, 0.055, 'sine', 0.075);
        break;
      case 'collision':
        this.tone(240, 95, 0.30, 0, 'triangle', 0.13);
        this.tone(165, 70, 0.36, 0.07, 'sine', 0.09);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone(frequency, frequency, 0.25, index * 0.10, 'sine', 0.10);
        });
        break;
      case 'ui':
        this.tone(440, 520, 0.055, 0, 'sine', 0.055);
        break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopVoices();
    try {
      if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    } catch {
      // Context shutdown is best-effort when a page is leaving.
    }
    this.context = null;
  }

  private stopVoice(voice: Voice): void {
    this.voices.delete(voice);
    voice.oscillator.onended = null;
    try { voice.oscillator.stop(); } catch { /* Already stopped. */ }
    try { voice.oscillator.disconnect(); } catch { /* Already disconnected. */ }
    try { voice.gain.disconnect(); } catch { /* Already disconnected. */ }
  }

  private stopVoices(): void {
    for (const voice of this.voices) this.stopVoice(voice);
  }

  private tone(
    frequency: number,
    endFrequency: number,
    duration: number,
    delay: number,
    type: OscillatorType,
    volume: number,
  ): void {
    const context = this.context;
    if (!context) return;
    let voice: Voice | undefined;
    try {
      // Keep rapid input and stacked victory/eating cues bounded.
      while (this.voices.size >= 12) {
        const oldest = this.voices.values().next().value;
        if (oldest) this.stopVoice(oldest);
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      voice = { oscillator, gain };
      this.voices.add(voice);
      const started = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, started);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, started + duration);
      gain.gain.setValueAtTime(0.0001, started);
      gain.gain.exponentialRampToValueAtTime(volume, started + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, started + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      const activeVoice = voice;
      oscillator.onended = () => this.stopVoice(activeVoice);
      oscillator.start(started);
      oscillator.stop(started + duration + 0.01);
    } catch {
      if (voice) this.stopVoice(voice);
    }
  }
}
