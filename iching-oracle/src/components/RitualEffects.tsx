import { useEffect, useRef, useState, type ReactNode } from "react";
import { playCastPhaseSound, playMethodIntro, playRitualSound } from "@/lib/ritual-sounds";

export type CastPhase = "idle" | "prepare" | "invoke" | "cast" | "observe" | "seal";
export type CastMethod = "coin" | "yarrow" | "meihua" | "direct";

export const CAST_METHOD_META: Record<
  CastMethod,
  {
    seal: string;
    epithet: string;
    mantra: string;
    smokeColor: string;
    completeLabel: string;
    steps: string[];
    phases: Record<Exclude<CastPhase, "idle">, string>;
  }
> = {
  coin: {
    seal: "钱",
    epithet: "三钱六掷",
    mantra: "天三地六 · 诚心一投",
    smokeColor: "#EF9F27",
    completeLabel: "六钱归匣 · 卦象天成",
    steps: ["净手", "默念", "三投", "成卦"],
    phases: {
      prepare: "净手焚香 · 请出三钱",
      invoke:  "默念所问 · 三才敬听",
      cast:    "天三地六 · 铜钱旋落",
      observe: "静观正背 · 待爻自明",
      seal:    "收钱入卦 · 落印为证",
    },
  },
  yarrow: {
    seal: "蓍",
    epithet: "大衍五十",
    mantra: "分二挂一 · 十八成爻",
    smokeColor: "#1D9E75",
    completeLabel: "十八变毕 · 六爻已成",
    steps: ["焚香", "分二", "三变", "成卦"],
    phases: {
      prepare: "净手焚香 · 请出蓍草",
      invoke:  "凝神所问 · 大衍启数",
      cast:    "分二挂一 · 揲四归奇",
      observe: "静候数变 · 待爻自显",
      seal:    "收草入卦 · 落印为证",
    },
  },
  meihua: {
    seal: "梅",
    epithet: "三数成卦",
    mantra: "心生一念 · 数现三才",
    smokeColor: "#C26FA8",
    completeLabel: "三数既明 · 卦象自开",
    steps: ["取数", "排卦", "观动", "成卦"],
    phases: {
      prepare: "净念一息 · 数由心起",
      invoke:  "默念所问 · 三数相应",
      cast:    "下上动爻 · 梅花绽开",
      observe: "静观卦象 · 动爻所在",
      seal:    "数尽卦成 · 落印为证",
    },
  },
  direct: {
    seal: "墨",
    epithet: "直书六爻",
    mantra: "古法直录 · 自上而下",
    smokeColor: "var(--foreground)",
    completeLabel: "六爻既录 · 落墨为证",
    steps: ["填爻", "核对", "落墨", "成卦"],
    phases: {
      prepare: "展卷净案 · 准备落墨",
      invoke:  "默念所问 · 直书六爻",
      cast:    "自上而下 · 一笔一爻",
      observe: "核对阴阳 · 待卦自明",
      seal:    "落墨成卦 · 钤印为证",
    },
  },
};

function phaseText(method: CastMethod, phase: CastPhase, castIndex?: number): string | null {
  if (phase === "idle") return null;
  if (castIndex != null && (method === "coin" || method === "yarrow")) {
    return getCastCopy(method, castIndex).phases[phase];
  }
  return CAST_METHOD_META[method].phases[phase];
}

/** 单次起爻（投钱 / 行变）的仪式文案 — 六爻各不同 */
export type CastCopy = {
  hint: string;
  title: string;
  button: string;
  phases: Record<Exclude<CastPhase, "idle">, string>;
};

