export class BirthdayAudio {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.enabled = false;
    this.available = true;
    this.stage = "gift";
    this.nextNote = 0;
    this.noteIndex = 0;
    this.nodes = new Set();
    this.file = null;
    this.noise = null;
    this.playRequest = 0;
    this.fileUnavailable = false;
  }

  async enable() {
    const request = ++this.playRequest;
    this.enabled = true;
    try {
      if (!this.context) this.initialize();
      await this.context.resume();
      if (request !== this.playRequest || !this.enabled || document.hidden)
        return false;
      this.available = true;
      this.nextNote = this.context.currentTime + 0.06;
      if (this.config.musicFile && !this.fileUnavailable) {
        if (!this.file) {
          this.file = new Audio(this.config.musicFile);
          this.file.loop = true;
          this.file.volume = this.config.volume;
        }
        try {
          await this.file.play();
        } catch {
          if (request !== this.playRequest) return false;
          this.file.pause();
          this.file = null;
          this.fileUnavailable = true;
        }
      }
    } catch {
      if (request === this.playRequest) {
        this.available = false;
        this.enabled = false;
      }
    }
    return this.enabled;
  }

  initialize() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio || new URLSearchParams(location.search).has("noaudio"))
      throw new Error("Audio unavailable");
    this.context = new Audio();
    this.master = this.context.createGain();
    this.master.gain.value = this.config.volume;
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    this.master.connect(compressor);
    compressor.connect(this.context.destination);
    const delay = this.context.createDelay(1);
    delay.delayTime.value = 0.28;
    const feedback = this.context.createGain();
    feedback.gain.value = 0.2;
    const wet = this.context.createGain();
    wet.gain.value = 0.16;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    this.delay = delay;
    this.permanent = [this.master, compressor, delay, feedback, wet];
    this.noise = this.context.createBuffer(
      1,
      this.context.sampleRate * 2,
      this.context.sampleRate,
    );
    const samples = this.noise.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      smooth = (smooth + (Math.random() * 2 - 1) * 0.07) / 1.07;
      samples[i] = smooth * 3.5;
    }
  }

  track(source, gain, filter) {
    this.nodes.add(source);
    source.onended = () => {
      this.nodes.delete(source);
      source.disconnect();
      gain.disconnect();
      filter?.disconnect();
    };
  }

  tone(frequency, when, duration, volume = 0.16, type = "sine", endFrequency) {
    if (!this.enabled || this.context?.state !== "running") return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        when + duration,
      );
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    gain.connect(this.delay);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
    this.track(oscillator, gain);
  }

  chime(index) {
    if (!this.enabled || this.context?.state !== "running") return;
    const now = this.context.currentTime;
    if (this.lastChime !== undefined && now - this.lastChime < 0.045) return;
    this.lastChime = now;
    const hz = [523.25, 659.25, 783.99][index] || 523.25;
    this.tone(hz, now, 1.35, 0.18);
    this.tone(hz * 2, now, 0.72, 0.058);
    this.tone(hz * 3, now + 0.008, 0.35, 0.025);
  }

  softNoise(duration, volume, cutoff) {
    if (!this.enabled || this.context?.state !== "running") return;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.03);
    this.track(source, gain, filter);
  }

  effect(kind) {
    if (!this.enabled || this.context?.state !== "running") return;
    const t = this.context.currentTime;
    if (kind === "open") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone(f, t + i * 0.09, 1.2, 0.18),
      );
      this.softNoise(0.6, 0.08, 1400);
    } else if (kind === "blow") {
      this.softNoise(0.8, 0.15, 1800);
    } else if (kind === "rise") {
      [659, 784, 988, 1318].forEach((f, i) =>
        this.tone(f, t + i * 0.14, 0.9, 0.13),
      );
    } else if (kind === "burst") {
      if (t - (this.lastBurst || -1) < 0.13) return;
      this.lastBurst = t;
      this.softNoise(0.6, 0.35, 420);
      this.tone(80 + Math.random() * 24, t, 0.4, 0.24, "sine", 32);
    } else if (kind === "launch") {
      if (t - (this.lastLaunch || -1) < 0.2) return;
      this.lastLaunch = t;
      this.tone(160, t, 0.45, 0.025, "triangle", 670);
    } else {
      this.tone(880, t, 0.12, 0.07);
    }
  }

  update(stage) {
    this.stage = stage;
    if (!this.enabled || this.context?.state !== "running" || this.file) return;
    const t = this.context.currentTime;
    if (this.nextNote < t - 1) this.nextNote = t + 0.05;
    const interval =
      stage === "fireworks" ? 0.61 : stage === "blow" ? 1.1 : 0.8;
    while (this.nextNote < t + 0.16) {
      const midi =
        this.config.melody[this.noteIndex % this.config.melody.length];
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const soft = stage === "blow" ? 0.06 : stage === "fireworks" ? 0.1 : 0.14;
      this.tone(hz, this.nextNote, 1.25, soft);
      this.tone(hz * 2, this.nextNote + 0.015, 0.45, soft * 0.12);
      if (this.noteIndex % 4 === 0) {
        this.tone(
          this.noteIndex % 8 ? 174.61 : 130.81,
          this.nextNote,
          3.0,
          soft * 0.7,
        );
        this.tone(
          this.noteIndex % 8 ? 261.63 : 196,
          this.nextNote,
          2.5,
          soft * 0.4,
        );
      }
      this.noteIndex++;
      this.nextNote += interval;
    }
  }

  pause() {
    this.playRequest++;
    this.file?.pause();
    this.context?.suspend().catch(() => {});
  }
  resume() {
    if (this.enabled) this.enable();
  }
  disable() {
    this.enabled = false;
    this.pause();
  }
  reset() {
    this.lastChime = undefined;
    this.noteIndex = 0;
    this.nextNote = this.context?.currentTime || 0;
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    if (this.file) this.file.currentTime = 0;
  }
  dispose() {
    this.disable();
    this.reset();
    this.permanent?.forEach((node) => node.disconnect());
    this.context?.close();
  }
}
