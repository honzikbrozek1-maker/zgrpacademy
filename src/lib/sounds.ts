const audioCtxCache: { ctx: AudioContext | null } = { ctx: null };

function getAudioContext(): AudioContext {
  if (!audioCtxCache.ctx) {
    audioCtxCache.ctx = new AudioContext();
  }
  return audioCtxCache.ctx;
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem('soundEnabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
}

export function getVolume(): number {
  const v = localStorage.getItem('soundVolume');
  return v ? parseInt(v) : 70;
}

export function setVolume(vol: number) {
  localStorage.setItem('soundVolume', String(vol));
}

function getGain(): number {
  return (getVolume() / 100) * 0.3;
}

export function playCorrectSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(getGain(), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

export function playIncorrectSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.setValueAtTime(277, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(getGain(), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
