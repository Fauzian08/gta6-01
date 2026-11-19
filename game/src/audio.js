// Procedural sound for Isla Azura: no audio files, everything is synthesised
// with WebAudio — engine hum, police sirens, gunfire, footsteps and UI blips.
// The context is created on the first user gesture; every call guards against
// a missing context so headless screenshots never crash on sound.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: a sawtooth through a lowpass, pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: a triangle that wails between two tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch (err) {
      this.ctx = null;
    }
  }

  setEngine(speed01, on) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(48 + speed01 * 140, t, 0.08);
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(320 + speed01 * 900, t, 0.1);
  }

  setSiren(on, dt) {
    if (!this.ctx || !this.sirenOsc) return;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
    if (on) {
      this.sirenTimer += dt;
      const f = 660 + Math.sin(this.sirenTimer * 2.6) * 220;
      this.sirenOsc.frequency.setTargetAtTime(f, t, 0.05);
    }
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq || 660;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.09));
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + (dur || 0.09) + 0.02);
  }

  shot() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = 0.12;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = 0.25;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.8;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    this.blip(90, 0.18, 'sine', 0.2);
  }

  missionSting() {
    this.blip(523, 0.12, 'triangle', 0.12);
    setTimeout(() => this.blip(659, 0.12, 'triangle', 0.12), 110);
    setTimeout(() => this.blip(784, 0.22, 'triangle', 0.14), 220);
  }
}
