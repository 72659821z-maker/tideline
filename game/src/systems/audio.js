// All sound is generated at runtime with WebAudio: a synth engine note, sirens, gunshots,
// punches, crashes, footsteps, mission chimes and the horn. No audio files are loaded.
// The context stays suspended until a real click or keypress calls ensure(), which is what
// browser autoplay rules require.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.master = null;
    this.engineActive = false;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.sirenGain = null;
    this.sirenOsc = null;
    this.noiseBuffer = null;
    this.stepSide = 0;
    this.sirenLevel = 0;
  }

  ensure() {
    if (this.ready) {
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoise(1.2);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 520;
      this.engineFilter.Q.value = 2;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 62;
      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'sine';
      this.engineSub.frequency.value = 31;
      this.engineOsc.connect(this.engineFilter);
      this.engineSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.engineSub.start();

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 740;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.ready = true;
      this.ctx.resume().catch(() => {});
    } catch {
      this.ready = false;
    }
  }

  createNoise(duration) {
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  noise(duration, gain, filterType = 'highpass', frequency = 800) {
    if (!this.ready || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    const amp = this.ctx.createGain();
    const now = this.ctx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  tone(frequency, endFrequency, duration, gain, type = 'sine') {
    if (!this.ready) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  engineOn() {
    this.ensure();
    this.engineActive = true;
  }

  engineOff() {
    this.engineActive = false;
    if (this.engineGain && this.ready) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
  }

  update(dt, game) {
    if (!this.ready) return;
    const vehicle = game.player?.currentVehicle;
    const now = this.ctx.currentTime;
    if (vehicle && this.engineActive) {
      const speed = Math.abs(vehicle.forwardSpeed);
      const rpm = 52 + speed * 4.4 + Math.min(18, speed * 0.3);
      this.engineOsc.frequency.setTargetAtTime(rpm, now, 0.08);
      this.engineSub.frequency.setTargetAtTime(rpm * 0.5, now, 0.08);
      this.engineFilter.frequency.setTargetAtTime(360 + speed * 23, now, 0.1);
      const gain = 0.04 + Math.min(0.07, speed * 0.0017);
      this.engineGain.gain.setTargetAtTime(gain, now, 0.12);
      if (speed > 4 && Math.random() < dt * 4) game.effects.emitExhaust(vehicle.position, vehicle.heading);
    } else {
      this.engineGain?.gain.setTargetAtTime(0, now, 0.2);
    }
    const wanted = game.wanted?.stars ?? 0;
    const targetSiren = wanted > 0 ? Math.min(0.055, 0.022 + wanted * 0.006) : 0;
    this.sirenLevel += (targetSiren - this.sirenLevel) * Math.min(1, dt * 2.5);
    if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(this.sirenLevel, now, 0.15);
    if (this.sirenOsc) {
      const sweep = 690 + Math.sin(now * 5.4) * 260;
      this.sirenOsc.frequency.setTargetAtTime(sweep, now, 0.04);
    }
  }

  gunshot() {
    this.noise(0.19, 0.55, 'highpass', 420);
    this.tone(130, 40, 0.18, 0.25, 'square');
  }

  suppressedShot() {
    this.noise(0.13, 0.24, 'highpass', 600);
  }

  punch() {
    this.tone(150, 60, 0.12, 0.22, 'sine');
    this.noise(0.08, 0.1, 'lowpass', 600);
  }

  knife() {
    this.noise(0.1, 0.18, 'highpass', 1200);
  }

  crash(intensity = 10) {
    const volumes = Math.min(0.65, 0.12 + intensity * 0.018);
    this.noise(0.34, volumes, 'lowpass', 1400);
    this.tone(75, 28, 0.32, volumes * 0.6, 'sawtooth');
  }

  explosion() {
    this.noise(1.1, 0.8, 'lowpass', 1000);
    this.tone(65, 22, 0.9, 0.4, 'sawtooth');
  }

  footstep(sprinting = false) {
    this.stepSide = 1 - this.stepSide;
    this.noise(0.06, sprinting ? 0.06 : 0.035, 'lowpass', 380 + (this.stepSide * 60));
  }

  jump() {
    this.tone(190, 120, 0.1, 0.05, 'sine');
  }

  carDoor() {
    this.noise(0.08, 0.2, 'lowpass', 800);
    this.tone(100, 60, 0.12, 0.12, 'square');
  }

  playerHit() {
    this.tone(90, 48, 0.22, 0.25, 'sine');
    this.noise(0.14, 0.15, 'lowpass', 500);
  }

  enemyHit() {
    this.noise(0.1, 0.16, 'lowpass', 1000);
  }

  emptyClick() {
    this.noise(0.035, 0.12, 'highpass', 1800);
  }

  cash() {
    this.tone(660, 880, 0.13, 0.1, 'triangle');
    setTimeout(() => this.tone(990, 1320, 0.18, 0.08, 'triangle'), 70);
  }

  mission() {
    const notes = [392, 523, 659, 784];
    notes.forEach((note, index) => {
      setTimeout(() => this.tone(note, note * 1.01, 0.35, 0.09, 'triangle'), index * 120);
    });
  }

  fail() {
    this.tone(240, 120, 0.5, 0.12, 'sawtooth');
  }

  horn() {
    this.tone(392, 392, 0.3, 0.08, 'square');
    this.tone(494, 494, 0.3, 0.05, 'square');
  }
}
