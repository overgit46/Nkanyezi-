class SoundController {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delaySec = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const variance = 1 + (Math.random() - 0.5) * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * variance, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playTilePlace(isX: boolean) {
    this.playTone(isX ? 520 : 440, 0.11, 'triangle', 0.09);
  }

  playCardSnap() {
    this.playTone(640, 0.08, 'triangle', 0.08);
    this.playTone(320, 0.06, 'sine', 0.05, 0.02);
  }

  playCardDraw() {
    this.playTone(390, 0.09, 'sine', 0.06);
  }

  playWildSuit() {
    this.playTone(523.25, 0.1, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.08, 0.07);
    this.playTone(783.99, 0.16, 'triangle', 0.09, 0.14);
  }

  playWinFanfare() {
    this.playTone(523.25, 0.14, 'triangle', 0.09, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.09, 0.1);
    this.playTone(783.99, 0.14, 'triangle', 0.09, 0.2);
    this.playTone(1046.5, 0.28, 'sine', 0.11, 0.3);
  }

  playSwapChime() {
    this.playTone(587.33, 0.12, 'sine', 0.08, 0);
    this.playTone(880, 0.18, 'sine', 0.08, 0.09);
  }
}

export const gameAudio = new SoundController();
