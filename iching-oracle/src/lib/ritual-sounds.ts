import type { CastMethod, CastPhase } from "@/components/RitualEffects";

/** 五声音阶（相对 C4） */
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

export type RitualSoundId =
  | "ui-tap"
  | "ui-select"
  | "ui-step"
  | "entry-tick"
  | "entry-enter"
  | "method-coin"
  | "method-yarrow"
  | "method-meihua"
  | "method-direct"
  | "phase-prepare"
  | "phase-invoke"
  | "coin-cast"
  | "coin-land"
  | "coin-flip-spin"
  | "yarrow-cast"
  | "yarrow-settle"
  | "meihua-bloom"
  | "meihua-chime"
  | "ink-brush"
  | "ink-stroke"
  | "seal-stamp"
  | "yao-line"
  | "hex-complete"
  | "wheel-turn"
  | "learn-reveal"
  | "page-turn"
  | "panel-open"
  | "question-fade"
  | "interpret-section"
  | "interpret-verdict";

const SOUND_KEY = "iching:soundEnabled";

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const raw = window.localStorage.getItem(SOUND_KEY);
    if (raw === "0" || raw === "false") return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

/** 须在用户手势后调用一次，以解锁 Web Audio */
export function unlockRitualAudio() {
  const ac = getCtx();
  if (!ac || unlocked) return;
  if (ac.state === "suspended") void ac.resume();
  unlocked = true;
}

function pentatonicNote(step: number, octave = 0): number {
  const idx = ((step % 5) + 5) % 5;
  const base = PENTATONIC[idx];
  return base * Math.pow(2, octave);
}

type ToneOpts = {
  freq: number;
  duration?: number;
  gain?: number;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  detune?: number;
  startAt?: number;
};

function playTone(opts: ToneOpts) {
  const ac = getCtx();
  if (!ac || !isSoundEnabled()) return;

  const {
    freq,
    duration = 0.35,
    gain = 0.12,
    type = "sine",
    attack = 0.012,
    decay = 0.28,
    detune = 0,
    startAt,
  } = opts;

  const t0 = startAt ?? ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** 古琴式拨弦：基音 + 泛音 + 轻余韵 */
function playGuzhengPluck(step: number, gain = 0.1) {
  const base = pentatonicNote(step);
  playTone({ freq: base, gain, attack: 0.005, decay: 0.48, type: "triangle" });
  playTone({ freq: base * 2, gain: gain * 0.28, attack: 0.003, decay: 0.22, type: "sine" });
  playTone({ freq: base * 3, gain: gain * 0.1, attack: 0.008, decay: 0.14, type: "sine" });
}

function playPluck(step: number, gain = 0.1) {
  playGuzhengPluck(step, gain);
}

function playTempleBell(step: number, gain = 0.09) {
  const ac = getCtx();
  if (!ac || !isSoundEnabled()) return;
  const t0 = ac.currentTime;
  const f = pentatonicNote(step);
  [1, 2.4, 3.8].forEach((ratio, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f * ratio;
    const peak = gain * (i === 0 ? 1 : 0.35 / i);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55 + i * 0.08);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.7);
  });
}

function playNoiseBurst(opts: { duration?: number; gain?: number; filterHz?: number; type?: BiquadFilterType; startAt?: number }) {
  const ac = getCtx();
  if (!ac || !isSoundEnabled()) return;

  const { duration = 0.12, gain = 0.06, filterHz = 800, type = "bandpass", startAt } = opts;
  const t0 = startAt ?? ac.currentTime;
  const len = Math.floor(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterHz;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

function playCoinClink(intensity = 1) {
  const ac = getCtx();
  if (!ac || !isSoundEnabled()) return;
  const t0 = ac.currentTime;
  const freqs = [1980 + Math.random() * 520, 2860 + Math.random() * 380, 3520 + Math.random() * 240];
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = i === 0 ? "square" : "triangle";
    osc.frequency.value = f;
    const peak = 0.048 * intensity * (i === 0 ? 1 : i === 1 ? 0.5 : 0.28);
    const delay = i * 0.032;
    g.gain.setValueAtTime(0.0001, t0 + delay);
    g.gain.exponentialRampToValueAtTime(peak, t0 + delay + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.1);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0 + delay);
    osc.stop(t0 + delay + 0.14);
  });
  playNoiseBurst({ duration: 0.04, gain: 0.022 * intensity, filterHz: 4800, type: "highpass", startAt: t0 });
  playTone({ freq: pentatonicNote(1) * 0.5, gain: 0.03 * intensity, attack: 0.02, decay: 0.35, type: "sine", startAt: t0 + 0.05 });
}

