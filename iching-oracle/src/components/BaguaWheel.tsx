import { useState, useMemo, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";

type Gua = {
  id: number;
  name: string;
  char: string;
  dir: string;
  nature: string;
  yao: [number, number, number];
  angle: number;
  wuxing: string;
  symbol: string;
  tags: string[];
  desc: string;
};

const BAGUA: Gua[] = [
  { id: 1, name: "乾", char: "☰", dir: "南", nature: "天", yao: [1, 1, 1], angle: 180, wuxing: "金", symbol: "父", tags: ["刚健", "阳极", "创始"], desc: "纯阳之卦，六爻皆阳。代表天、君、父，象征最强阳性能量，为万物之始。" },
  { id: 8, name: "坤", char: "☷", dir: "北", nature: "地", yao: [0, 0, 0], angle: 0, wuxing: "土", symbol: "母", tags: ["柔顺", "阴极", "承载"], desc: "纯阴之卦，六爻皆阴。代表地、民、母，象征最强阴性能量，与乾相对。" },
  { id: 4, name: "离", char: "☲", dir: "东", nature: "火", yao: [1, 0, 1], angle: 90, wuxing: "火", symbol: "中女", tags: ["附丽", "文明", "光明"], desc: "中爻为阴，上下皆阳。象征火、日、目，主附丽、文明与光明。" },
  { id: 6, name: "坎", char: "☵", dir: "西", nature: "水", yao: [0, 1, 0], angle: 270, wuxing: "水", symbol: "中男", tags: ["险陷", "流动", "智慧"], desc: "中爻为阳，上下皆阴。象征水、月、耳，与离相对，主险陷、流动与智慧。" },
  { id: 3, name: "震", char: "☳", dir: "东北", nature: "雷", yao: [0, 0, 1], angle: 315, wuxing: "木", symbol: "长男", tags: ["动", "震动", "奋发"], desc: "下爻为阳，上两爻为阴。象征雷、龙、足，代表起始动力与震动奋发。" },
  { id: 5, name: "巽", char: "☴", dir: "西南", nature: "风", yao: [1, 1, 0], angle: 135, wuxing: "木", symbol: "长女", tags: ["入", "顺从", "渗透"], desc: "下爻为阴，上两爻为阳。象征风、木、股，与震相对，主顺入、渗透与影响力。" },
  { id: 2, name: "艮", char: "☶", dir: "西北", nature: "山", yao: [1, 0, 0], angle: 225, wuxing: "土", symbol: "少男", tags: ["止", "稳固", "边界"], desc: "上爻为阳，下两爻为阴。象征山、手、背，代表静止、稳固与边界。" },
  { id: 7, name: "兑", char: "☱", dir: "东南", nature: "泽", yao: [0, 1, 1], angle: 45, wuxing: "金", symbol: "少女", tags: ["悦", "喜乐", "口舌"], desc: "上爻为阴，下两爻为阳。象征泽、口、羊，与艮相对，主喜乐、沟通与表达。" },
];

const CARDINAL_DIRS = new Set(["北", "南", "东", "西"]);
const CX = 150;
const CY = 150;
const R_OUTER = 148;
const R_INNER = 50;

function polar(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function sectorPath(angle: number): string {
  const start = angle - 22.5;
  const end = angle + 22.5;
  const [ox1, oy1] = polar(start, R_OUTER);
  const [ox2, oy2] = polar(end, R_OUTER);
  const [ix1, iy1] = polar(start, R_INNER);
  const [ix2, iy2] = polar(end, R_INNER);
  return `M ${ix1} ${iy1} L ${ox1} ${oy1} A ${R_OUTER} ${R_OUTER} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${R_INNER} ${R_INNER} 0 0 0 ${ix1} ${iy1} Z`;
}

function YaoMarks({ gua }: { gua: Gua }) {
  const span = 18;
  const radii: Array<[number, number]> = [
    [R_INNER + (R_OUTER - R_INNER) * 0.08, R_INNER + (R_OUTER - R_INNER) * 0.28],
    [R_INNER + (R_OUTER - R_INNER) * 0.4, R_INNER + (R_OUTER - R_INNER) * 0.6],
    [R_INNER + (R_OUTER - R_INNER) * 0.72, R_INNER + (R_OUTER - R_INNER) * 0.92],
  ];
  const lines: ReactElement[] = [];
  gua.yao.forEach((y, i) => {
    const [r1, r2] = radii[i];
    const mid = (r1 + r2) / 2;
    if (y === 1) {
      const [x1, y1] = polar(gua.angle - span, mid);
      const [x2, y2] = polar(gua.angle + span, mid);
      lines.push(
        <line key={`${gua.id}-y-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bagua-yang)" strokeWidth={3} strokeLinecap="round" />
      );
    } else {
      const [xa, ya] = polar(gua.angle - span, mid);
      const [xb, yb] = polar(gua.angle - 4, mid);
      const [xc, yc] = polar(gua.angle + 4, mid);
      const [xd, yd] = polar(gua.angle + span, mid);
      lines.push(
        <line key={`${gua.id}-y-${i}-a`} x1={xa} y1={ya} x2={xb} y2={yb} stroke="var(--bagua-yin)" strokeWidth={3} strokeLinecap="round" />,
        <line key={`${gua.id}-y-${i}-b`} x1={xc} y1={yc} x2={xd} y2={yd} stroke="var(--bagua-yin)" strokeWidth={3} strokeLinecap="round" />
      );
    }
  });
  return <>{lines}</>;
}

export function BaguaWheel({
  onGoQuestions,
  onGoStart,
}: {
  onGoQuestions?: () => void;
  onGoStart?: () => void;
} = {}) {
  const [activeId, setActiveId] = useState<number>(1);
  const [panelKey, setPanelKey] = useState(0);
  const active = useMemo(() => BAGUA.find((g) => g.id === activeId)!, [activeId]);

  const select = (id: number) => {
    if (id === activeId) return;
    unlockRitualAudio();
    playRitualSound("wheel-turn");
    setActiveId(id);
    setPanelKey(k => k + 1);
  };

  return (
    <div className="flex flex-wrap items-start gap-6 py-4">
      <div className="shrink-0">
        <svg width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="先天八卦方位图"
             className="transition-transform duration-500 hover:scale-[1.02]">
          <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="var(--border)" strokeWidth={0.5} className="animate-wheel-pulse" />
          <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="var(--border)" strokeWidth={0.5} />
          {BAGUA.map((g) => {
            const isActive = g.id === activeId;
            return (
              <path
                key={g.id}
                d={sectorPath(g.angle)}
                fill={isActive ? "var(--bagua-active-bg)" : "var(--secondary)"}
                stroke={isActive ? "var(--bagua-active-border)" : "var(--background)"}
                strokeWidth={isActive ? 2 : 1.5}
                className={`cursor-pointer transition-all duration-300 ${isActive ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
                onClick={() => select(g.id)}
              />
            );
          })}
          {BAGUA.map((g) => (
            <YaoMarks key={`yao-${g.id}`} gua={g} />
          ))}
          {BAGUA.map((g) => {
            const [lx, ly] = polar(g.angle, (R_OUTER + R_INNER) / 2 + 14);
            const [dx, dy] = polar(g.angle, R_OUTER - 14);
            return (
              <g key={`lbl-${g.id}`} pointerEvents="none">
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={500} fill="var(--muted-foreground)">
                  {g.name}
                </text>
                <text
                  x={dx}
                  y={dy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={CARDINAL_DIRS.has(g.dir) ? 10 : 9}
                  fontWeight={CARDINAL_DIRS.has(g.dir) ? 600 : 400}
                  fill={CARDINAL_DIRS.has(g.dir) ? "var(--gold)" : "var(--muted-foreground)"}
                  opacity={CARDINAL_DIRS.has(g.dir) ? 0.9 : 0.7}
                >
                  {g.dir}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={22} fill="var(--secondary)" stroke="var(--border)" strokeWidth={0.5} />
          <text x={CX} y={146} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">先天</text>
          <text x={CX} y={160} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">八卦</text>
        </svg>
      </div>

      <div key={panelKey} className="min-h-[280px] min-w-[200px] flex-1 animate-slide-in rounded-lg border border-border bg-secondary/40 p-5">
        <h3 className="text-base font-medium text-foreground">
          {active.name}卦 · {active.nature}
        </h3>
        <div className="my-2 animate-yao-pop text-4xl leading-none text-foreground">{active.char}</div>
        <div className="my-2.5 flex gap-1.5">
          {[...active.yao].reverse().map((y, i) => (
            <YaoBar key={i} yin={y === 0} delay={i * 60} />
          ))}
        </div>
        <Meta label="方位" value={`${active.dir} · 五行${active.wuxing} · ${active.symbol}`} />
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--gold)]/90">
          主线关联：问事 → 起卦 → 解读
        </p>
        <div className="mt-1.5 text-xs text-muted-foreground">特质</div>
        <div className="mt-1 mb-2 flex flex-wrap gap-1">
          {active.tags.map((t, i) => (
            <span
              key={t}
              className="inline-block animate-stagger rounded border px-2 py-0.5 text-[11px]"
              style={{
                animationDelay: `${i * 50}ms`,
                background: "var(--bagua-active-bg)",
                color: "var(--bagua-active-border)",
                borderColor: "var(--bagua-active-border)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">卦义</div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{active.desc}</p>
        {onGoQuestions ? (
          <button
            type="button"
            onClick={onGoQuestions}
            className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)] py-2.5 text-xs tracking-wider text-foreground transition hover:border-[var(--gold)]"
          >
            带着{active.name}之念，回到选问事
          </button>
        ) : (
          <DivineEntryLink
            search={{ skipEntry: true }}
            className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)] py-2.5 text-xs tracking-wider text-foreground transition hover:border-[var(--gold)]"
          >
            以此为念，先问再起卦
          </DivineEntryLink>
        )}
        {onGoStart ? (
          <button
            type="button"
            onClick={onGoStart}
            className="mt-2 block w-full text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            继续主线 · 开始问卜 →
          </button>
        ) : (
          <Link
            to="/history"
            className="mt-2 block text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            查看过往卦象
          </Link>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="mb-2 text-sm text-foreground">{value}</div>
    </>
  );
}

function YaoBar({ yin, delay = 0 }: { yin: boolean; delay?: number }) {
  if (!yin) {
    return <div className="animate-yao-pop h-2.5 w-8 rounded-sm" style={{ animationDelay: `${delay}ms`, background: "var(--bagua-yang)" }} />;
  }
  return (
    <div className="animate-yao-pop relative h-2.5 w-8 rounded-sm border" style={{ animationDelay: `${delay}ms`, borderColor: "var(--bagua-yin)", background: "var(--background)" }}>
      <div className="absolute left-1/2 top-0 bottom-0 w-1.5 -translate-x-1/2" style={{ background: "var(--background)" }} />
    </div>
  );
}