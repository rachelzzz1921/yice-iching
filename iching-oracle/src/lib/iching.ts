// Minimal I-Ching helper for the prototype.
// 8 trigrams (先天编号 1-8): 乾 兑 离 震 巽 坎 艮 坤
// Each represented as bits [bottom, middle, top] where 1 = yang, 0 = yin
export const TRIGRAMS: { id: number; name: string; bits: [number, number, number] }[] = [
  { id: 1, name: "乾", bits: [1, 1, 1] },
  { id: 2, name: "兑", bits: [1, 1, 0] },
  { id: 3, name: "离", bits: [1, 0, 1] },
  { id: 4, name: "震", bits: [1, 0, 0] },
  { id: 5, name: "巽", bits: [0, 1, 1] },
  { id: 6, name: "坎", bits: [0, 1, 0] },
  { id: 7, name: "艮", bits: [0, 0, 1] },
  { id: 8, name: "坤", bits: [0, 0, 0] },
];

// 64-hex unicode block starts at U+4DC0. We map (upper, lower) trigram bits
// via the King Wen indices implicitly through GUA_TABLE.
// Order in GUA_TABLE: rows = lower trigram (1..8 乾兑离震巽坎艮坤),
//                    cols = upper trigram (1..8 乾兑离震巽坎艮坤)
// Each cell: [name, unicode char]
export const GUA_TABLE: Array<Array<[string, string]>> = [
  // lower 乾
  [["乾","䷀"],["夬","䷪"],["大有","䷍"],["大壮","䷡"],["小畜","䷈"],["需","䷄"],["大畜","䷙"],["泰","䷊"]],
  // lower 兑
  [["履","䷉"],["兑","䷹"],["睽","䷥"],["归妹","䷵"],["中孚","䷼"],["节","䷻"],["损","䷨"],["临","䷒"]],
  // lower 离
  [["同人","䷌"],["革","䷰"],["离","䷝"],["丰","䷶"],["家人","䷤"],["既济","䷾"],["贲","䷕"],["明夷","䷣"]],
  // lower 震
  [["无妄","䷘"],["随","䷐"],["噬嗑","䷔"],["震","䷲"],["益","䷩"],["屯","䷂"],["颐","䷚"],["复","䷗"]],
  // lower 巽
  [["姤","䷫"],["大过","䷛"],["鼎","䷱"],["恒","䷟"],["巽","䷸"],["井","䷯"],["蛊","䷑"],["升","䷭"]],
  // lower 坎
  [["讼","䷅"],["困","䷮"],["未济","䷿"],["解","䷧"],["涣","䷺"],["坎","䷜"],["蒙","䷃"],["师","䷆"]],
  // lower 艮
  [["遁","䷠"],["咸","䷞"],["旅","䷷"],["小过","䷽"],["渐","䷴"],["蹇","䷦"],["艮","䷳"],["谦","䷎"]],
  // lower 坤
  [["否","䷋"],["萃","䷬"],["晋","䷢"],["豫","䷏"],["观","䷓"],["比","䷇"],["剥","䷖"],["坤","䷁"]],
];

// Given 6 yao bits (index 0 = bottom 初爻, index 5 = top 上爻), return hex info
export function hexFromYao(yao: number[]): { name: string; char: string } {
  // lower trigram = yao[0..2], upper trigram = yao[3..5]
  const lowerBits: [number, number, number] = [yao[0], yao[1], yao[2]];
  const upperBits: [number, number, number] = [yao[3], yao[4], yao[5]];
  const lowerIdx = TRIGRAMS.findIndex((t) => t.bits.join("") === lowerBits.join(""));
  const upperIdx = TRIGRAMS.findIndex((t) => t.bits.join("") === upperBits.join(""));
  const cell = GUA_TABLE[lowerIdx]?.[upperIdx] ?? ["?", "?"];
  return { name: cell[0], char: cell[1] };
}