export const COIN_CAST_COPY: CastCopy[] = [
  {
    hint: "初爻在地 · 万事之始",
    title: "初爻属地 · 三钱齐投",
    button: "敬投 · 初爻",
    phases: {
      prepare: "焚香净念 · 初爻待启",
      invoke:  "默念所问 · 初爻问天",
      cast:    "天钱落地 · 初爻将显",
      observe: "静观钱币 · 阴阳初分",
      seal:    "初爻落定 · 落印为证",
    },
  },
  {
    hint: "二爻渐长 · 顺势而下",
    title: "二爻属人 · 三才再投",
    button: "敬投 · 二爻",
    phases: {
      prepare: "再净三钱 · 二爻待启",
      invoke:  "心不外驰 · 再问二爻",
      cast:    "人钱齐落 · 二爻将显",
      observe: "正背既分 · 静候其辞",
      seal:    "二爻落定 · 落印为证",
    },
  },
  {
    hint: "三爻居下 · 下卦将成",
    title: "三爻为下卦之极 · 第三投",
    button: "敬投 · 三爻",
    phases: {
      prepare: "下卦将毕 · 三钱再请",
      invoke:  "内卦将成 · 默念所问",
      cast:    "地钱旋落 · 三爻将显",
      observe: "下卦将定 · 观其动静",
      seal:    "三爻落定 · 下卦初成",
    },
  },
  {
    hint: "四爻入上 · 局势将转",
    title: "四爻属外 · 再请三钱",
    button: "敬投 · 四爻",
    phases: {
      prepare: "上卦初启 · 三钱再请",
      invoke:  "外象将显 · 再问四爻",
      cast:    "三钱再掷 · 四爻将显",
      observe: "内外将分 · 静观其变",
      seal:    "四爻落定 · 落印为证",
    },
  },
  {
    hint: "五爻为尊 · 问事关键",
    title: "五爻居中 · 慎投此爻",
    button: "敬投 · 五爻",
    phases: {
      prepare: "尊位将定 · 三钱再净",
      invoke:  "所问关键 · 五爻宜慎",
      cast:    "三钱齐落 · 五爻将显",
      observe: "尊爻将定 · 勿急勿躁",
      seal:    "五爻落定 · 落印为证",
    },
  },
  {
    hint: "上爻在天 · 末投须收",
    title: "上爻在天 · 最后一投",
    button: "敬投 · 上爻",
    phases: {
      prepare: "六投将尽 · 末钱再请",
      invoke:  "卦象将成 · 末爻问天",
      cast:    "末钱旋落 · 上爻将显",
      observe: "六爻将毕 · 静候全卦",
      seal:    "六钱归匣 · 卦象天成",
    },
  },
];

export const YARROW_CAST_COPY: CastCopy[] = [
  {
    hint: "大衍启数 · 初爻三变",
    title: "初爻在地 · 分二象两",
    button: "行三变 · 得初爻",
    phases: {
      prepare: "请出蓍草 · 初变待行",
      invoke:  "凝神所问 · 初爻启数",
      cast:    "分二挂一 · 初变始行",
      observe: "揲四归奇 · 初爻将显",
      seal:    "初爻落定 · 落印为证",
    },
  },
  {
    hint: "二变既行 · 再分其半",
    title: "二爻属人 · 三变再演",
    button: "行三变 · 得二爻",
    phases: {
      prepare: "蓍草再分 · 二变待行",
      invoke:  "心专不二 · 再问二爻",
      cast:    "分二挂一 · 二变继行",
      observe: "数变将定 · 静候其辞",
      seal:    "二爻落定 · 落印为证",
    },
  },
  {
    hint: "三变既毕 · 下卦将成",
    title: "三爻为下卦之极 · 末变",
    button: "行三变 · 得三爻",
    phases: {
      prepare: "下卦将毕 · 三变再启",
      invoke:  "内卦将成 · 凝神所问",
      cast:    "分二挂一 · 三变终行",
      observe: "下卦将定 · 观其老少",
      seal:    "三爻落定 · 下卦初成",
    },
  },
  {
    hint: "四变入上 · 外象将显",
    title: "四爻属外 · 再演三变",
    button: "行三变 · 得四爻",
    phases: {
      prepare: "上卦初启 · 四变待行",
      invoke:  "外象将显 · 再问四爻",
      cast:    "分二挂一 · 四变继行",
      observe: "内外将分 · 静观其变",
      seal:    "四爻落定 · 落印为证",
    },
  },
  {
    hint: "五变为尊 · 宜慎其行",
    title: "五爻居中 · 三变再演",
    button: "行三变 · 得五爻",
    phases: {
      prepare: "尊位将定 · 五变待启",
      invoke:  "所问关键 · 五爻宜慎",
      cast:    "分二挂一 · 五变继行",
      observe: "尊爻将定 · 勿急勿躁",
      seal:    "五爻落定 · 落印为证",
    },
  },
  {
    hint: "十八变尽 · 上爻在天",
    title: "上爻在天 · 末变将毕",
    button: "行三变 · 得上爻",
    phases: {
      prepare: "末变待行 · 蓍草再分",
      invoke:  "卦象将成 · 末爻问天",
      cast:    "分二挂一 · 末变终行",
      observe: "六爻将毕 · 静候全卦",
      seal:    "十八变毕 · 六爻已成",
    },
  },
];

