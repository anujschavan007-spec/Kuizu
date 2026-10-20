// Game Background Music Manager (BGM)
// Plays Guardians of the Globe Orchestral Soundtrack during game sessions (Quizzes, Battles, Daily Kuizu)
// Volume & Enabled state are managed via Admin Settings and synced across user pages

class SoundManager {
  private audio: HTMLAudioElement | null = null;
  private volume: number = 0.5; // default 50%
  private enabled: boolean = true;
  private isPlaying: boolean = false;
  private fadeInterval: number | undefined;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.audio) {
      // 1. Create Audio instance
      this.audio = new Audio('/audio/game-bgm.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
    }

    // 2. Load from localStorage first (0ms latency)
    const savedVol = localStorage.getItem('kuizu_bgm_volume');
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed)) {
        this.volume = Math.max(0, Math.min(1, parsed));
      }
    }

    const savedEnabled = localStorage.getItem('kuizu_bgm_enabled');
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }

    if (this.audio) {
      this.audio.volume = this.volume;
    }

    // 3. Asynchronously fetch the latest admin settings from the backend
    await this.syncFromServer();
  }

  public async syncFromServer() {
    try {
      const res = await fetch('/api/settings/audio');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof data.bgmVolume === 'number') {
            this.volume = Math.max(0, Math.min(1, data.bgmVolume));
            localStorage.setItem('kuizu_bgm_volume', String(this.volume));
            if (this.audio && !this.fadeInterval) {
              this.audio.volume = this.volume;
            }
          }
          if (typeof data.bgmEnabled === 'boolean') {
            this.enabled = data.bgmEnabled;
            localStorage.setItem('kuizu_bgm_enabled', String(this.enabled));
            if (!this.enabled && this.isPlaying) {
              this.pauseGameBgm();
            }
          }
        }
      }
    } catch {
      // Offline fallback: localStorage is already loaded
    }
  }

  /**
   * Save current audio settings to backend & localStorage
   */
  public async saveSettings(): Promise<void> {
    localStorage.setItem('kuizu_bgm_volume', String(this.volume));
    localStorage.setItem('kuizu_bgm_enabled', String(this.enabled));

    try {
      await fetch('/api/settings/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bgmEnabled: this.enabled, bgmVolume: this.volume })
      });
    } catch (err) {
      console.warn('Failed to save audio settings to server:', err);
    }
  }

  /**
   * Play game background music
   */
  public async playGameBgm(): Promise<boolean> {
    if (!this.audio) {
      this.audio = new Audio('/audio/game-bgm.mp3');
      this.audio.loop = true;
    }

    if (!this.enabled) return false;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = undefined;
    }

    this.audio.volume = this.volume;

    try {
      await this.audio.play();
      this.isPlaying = true;
      return true;
    } catch (err: any) {
      // Browser autoplay policy might reject without user gesture
      if (err.name === 'NotAllowedError') {
        const onFirstInteraction = () => {
          if (this.enabled && this.audio) {
            this.audio.play().then(() => {
              this.isPlaying = true;
            }).catch(() => {});
          }
          window.removeEventListener('click', onFirstInteraction);
          window.removeEventListener('keydown', onFirstInteraction);
        };
        window.addEventListener('click', onFirstInteraction, { once: true });
        window.addEventListener('keydown', onFirstInteraction, { once: true });
      }
      return false;
    }
  }

  /**
   * Pause background music
   */
  public pauseGameBgm(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = undefined;
    }
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Stop background music and reset track position
   */
  public stopGameBgm(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = undefined;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Smoothly fade out BGM over durationMs
   */
  public fadeOutGameBgm(durationMs = 600): void {
    if (!this.audio || !this.isPlaying) return;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const startVol = this.audio.volume;
    const steps = 15;
    const stepTime = durationMs / steps;
    const volStep = startVol / steps;
    let currentStep = 0;

    this.fadeInterval = window.setInterval(() => {
      currentStep++;
      if (!this.audio) {
        clearInterval(this.fadeInterval);
        return;
      }

      const nextVol = Math.max(0, startVol - (volStep * currentStep));
      this.audio.volume = nextVol;

      if (currentStep >= steps || nextVol <= 0.01) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = undefined;
        this.audio.pause();
        this.audio.volume = this.volume; // restore base volume for next play
        this.isPlaying = false;
      }
    }, stepTime);
  }

  /**
   * Update master volume (0.0 to 1.0)
   */
  public setBgmVolume(newVolume: number, persistToServer = true): void {
    this.volume = Math.max(0, Math.min(1, newVolume));
    localStorage.setItem('kuizu_bgm_volume', String(this.volume));

    if (this.audio && !this.fadeInterval) {
      this.audio.volume = this.volume;
    }

    if (persistToServer) {
      fetch('/api/settings/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bgmEnabled: this.enabled, bgmVolume: this.volume })
      }).catch(() => {});
    }
  }

  /**
   * Get current master volume (0.0 to 1.0)
   */
  public getBgmVolume(): number {
    return this.volume;
  }

  /**
   * Enable or disable BGM
   */
  public setBgmEnabled(enabled: boolean, persistToServer = true): void {
    this.enabled = enabled;
    localStorage.setItem('kuizu_bgm_enabled', String(this.enabled));

    if (!this.enabled) {
      this.pauseGameBgm();
    }

    if (persistToServer) {
      fetch('/api/settings/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bgmEnabled: this.enabled, bgmVolume: this.volume })
      }).catch(() => {});
    }
  }

  public isBgmEnabled(): boolean {
    return this.enabled;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundManager = new SoundManager();