// Coin toss → yao value: 3 coins, heads(正)=3, tails(反)=2.
// sum 6 = 老阴(动), 7 = 少阳, 8 = 少阴, 9 = 老阳(动)
export type CoinYao = { coins: ("正" | "反")[]; sum: number; yang: 0 | 1; changing: boolean; label: string };
export function tossCoins(): CoinYao {
  const coins = [0, 0, 0].map(() => (Math.random() < 0.5 ? "正" : "反")) as ("正" | "反")[];
  const sum = coins.reduce((s, c) => s + (c === "正" ? 3 : 2), 0);
  const yang = (sum % 2 === 1 ? 1 : 0) as 0 | 1;
  const changing = sum === 6 || sum === 9;
  const label =
    sum === 6 ? "老阴 · 变" : sum === 7 ? "少阳" : sum === 8 ? "少阴" : "老阳 · 变";
  return { coins, sum, yang, changing, label };
}

// Build a CoinYao from a raw sum (6/7/8/9) — for synthetic methods.
export function yaoFromSum(sum: 6 | 7 | 8 | 9): CoinYao {
  const yang = (sum % 2 === 1 ? 1 : 0) as 0 | 1;
  const changing = sum === 6 || sum === 9;
  const label =
    sum === 6 ? "老阴 · 变" : sum === 7 ? "少阳" : sum === 8 ? "少阴" : "老阳 · 变";
  const coins: ("正" | "反")[] =
    sum === 9 ? ["正", "正", "正"]
      : sum === 8 ? ["正", "反", "反"]
      : sum === 7 ? ["正", "正", "反"]
      : ["反", "反", "反"];
  return { coins, sum, yang, changing, label };
}

// Meihua: lower trigram from (a%8)||8, upper from (b%8)||8, changing yao from (c%6)||6.
export function meihuaToYao(a: number, b: number, c: number): CoinYao[] {
  const lowerIdx = ((a % 8) || 8) - 1;
  const upperIdx = ((b % 8) || 8) - 1;
  const changing = ((c % 6) || 6) - 1;
  const bits = [...TRIGRAMS[lowerIdx].bits, ...TRIGRAMS[upperIdx].bits];
  return bits.map((bit, i) =>
    yaoFromSum(i === changing ? (bit === 1 ? 9 : 6) : bit === 1 ? 7 : 8)
  );
}

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 年份 → 地支序数 1=子 … 12=亥 */
export function yearBranchNum(year: number): number {
  return ((year - 4) % 12) + 1;
}

/** 公历年份 → 干支年（如 丙午） */
export function ganzhiYear(year: number): string {
  return GAN[(year - 4) % 10] + ZHI[(year - 4) % 12];
}

/** 24 小时制 → 十二时辰序数 1=子 … 12=亥 */
export function hourToShichen(hour: number): number {
  if (hour === 23 || hour === 0) return 1;
  return Math.floor((hour + 1) / 2) + 1;
}

export function shichenName(hour: number): string {
  return ZHI[hourToShichen(hour) - 1];
}

export type MeihuaTimeParts = {
  year: number;
  ganzhi: string;
  yearBranch: number;
  month: number;
  day: number;
  hour24: number;
  minute: number;
  shichen: number;
  shichenLabel: string;
};

/**
 * 梅花易数 · 时间起卦（公历 + 年支 + 十二时辰）
 * 下卦数 = 年支 + 月 + 日
 * 上卦数 = 年支 + 月 + 日 + 时辰
 * 动爻数 = 年支 + 月 + 日 + 时辰 + 分（分仅用于同一时辰内区分，取模后仍合古法）
 */
export function meihuaFromDate(d = new Date()): {
  a: number;
  b: number;
  c: number;
  parts: MeihuaTimeParts;
  summary: string;
} {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour24 = d.getHours();
  const minute = d.getMinutes();
  const yearBranch = yearBranchNum(year);
  const shichen = hourToShichen(hour24);
  const shichenLabel = ZHI[shichen - 1];
  const ganzhi = ganzhiYear(year);

  const a = yearBranch + month + day;
  const b = yearBranch + month + day + shichen;
  const c = yearBranch + month + day + shichen + minute;

  const pad = (n: number) => String(n).padStart(2, "0");
  const summary =
    `${ganzhi}年 · ${month}月${day}日 · ${shichenLabel}时（${pad(hour24)}:${pad(minute)}）` +
    ` → 下${a} · 上${b} · 动${c}`;

  return {
    a,
    b,
    c,
    parts: { year, ganzhi, yearBranch, month, day, hour24, minute, shichen, shichenLabel },
    summary,
  };
}