export function getCastCopy(method: "coin" | "yarrow", castIndex: number): CastCopy {
  const list = method === "coin" ? COIN_CAST_COPY : YARROW_CAST_COPY;
  return list[Math.min(Math.max(castIndex, 0), 5)];
}

/** 袅袅升起的香烟粒子 */
export function IncenseSmoke({ count = 5, color = "var(--gold)" }: { count?: number; color?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="anim-incense absolute bottom-[18%] block rounded-full"
          style={{
            left: `${38 + i * 6}%`,
            width: `${6 + (i % 3) * 2}px`,
            height: `${6 + (i % 3) * 2}px`,
            background: color,
            opacity: 0.35,
            ["--dur" as never]: `${2 + i * 0.35}s`,
            ["--delay" as never]: `${i * 320}ms`,
          }}
        />
      ))}
    </div>
  );
}

/** 仪式阶段文字 — 每次 phase 变化重新播放 */
export function RitualPhaseText({
  method,
  phase,
  castIndex,
}: {
  method: CastMethod;
  phase: CastPhase;
  castIndex?: number;
}) {
  const text = phaseText(method, phase, castIndex);
  if (!text) return null;
  return (
    <p
      key={`${phase}-${castIndex ?? "x"}`}
      className="anim-ritual-text font-ritual-cjk pointer-events-none absolute bottom-8 left-0 right-0 text-center text-sm tracking-[0.35em] text-foreground/80"
      style={{ ["--dur" as never]: phase === "seal" ? "1.4s" : "1.8s" }}
    >
      {text}
    </p>
  );
}

/** 仪式步骤条 — 四式共用 */
export function RitualStepStrip({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] tracking-[0.28em]">
      {steps.map((s, i) => (
        <span key={s} className={`inline-flex items-center gap-1.5 ${i === activeIndex ? "text-foreground" : "text-muted-foreground/55"}`}>
          {i > 0 && <span className="text-border/80">·</span>}
          <span className={`inline-flex items-center gap-1.5 ${i === activeIndex ? "ritual-step-active" : ""}`}>
            <span className={`inline-block h-1 w-1 rounded-full ${i === activeIndex ? "bg-[var(--gold)] animate-breathe" : "bg-border"}`} />
            {s}
          </span>
        </span>
      ))}
    </div>
  );
}

/** 祭坛外框 — 四式起卦共用仪式感包装 */
export function RitualAltarFrame({
  method,
  activeStep = 0,
  overlay,
  align = "center",
  children,
}: {
  method: CastMethod;
  activeStep?: number;
  overlay?: ReactNode;
  align?: "center" | "left";
  children: ReactNode;
}) {
  const m = CAST_METHOD_META[method];
  return (
    <div className={`ritual-altar ritual-altar-${method} relative overflow-hidden rounded-lg border p-5 ${align === "center" ? "text-center" : "text-left"}`}>
      {overlay}
      <IncenseSmoke count={4} color={m.smokeColor} />
      <div aria-hidden className="ritual-altar-ring ritual-altar-ring-a animate-seal" />
      <div aria-hidden className="ritual-altar-ring ritual-altar-ring-b" />
      <div aria-hidden className="ritual-altar-corners" />
      <div aria-hidden className="ritual-altar-wash" />

      <header className="relative z-10 mb-4">
        <p className="text-[10px] tracking-[0.35em] opacity-70">{m.epithet}</p>
        <p className="mt-1 font-serif-cjk text-base font-medium tracking-[0.12em]">{m.mantra}</p>
        <RitualStepStrip steps={m.steps} activeIndex={activeStep} />
      </header>

      <div className="relative z-10">{children}</div>

      <span aria-hidden className="ritual-altar-seal font-ritual-cjk animate-breathe">{m.seal}</span>
    </div>
  );
}