function playCoinFlipWhoosh() {
  playNoiseBurst({ duration: 0.14, gain: 0.038, filterHz: 1200, type: "bandpass" });
  window.setTimeout(() => playCoinClink(0.45), 120);
}

function playSealThud() {
  const ac = getCtx();
  if (!ac || !isSoundEnabled()) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(95, t0);
  osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.18);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.5);
  playGuzhengPluck(0, 0.065);
}

function playStalkShuffle() {
  [0, 45, 90].forEach((ms) => {
    window.setTimeout(
      () => playNoiseBurst({ duration: 0.07, gain: 0.04, filterHz: 380 + ms * 2, type: "lowpass" }),
      ms,
    );
  });
  window.setTimeout(() => playGuzhengPluck(0, 0.06), 160);
}

function playMeihuaCascade() {
  [0, 2, 4, 3, 1].forEach((step, i) => {
    window.setTimeout(() => (i === 4 ? playTempleBell(step, 0.08) : playGuzhengPluck(step, 0.075)), i * 75);
  });
}

function playInkBrushSweep() {
  playNoiseBurst({ duration: 0.28, gain: 0.05, filterHz: 160, type: "lowpass" });
  window.setTimeout(() => playNoiseBurst({ duration: 0.12, gain: 0.028, filterHz: 90, type: "lowpass" }), 140);
  playTone({ freq: 72, gain: 0.045, attack: 0.03, decay: 0.32, type: "sine" });
}

function playPaperTurn() {
  playNoiseBurst({ duration: 0.09, gain: 0.032, filterHz: 2400, type: "highpass" });
  playNoiseBurst({ duration: 0.06, gain: 0.02, filterHz: 600, type: "lowpass" });
}

function playHexFanfare() {
  [0, 2, 4, 2, 4].forEach((step, i) => {
    window.setTimeout(() => playGuzhengPluck(step, 0.09 - i * 0.008), i * 115);
  });
  window.setTimeout(() => playTempleBell(0, 0.1), 480);
  window.setTimeout(() => playSealThud(), 620);
}

function playMethodCoinIntro() {
  playCoinClink(0.85);
  window.setTimeout(() => playGuzhengPluck(1, 0.07), 120);
  window.setTimeout(() => playCoinClink(0.5), 280);
}

function playMethodYarrowIntro() {
  playStalkShuffle();
  window.setTimeout(() => playTempleBell(0, 0.07), 320);
}

function playMethodMeihuaIntro() {
  playMeihuaCascade();
}

function playMethodDirectIntro() {
  playInkBrushSweep();
  window.setTimeout(() => playGuzhengPluck(2, 0.06), 200);
}