/** 与 meihuaToYao 一致的卦序预览 */
export function meihuaTrigramIndex(n: number): number {
  return ((n % 8) || 8) - 1;
}

export function meihuaChangingLine(n: number): number {
  return ((n % 6) || 6);
}

// Yarrow stalks: probability-correct distribution.
export function yarrowYao(): CoinYao {
  const r = Math.random();
  let sum: 6 | 7 | 8 | 9;
  if (r < 3 / 16) sum = 9;
  else if (r < 3 / 16 + 5 / 16) sum = 7;
  else if (r < 3 / 16 + 5 / 16 + 7 / 16) sum = 8;
  else sum = 6;
  return yaoFromSum(sum);
}

export const CATEGORIES = [
  // 墨金 · 观象 — 全部用同一鎏金体系，仅以微透明度区分语义
  { id: "career",       label: "事业", color: "#D4AF37", bg: "rgba(212,175,55,0.06)", textColor: "#D4AF37", borderColor: "rgba(212,175,55,0.35)" },
  { id: "family",       label: "家庭", color: "#D4AF37", bg: "rgba(212,175,55,0.06)", textColor: "#D4AF37", borderColor: "rgba(212,175,55,0.35)" },
  { id: "relationship", label: "情感", color: "#D4AF37", bg: "rgba(212,175,55,0.06)", textColor: "#D4AF37", borderColor: "rgba(212,175,55,0.35)" },
  { id: "health",       label: "健康", color: "#D4AF37", bg: "rgba(212,175,55,0.06)", textColor: "#D4AF37", borderColor: "rgba(212,175,55,0.35)" },
  { id: "fate",         label: "际遇", color: "#D4AF37", bg: "rgba(212,175,55,0.06)", textColor: "#D4AF37", borderColor: "rgba(212,175,55,0.35)" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const QUESTIONS: Record<CategoryId, string[]> = {
  career: ["这份工作该不该辞", "创业时机是否成熟", "这个合作对象可信吗", "升职机会能否把握住", "项目要不要继续推进"],
  family: ["家里最近矛盾很多，何时能缓", "要不要在这个城市扎根", "这个家宅适不适合我们", "亲子关系出了问题，怎么看", "家庭这段时间的整体运势"],
  relationship: ["他/她对我有意吗", "这段感情还有未来吗", "要不要主动表白", "分手后还能复合吗", "婚姻是否合适"],
  health: ["近期身体状态如何", "这个手术时机合适吗", "焦虑状态何时好转", "慢性病调养方向", "整体运势与健康"],
  fate: ["现在适合投资吗", "买还是等", "两个选择怎么选", "现在动手还是再等等", "这个机会该不该抓住"],
};

/** 由预设问题文案反查所属类别（用于 URL 只带 q 时的映射） */
export function findCategoryByQuestion(q: string): CategoryId | null {
  for (const [cat, qs] of Object.entries(QUESTIONS) as [CategoryId, string[]][]) {
    if (qs.includes(q)) return cat;
  }
  return null;
}

export function isPresetQuestion(q: string, category?: CategoryId): boolean {
  if (category) return QUESTIONS[category].includes(q);
  return findCategoryByQuestion(q) != null;
}

export type ResolvedQuestion = {
  category: CategoryId;
  question: string;
  custom: string;
  qPreset: boolean;
};

/** 将 URL / 深链中的 category + q 解析为表单初始状态 */
export function resolveQuestionFromSearch(
  category?: CategoryId,
  q?: string,
): ResolvedQuestion {
  const catFromQ = q ? findCategoryByQuestion(q) : null;
  const resolvedCategory = catFromQ ?? category ?? "career";
  const qPreset = q ? QUESTIONS[resolvedCategory].includes(q) : false;

  if (qPreset && q) {
    return { category: resolvedCategory, question: q, custom: "", qPreset: true };
  }
  if (q) {
    return {
      category: resolvedCategory,
      question: QUESTIONS[resolvedCategory][0],
      custom: q,
      qPreset: false,
    };
  }
  return {
    category: resolvedCategory,
    question: QUESTIONS[resolvedCategory][0],
    custom: "",
    qPreset: false,
  };
}

// Static fallback interpretation copy for the prototype (no AI call yet)
export const DIMENSION_TITLES: Record<CategoryId, [string, string, string, string]> = {
  career: ["时机判断", "隐患与阻力", "具体建议", "结果走向"],
  family: ["现状格局", "各方心态", "核心矛盾", "建议行动"],
  relationship: ["缘分磁场", "对方心意", "关系障碍", "发展走向"],
  health: ["五行对应", "调养方向", "注意事项", "时运节点"],
  fate: ["选项利弊", "核心变量", "风险提示", "卦象倾向"],
};

export const INTERPRETATION_FRAMEWORKS: Record<CategoryId, { dims: string[] }> = {
  career: { dims: [...DIMENSION_TITLES.career] },
  family: { dims: [...DIMENSION_TITLES.family] },
  relationship: { dims: [...DIMENSION_TITLES.relationship] },
  health: { dims: [...DIMENSION_TITLES.health] },
  fate: { dims: [...DIMENSION_TITLES.fate] },
};

// ─── Local history persistence (browser only) ──────────────────────────────

import type { InterpretFollowUpHints } from "@/lib/common-questions";
import type { InterpretFacts } from "@/lib/interpret-facts";

/** 与 interpret.local InterpretSection 结构兼容，避免 iching ↔ interpret 循环依赖 */
export type HistoryInterpretSection = {
  title: string;
  kind?: string;
  lines?: { classic?: string; analysis?: string }[];
  body?: string;
  classic?: string;
  analysis?: string;
};

export type HistoryRecord = {
  id: string;
  createdAt: number;
  category: CategoryId;
  question: string;
  benName: string;
  benChar: string;
  bianName?: string;
  bianChar?: string;
  changingLine: number; // 0..6 (0 = none)
  yao: { yang: 0 | 1; changing: boolean; label: string }[];
  interpretation: string;
  /** 结构化解读段落（云端存档）；无则从前端 parseSections(interpretation) 回退 */
  sections?: HistoryInterpretSection[];
  facts?: InterpretFacts;
  followUp?: InterpretFollowUpHints;
};

const HISTORY_KEY = "iching:history";

export function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveHistoryRecord(rec: HistoryRecord) {
  if (typeof window === "undefined") return;
  if (!rec.benName || rec.benName === "?" || !rec.benChar || rec.benChar === "?") return;
  const all = loadHistory();
  const idx = all.findIndex((r) => r.id === rec.id);
  if (idx >= 0) all[idx] = rec;
  else all.unshift(rec);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(0, 100)));
}