/** 切换起卦方式时的短促开式动画 */
export function MethodSwitchFlash({ method }: { method: CastMethod | null }) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState<CastMethod | null>(null);

  const prevMethod = useRef<CastMethod | null>(null);

  useEffect(() => {
    if (!method) return;
    if (prevMethod.current !== method) {
      playMethodIntro(method);
      prevMethod.current = method;
    }
    setShown(method);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 820);
    return () => clearTimeout(t);
  }, [method]);

  if (!visible || !shown) return null;
  const m = CAST_METHOD_META[shown];
  return (
    <div className="ritual-method-flash pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
      <span aria-hidden className="absolute h-24 w-24 rounded-full border border-[var(--gold)]/35 anim-ring-expand" />
      <span aria-hidden className="absolute h-36 w-36 rounded-full border border-[var(--gold)]/20 anim-ring-expand" style={{ animationDelay: "120ms" }} />
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border-2 border-[var(--vermillion)] text-[var(--vermillion)] animate-stamp">
        <span className="font-serif-cjk text-xl font-bold">{m.seal}</span>
      </div>
      <p className="mt-3 font-ritual-cjk text-sm tracking-[0.35em] text-foreground/85">{m.mantra}</p>
    </div>
  );
}

/** 六爻完成时的落印庆祝 */
export function HexCompleteReveal({ show, label = "六爻已成 · 卦象天成" }: { show: boolean; label?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (show) {
      playRitualSound("hex-complete");
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2800);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [show]);

  if (!visible) return null;
  return (
    <div className="anim-veil pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center"
         style={{ backgroundColor: "color-mix(in oklab, var(--background) 72%, transparent)" }}>
      <span aria-hidden className="absolute h-32 w-32 rounded-full border border-[var(--gold)] opacity-30 anim-ring-expand" />
      <span aria-hidden className="absolute h-48 w-48 rounded-full border border-[var(--gold)] opacity-20 anim-ring-expand"
            style={{ animationDelay: "180ms" }} />
      <div className="animate-hex-reveal font-ritual-cjk text-xl tracking-[0.08em] text-foreground">{label}</div>
      <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-sm border-2 border-[var(--vermillion)] text-[var(--vermillion)] animate-stamp">
        <span className="font-serif-cjk text-lg font-bold">卦</span>
      </div>
    </div>
  );
}

/** 入境准备 — 首次问卜前的静心仪式 */
export function RitualEntryGate({ onEnter }: { onEnter: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCountdown = () => {
    playRitualSound("ui-select");
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      playRitualSound("entry-enter");
      onEnter();
      return;
    }
    playRitualSound("entry-tick");
    const t = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 900);
    return () => clearTimeout(t);
  }, [countdown, onEnter]);

  return (
    <div className="ritual-entry-gate relative overflow-hidden rounded-xl border border-border/70 bg-card/95 px-6 py-10 text-center sm:px-10 sm:py-12">
      <IncenseSmoke count={3} />

      <p className="relative text-[10px] tracking-[0.35em] text-muted-foreground">问事之前</p>
      <p className="relative mt-4 font-serif-cjk text-base font-medium leading-relaxed text-foreground sm:text-lg">
        静心片刻，再问一事
      </p>
      <p className="relative mx-auto mt-3 max-w-[16rem] text-[11px] leading-[1.85] text-muted-foreground">
        双手合十，默念所问
        <br />
        心专则象明，象明则卦准
      </p>

      {countdown !== null ? (
        <div className="relative mt-9 animate-yao-pop">
          <div className="font-ritual-cjk text-5xl text-[var(--gold)] animate-breathe">{countdown || "始"}</div>
          <p className="mt-2 text-[11px] tracking-[0.2em] text-muted-foreground">
            {countdown > 0 ? "屏息凝神…" : "入境"}
          </p>
        </div>
      ) : (
        <div className="relative mt-9 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={startCountdown}
            className="btn-gold btn-gold-hero ritual-entry-cta"
          >
            <span className="font-ritual-cjk text-sm tracking-[0.22em]">始</span>
            <span>净心入境</span>
          </button>
          <p className="text-[10px] tracking-[0.18em] text-muted-foreground">默念所问 · 约三息</p>
        </div>
      )}
    </div>
  );
}

