export type AlertLevel = "paused" | "final_warning" | "ended";

// Escalate cadence and pitch at a bounded gain; never change device volume.
export const ALERT_PATTERN = {
  paused: { pulses: 1, frequency: 660, gain: 0.035, repeatMs: 2500 },
  final_warning: { pulses: 3, frequency: 880, gain: 0.06, repeatMs: 1200 },
  ended: { pulses: 3, frequency: 440, gain: 0.045, repeatMs: 0 },
} as const;

export class InterviewAlertAudio {
  private context: AudioContext | null = null;
  private nodes = new Set<OscillatorNode>();

  async arm() {
    // Called synchronously from a click/key gesture, including the start click.
    const ctx = this.context ?? new AudioContext();
    this.context = ctx;
    await ctx.resume();
    if (this.context !== ctx || ctx.state !== "running") throw Error("Audio unavailable");
  }

  play(level: AlertLevel) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") throw Error("Audio unavailable");
    const pattern = ALERT_PATTERN[level];
    for (let pulse = 0; pulse < pattern.pulses; pulse++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + pulse * 0.24;
      oscillator.frequency.value = pattern.frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(pattern.gain, at + 0.02);
      gain.gain.linearRampToValueAtTime(0, at + 0.16);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      this.nodes.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.nodes.delete(oscillator);
      };
      oscillator.start(at);
      oscillator.stop(at + 0.18);
    }
  }

  silence() {
    for (const oscillator of this.nodes) {
      try { oscillator.stop(); } catch { /* Already ended. */ }
      oscillator.disconnect();
    }
    this.nodes.clear();
  }

  close() {
    this.silence();
    const ctx = this.context;
    this.context = null;
    if (ctx) void ctx.close().catch(() => {});
  }
}