export function getHistoryRecord(id: string): HistoryRecord | undefined {
  return loadHistory().find((r) => r.id === id);
}

/** 云端 id 与本地 UUID 不一致时，按同题相近时间匹配本机档案 */
export function findNearLocalHistory(
  question: string,
  createdAt: number,
  windowMs = 5 * 60 * 1000,
): HistoryRecord | undefined {
  const q = question.trim();
  return loadHistory().find(
    (r) => r.question.trim() === q && Math.abs(r.createdAt - createdAt) < windowMs,
  );
}

export function resolveHistoryById(id: string): HistoryRecord | undefined {
  const direct = getHistoryRecord(id);
  if (direct) return direct;
  if (/^\d+$/.test(id)) return undefined;
  return loadHistory().find((r) => r.id === id);
}

/** 将本机档案 id 对齐为云端 recordId，避免列表点进 404 */
export function rekeyHistoryRecord(oldId: string, newId: string) {
  if (typeof window === "undefined" || oldId === newId) return;
  const all = loadHistory();
  const idx = all.findIndex((r) => r.id === oldId);
  if (idx < 0) return;
  const rec = { ...all[idx], id: newId };
  const withoutOld = all.filter((r) => r.id !== oldId);
  const dupIdx = withoutOld.findIndex((r) => r.id === newId);
  if (dupIdx >= 0) withoutOld[dupIdx] = rec;
  else withoutOld.unshift(rec);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(withoutOld.slice(0, 100)));
}

export function deleteHistoryRecord(id: string) {
  if (typeof window === "undefined") return;
  const all = loadHistory().filter((r) => r.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const day = 24 * 60 * 60 * 1000;
  const sameDay = new Date(ts).toDateString() === new Date().toDateString();
  if (sameDay) return "今天";
  if (diff < 2 * day) return "昨天";
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} 周前`;
  return `${Math.floor(diff / (30 * day))} 个月前`;
}