const PLAYERS: Record<RitualSoundId, () => void> = {
  "ui-tap": () => playGuzhengPluck(2, 0.048),
  "ui-select": () => playGuzhengPluck(4, 0.072),
  "ui-step": () => {
    playGuzhengPluck(1, 0.06);
    window.setTimeout(() => playPaperTurn(), 80);
  },
  "entry-tick": () => playTempleBell(3, 0.065),
  "entry-enter": () => {
    playTempleBell(0, 0.08);
    window.setTimeout(() => playGuzhengPluck(2, 0.07), 150);
    window.setTimeout(() => playGuzhengPluck(4, 0.085), 300);
    window.setTimeout(() => playSealThud(), 480);
  },
  "method-coin": () => playMethodCoinIntro(),
  "method-yarrow": () => playMethodYarrowIntro(),
  "method-meihua": () => playMethodMeihuaIntro(),
  "method-direct": () => playMethodDirectIntro(),
  "phase-prepare": () => {
    playNoiseBurst({ duration: 0.22, gain: 0.038, filterHz: 300, type: "lowpass" });
    playGuzhengPluck(0, 0.05);
  },
  "phase-invoke": () => playTempleBell(2, 0.07),
  "coin-cast": () => {
    playCoinFlipWhoosh();
    window.setTimeout(() => playCoinClink(1), 200);
    window.setTimeout(() => playCoinClink(0.7), 320);
  },
  "coin-land": () => {
    playCoinClink(0.9);
    playGuzhengPluck(3, 0.07);
  },
  "coin-flip-spin": () => playCoinFlipWhoosh(),
  "yarrow-cast": () => {
    playStalkShuffle();
    window.setTimeout(() => playNoiseBurst({ duration: 0.09, gain: 0.045, filterHz: 720, type: "bandpass" }), 100);
  },
  "yarrow-settle": () => {
    playGuzhengPluck(1, 0.068);
    playNoiseBurst({ duration: 0.06, gain: 0.025, filterHz: 500, type: "lowpass" });
  },
  "meihua-bloom": () => playMeihuaCascade(),
  "meihua-chime": () => playTempleBell(4, 0.085),
  "ink-brush": () => playInkBrushSweep(),
  "ink-stroke": () => {
    playNoiseBurst({ duration: 0.1, gain: 0.032, filterHz: 220, type: "lowpass" });
    playTone({ freq: 78, gain: 0.042, attack: 0.012, decay: 0.22, type: "sine" });
    playGuzhengPluck(3, 0.045);
  },
  "seal-stamp": () => playSealThud(),
  "yao-line": () => playGuzhengPluck(3, 0.078),
  "hex-complete": () => playHexFanfare(),
  "wheel-turn": () => {
    playGuzhengPluck(2, 0.055);
    window.setTimeout(() => playGuzhengPluck(4, 0.05), 90);
  },
  "learn-reveal": () => {
    playPaperTurn();
    window.setTimeout(() => playGuzhengPluck(4, 0.07), 60);
    window.setTimeout(() => playGuzhengPluck(2, 0.06), 160);
  },
  "page-turn": () => playPaperTurn(),
  "panel-open": () => {
    playPaperTurn();
    playGuzhengPluck(1, 0.05);
  },
  "question-fade": () => playNoiseBurst({ duration: 0.08, gain: 0.022, filterHz: 1800, type: "highpass" }),
  "interpret-section": () => playGuzhengPluck(2, 0.055),
  "interpret-verdict": () => {
    playTempleBell(0, 0.09);
    window.setTimeout(() => playGuzhengPluck(4, 0.07), 200);
  },
};

export function playRitualSound(id: RitualSoundId) {
  if (!isSoundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  try {
    PLAYERS[id]?.();
  } catch {
    /* 静默失败，不阻断仪式流程 */
  }
}

export function playMethodIntro(method: CastMethod) {
  const map: Record<CastMethod, RitualSoundId> = {
    coin: "method-coin",
    yarrow: "method-yarrow",
    meihua: "method-meihua",
    direct: "method-direct",
  };
  playRitualSound(map[method]);
}

export function playCastPhaseSound(method: CastMethod, phase: CastPhase) {
  if (phase === "idle") return;
  if (phase === "prepare") {
    playRitualSound("phase-prepare");
    return;
  }
  if (phase === "invoke") {
    playRitualSound("phase-invoke");
    return;
  }
  if (phase === "cast") {
    if (method === "coin") playRitualSound("coin-cast");
    else if (method === "yarrow") playRitualSound("yarrow-cast");
    else if (method === "meihua") playRitualSound("meihua-bloom");
    else playRitualSound("ink-brush");
    return;
  }
  if (phase === "observe") {
    if (method === "coin") playRitualSound("coin-land");
    else if (method === "yarrow") playRitualSound("yarrow-settle");
    else if (method === "meihua") playRitualSound("meihua-chime");
    else playRitualSound("ink-stroke");
    return;
  }
  if (phase === "seal") playRitualSound("seal-stamp");
}

/** 绑定到 document，首次交互解锁音频 */
export function bindRitualAudioUnlock() {
  if (typeof window === "undefined") return () => {};
  const onGesture = () => {
    unlockRitualAudio();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
}
