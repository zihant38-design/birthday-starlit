// Quality changes use hysteresis to avoid oscillation during a busy finale.
export class PerformanceBudget {
  constructor(reduced = false) {
    this.reduced = reduced;
    this.average = 1 / 60;
    this.samples = 0;
    this.slowTime = 0;
    this.fastTime = 0;
    this.level = reduced
      ? 0
      : (navigator.hardwareConcurrency || 4) <= 4
        ? 1
        : 2;
    this.listeners = new Set();
  }

  observe(dt) {
    if (dt <= 0 || dt > 0.15) return;
    this.average += (dt - this.average) * 0.025;
    this.samples++;
    this.slowTime = this.average > 0.029 ? this.slowTime + dt : 0;
    this.fastTime = this.average < 0.019 ? this.fastTime + dt : 0;
    if (this.slowTime > 2.5 && this.level > 0) this.setLevel(this.level - 1);
    if (this.fastTime > 20 && this.level < 2 && !this.reduced)
      this.setLevel(this.level + 1);
  }

  setLevel(level) {
    this.level = level;
    this.slowTime = this.fastTime = 0;
    for (const listener of this.listeners) listener(level);
  }

  get dpr() {
    return Math.min(devicePixelRatio || 1, [1, 1.35, 1.7][this.level]);
  }
  get particleLimit() {
    return [700, 1600, 2800][this.level];
  }
  dispose() {
    this.listeners.clear();
  }
}