/** 多阶段起卦覆盖层 — 四式共用 */
export function RitualOverlay({
  type,
  phase,
  castIndex,
}: {
  type: CastMethod;
  phase: CastPhase;
  castIndex?: number;
}) {
  const prevPhase = useRef<CastPhase>("idle");

  useEffect(() => {
    if (phase === prevPhase.current) return;
    if (phase !== "idle") playCastPhaseSound(type, phase);
    prevPhase.current = phase;
  }, [type, phase]);

  if (phase === "idle") return null;

  const meta = CAST_METHOD_META[type];
  const showMain = phase === "cast" || phase === "observe";
  const showSmoke = phase === "prepare" || phase === "invoke" || phase === "cast";

  return (
    <div
      className="anim-veil absolute inset-0 z-20 flex flex-col items-center justify-center"
      style={{
        backgroundColor: "color-mix(in oklab, var(--background) 78%, transparent)",
        backdropFilter: "blur(2px)",
      }}
    >
      {showSmoke && <IncenseSmoke count={6} color={meta.smokeColor} />}

      {phase === "seal" && (
        <div className="flex h-16 w-16 items-center justify-center rounded-sm border-2 border-[var(--vermillion)] text-[var(--vermillion)] animate-stamp">
          <span className="font-serif-cjk text-2xl font-bold">{meta.seal}</span>
        </div>
      )}

      {showMain && type === "coin" && (
        <div className="relative flex items-end gap-5" style={{ perspective: "900px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="anim-coin-cast" style={{ animationDelay: `${i * 90}ms`, transformStyle: "preserve-3d" }}>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-[#B8860B] bg-[#E8B65A] shadow-[0_10px_18px_-6px_rgba(99,56,6,0.35)]">
                <span className="absolute inset-[3px] rounded-full border border-black/15" />
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-[#3d1f00]" />
              </div>
              <div className="mt-1 text-center text-[9px] tracking-[0.3em] text-[#8a5a1d]/80">{["天", "人", "地"][i]}</div>
            </div>
          ))}
          <span aria-hidden className="pointer-events-none absolute -bottom-6 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border border-[var(--gold)]/40 animate-ripple" />
        </div>
      )}

      {showMain && type === "yarrow" && (
        <div className="relative flex items-end gap-1">
          <div className="flex items-end gap-[3px] anim-stalk-left">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="block w-[3px] rounded-full bg-[#0f5c44] anim-stalk-rise"
                    style={{ height: `${30 + (i % 3) * 6}px`, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <span className="mx-1 inline-block h-10 w-px bg-[#0f5c44]/40" />
          <div className="flex items-end gap-[3px] anim-stalk-right">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="block w-[3px] rounded-full bg-[#0f5c44] anim-stalk-rise"
                    style={{ height: `${28 + (i % 3) * 6}px`, animationDelay: `${i * 40 + 80}ms` }} />
            ))}
          </div>
        </div>
      )}

      {showMain && type === "meihua" && (
        <div className="relative h-24 w-24">
          {[0, 72, 144, 216, 288].map((rot, i) => (
            <span key={i} aria-hidden className="absolute left-1/2 top-1/2 block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C26FA8] anim-petal"
                  style={{ ["--rot" as never]: `${rot}deg`, animationDelay: `${i * 70}ms`, boxShadow: "0 0 14px rgba(194,111,168,0.45)" }} />
          ))}
          <span aria-hidden className="absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7a2f5b] anim-blossom"
                style={{ animationDelay: "320ms" }} />
        </div>
      )}

      {showMain && type === "direct" && (
        <div className="relative flex h-20 w-64 items-center justify-center">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-foreground anim-ink-sweep" />
          <span className="relative anim-ink-bleed font-serif-cjk text-2xl font-medium tracking-[0.4em] text-foreground"
                style={{ animationDelay: "320ms" }}>落 墨</span>
        </div>
      )}

      <RitualPhaseText method={type} phase={phase} castIndex={castIndex} />
    </div>
  );
}

/** 多阶段 casting 时序控制器 */
export function runCastSequence(
  setPhase: (p: CastPhase) => void,
  onComplete: () => void,
  opts?: { withSeal?: boolean },
) {
  const steps: [CastPhase, number][] = [
    ["prepare", 550],
    ["invoke", 800],
    ["cast", 1200],
    ["observe", 650],
  ];
  if (opts?.withSeal) steps.push(["seal", 900]);

  let elapsed = 0;
  const timers: ReturnType<typeof setTimeout>[] = [];

  steps.forEach(([phase, dur]) => {
    timers.push(setTimeout(() => setPhase(phase), elapsed));
    elapsed += dur;
  });

  timers.push(setTimeout(() => {
    setPhase("idle");
    onComplete();
  }, elapsed));

  return () => timers.forEach(clearTimeout);
}
