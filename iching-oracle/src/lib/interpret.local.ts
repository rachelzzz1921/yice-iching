/**
 * 本地卦辞解读引擎（不调用 AI）
 * 以 guaci-db 六十四卦辞/爻辞/象辞/彖辞为据，按问事类别结构化输出
 */

import type { CategoryId, CoinYao } from "@/lib/iching";
import { INTERPRETATION_FRAMEWORKS } from "@/lib/iching";
import { resolveCurated } from "@/lib/curated-readings";
import { formatStrategyBlock, getHexStrategy } from "@/lib/hexagram-strategy";
import {
  buildPracticalDimensionLines,
  supplementCuratedSection,
  type PracticalCtx,
} from "@/lib/interpret-practical";
import { buildMeihuaLayers } from "@/lib/meihua-interpret";
import { applyFiveFieldSections, buildInterpretLayerBundle } from "@/lib/interpret-pipeline";
import {
  linesToAnalysis,
  paragraphsToLines,
  textToLines,
  type InterpretLine,
} from "@/lib/interpret-format";
import { getGuaciByName, getYaociByName, type GuaciEntry } from "@/lib/guaci";
import type { CastMethod } from "@/lib/profile";

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

export type InterpretInput = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
  changingLine: number;
  /** 起卦方式；梅花时启用体用/互卦时间层 */
  castMethod?: CastMethod;
  /** 六爻（梅花体用需要） */
  yao?: { yang: 0 | 1; changing: boolean; label?: string }[];
};

export type { InterpretLine } from "@/lib/interpret-format";

export type InterpretSectionKind =
  | "overview"
  | "headline"
  | "dimension"
  | "synopsis"
  | "verdict"
  | "timing"
  | "action";

export type InterpretSection = {
  title: string;
  /** 段落角色：总览 / 分维 / 断语 */
  kind?: InterpretSectionKind;
  /** 结构化正文（结果页优先使用） */
  lines?: InterpretLine[];
  /** 无 classic/analysis 时的合并正文（兼容旧数据） */
  body?: string;
  /** 卦辞/象辞/爻辞等原文 */
  classic?: string;
  /** 扁平正文（存档与 AI 润色用） */
  analysis?: string;
};

import type { ZhipuTestBlock } from "@/lib/zhipu-generate";
import type { InterpretFollowUpHints } from "@/lib/common-questions";
import type { InterpretFacts } from "@/lib/interpret-facts";

export type InterpretResult = {
  text: string;
  sections: InterpretSection[];
  /** 智谱完整生成测试块（与正式本地解读并列展示） */
  zhipuTest?: ZhipuTestBlock;
  /** 深入追问是否可用（已配置 ZHIPU_API_KEY） */
  aiFollowUpEnabled?: boolean;
  /** 常见问题匹配的追问引导（问候 + 推荐 chips） */
  followUp?: InterpretFollowUpHints;
  /** 语料库客观卦象事实（卦辞/爻辞/象辞/变卦/五行） */
  facts?: InterpretFacts;
};

const CLASSIC_MARKER = "⟦原文⟧";

function sectionPlainBody(s: InterpretSection): string {
  const analysis = s.analysis ?? (s.lines?.length ? linesToAnalysis(s.lines) : undefined);
  if (s.classic && analysis) {
    return `${CLASSIC_MARKER}\n${s.classic}\n\n${analysis}`;
  }
  return analysis ?? s.body ?? s.classic ?? "";
}

function inferSectionKind(s: InterpretSection): InterpretSectionKind {
  if (s.kind) return s.kind;
  if (s.title === "断语") return "verdict";
  if (s.title === "一句话定性") return "headline";
  if (s.title === "时间节点") return "timing";
  if (s.title === "行动锚点") return "action";
  if (s.title === "卦象气场") return "overview";
  return "dimension";
}

function normalizeSection(s: InterpretSection): InterpretSection {
  const kind = inferSectionKind(s);
  const lines =
    s.lines?.length ? s.lines : textToLines(s.analysis ?? s.body ?? "").filter((l) => l.text);
  const analysis = lines.length ? linesToAnalysis(lines) : s.analysis ?? s.body;
  const next = { ...s, kind, lines: lines.length ? lines : undefined, analysis };
  return { ...next, body: sectionPlainBody(next) };
}

function finalize(sections: InterpretSection[]): InterpretResult {
  const normalized = sections.map(normalizeSection);
  const text = normalized.map((s) => `【${s.title}】\n${s.body}`).join("\n\n");
  return { text, sections: normalized };
}

/** 将 AI 解析出的 sections 规范化为 InterpretResult */
export function finalizeInterpretSections(sections: InterpretSection[]): InterpretResult {
  return finalize(sections);
}

function clip(s: string, max = 120): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function extractJunji(guaci: string): "吉" | "凶" | "慎" {
  if (/凶|厉|悔|吝|溃|穷|不利|无攸利/.test(guaci)) return "凶";
  if (/吉|亨|元吉|利贞|无咎/.test(guaci)) return "吉";
  return "慎";
}

function xiangAdvice(xiangci: string): string {
  const m = xiangci.match(/君子以(.+?)[。；]?$/);
  return m ? m[1] : xiangci.replace(/；.*/, "");
}

type DimCtx = {
  gua: GuaciEntry;
  bian: GuaciEntry | null;
  yaoci: ReturnType<typeof getYaociByName>;
  input: InterpretInput;
  dong: string;
};

/** 本卦 × 问事 一句话象意（总览用，非照抄彖辞） */
const GUA_SCENE: Partial<Record<string, Partial<Record<CategoryId, string>>>> = {
  蒙: {
    career:
      "蒙如山下出泉——职场里常是规则、立场、自身筹码尚未看清，就急着用「走或留」来解套。",
    relationship: "感情里蒙昧多来自猜心：看清自己的需要，比猜对方心思更紧要。",
    fate: "选项背后还有你没问出口的前提，先补信息再下注。",
    health: "身与心皆需「启蒙」：先找可验证的原因，再谈调养。",
  },
  涣: {
    career: "涣为风行水上——僵局有松动、人心有流动，变局里宜先定去向，防散而无聚。",
    relationship: "关系从胶着转向可呼吸，但需约定边界，免因疏远而生误会。",
    fate: "分散的旧局可收束，新选择宜聚焦一条主道。",
    health: "宜疏不宜堵：情绪与作息先理顺，再论进补。",
  },
  鼎: {
    career: "鼎为烹熟成物——积累到临界点，关键在「怎么变」而非「动不动」。",
  },
  屯: {
    career: "屯为草昧初创——万事开头难，宜经纶蓄势，忌因焦虑拔苗。",
    relationship: "缘分初萌，迟滞未必无情，多是时机未到。",
  },
  泰: {
    fate: "泰为通泰，但通极则变——重大抉择要算清「盛极」后的维护成本。",
  },
  未济: {
    health: "未济事未成——身体在将好未好之际，最忌急躁与过度消耗。",
  },
  乾: {
    career: "乾为健行——位阶与责任同步上升，宜借势而不宜孤冲。",
  },
  坤: {
    relationship: "坤为承载——以稳定、包容、边界感经营关系，胜过正面硬碰。",
  },
  坎: {
    fate: "坎为险中行——先求小得、先保退路，再图大举。",
  },
  离: {
    relationship: "离为附丽光明——温暖可亲近，但忌把短暂热烈当长期承诺。",
  },
  震: {
    health: "震为惊动修省——先安神定绪，再调形体，惊过反吉。",
  },
  既济: {
    fate: "既济事成而「终乱」在侧——成败在收尾，忌临门加码过猛。",
  },
};

function buildClassicBlock(ctx: DimCtx): string {
  const { gua, bian, yaoci, input } = ctx;
  const lines = [`${gua.name}卦 ${gua.char}`, gua.xiangci, `卦辞：${gua.guaci}`];
  if (yaoci) {
    lines.push(`${yaoci.position}：${yaoci.text}`);
    if (yaoci.xiang) lines.push(`象曰：${yaoci.xiang}`);
  }
  if (bian) {
    const bianYao = input.changingLine ? getYaociByName(bian.name, input.changingLine) : null;
    lines.push("", `变卦 ${bian.name} ${bian.char}`, bian.xiangci, `卦辞：${bian.guaci}`);
    if (bianYao) {
      lines.push(`${bianYao.position}：${bianYao.text}`);
      if (bianYao.xiang) lines.push(`象曰：${bianYao.xiang}`);
    }
  }
  return lines.join("\n");
}

function questionHook(category: CategoryId, question: string): string {
  const q = question;
  if (category === "career" && /辞|离职|跳槽|换工作|该不该留/.test(q)) {
    return "你问的是「走还是留」——卦象看的不是冲动，而是筹码、退路、下家与时机是否同频。";
  }
  if (category === "relationship" && /有意|喜欢|在一起|复合|表白/.test(q)) {
    return "你问的是心意与走向——卦象提醒先看节奏是否同频，而非单方面加码。";
  }
  if (category === "family" && /矛盾|紧张|亲子|家宅|扎根|家庭/.test(q)) {
    return "你问的是家里的事——卦象看的是气场与各方心态，先辨清是外压还是内裂，再谈下一步。";
  }
  if (category === "fate" && /投资|买|选|机会|动手|等/.test(q)) {
    return "你问的是重大取舍——卦象强调过渡期成本与退路，而非一时好恶。";
  }
  if (category === "health" && /身体|手术|焦虑|调养/.test(q)) {
    return "你问的是状态与愈期——宜身心同调、循序观察，卦象辅理而不代医。";
  }
  return `就你所问「${q}」——以下从卦象落到可执行的现实切面。`;
}

function guaSceneLine(gua: GuaciEntry, category: CategoryId): string {
  return (
    GUA_SCENE[gua.name]?.[category] ??
    `「${gua.name}」卦当前象意：宜「${xiangAdvice(gua.xiangci)}」，观时而动。`
  );
}

function toneLine(tone: "吉" | "凶" | "慎"): string {
  return tone === "吉"
    ? "吉凶偏吉，有机会窗口，但仍忌躁进。"
    : tone === "凶"
      ? "吉凶示警，宜先止损、保底，再谈进取。"
      : "吉凶平中见慎，可谋不可赌，宜先验证再放大。";
}

function categoryHint(ctx: DimCtx): string {
  const { gua, bian, input } = ctx;
  if (input.category === "career" && /辞|离职|跳槽/.test(input.question) && gua.name === "蒙") {
    return "蒙卦示「还没看清就辞」风险最大：用六周核对下家、现金流、交接成本、职业叙事，四项至少三项达标再动。";
  }
  if (input.category === "career" && bian?.name === "涣") {
    return "涣象松动：若环境难继，离开可能是抽身出僵局，但要提前想好「散而后聚」的落点。";
  }
  if (input.category === "relationship") {
    return "别用单次冷淡或热情定论；看对方是否愿意投入稀缺资源（时间、公开身份、未来安排）。";
  }
  if (input.category === "fate") {
    return "直接选最坏情况仍承受得起、且最接近三年目标的那一项——把得到/失去/能否撤回写清再定。";
  }
  if (input.category === "family") {
    return "家里的事先辨外压还是内裂；7天内做一件可执行的小步，忌在饭桌上当众摊牌。";
  }
  if (input.category === "health") {
    return "卦象辅理不代医；宜记录 4–6 周睡眠与精力曲线，用趋势判断，不用单日好坏吓自己。";
  }
  return "把卦象当镜子对照筹码与节奏，而非替你做按钮；未来六周会出现一个「小验证」节点。";
}

function buildAtmosphereLines(ctx: DimCtx): InterpretLine[] {
  const { gua, bian, yaoci, input } = ctx;
  const tone = extractJunji(bian?.guaci ?? gua.guaci);
  const advice = xiangAdvice(gua.xiangci);
  const lines: InterpretLine[] = [
    { text: questionHook(input.category, input.question) },
    {
      label: "本卦",
      text: `${guaSceneLine(gua, input.category)} ${toneLine(tone)} 宜「${advice}」。`,
    },
  ];

  if (bian) {
    lines.push({
      label: "变卦",
      text: `变而为${bian.name}——${guaSceneLine(bian, input.category)} 问题不会停在原地，但变不等于乱动，先定去向再动身。`,
    });
  }

  if (yaoci) {
    lines.push({
      label: "动爻",
      text:
        input.category === "career"
          ? `${yaoci.position}与「${yaoci.text.replace(/[。；]$/, "")}」相应——先处理这一层，再议去留。`
          : `${yaoci.position}提醒你：${yaoci.text.replace(/[。；]$/, "")}。`,
    });
  }

  if (input.category === "career" || input.category === "fate") {
    lines.push(...paragraphsToLines(formatStrategyBlock(gua.name, input.category)));
  }

  const yaoList = toYaoList(input);
  if (input.castMethod === "meihua" && yaoList && input.changingLine >= 1) {
    const layers = buildMeihuaLayers(yaoList, input.changingLine, gua, bian);
    if (layers) lines.push(...layers.lines);
  }

  lines.push({ label: "提示", text: categoryHint(ctx) });
  return lines;
}

function toYaoList(input: InterpretInput): CoinYao[] | null {
  if (!input.yao || input.yao.length !== 6) return null;
  return input.yao.map((y, i) => ({
    yang: y.yang,
    changing: y.changing,
    label: y.label ?? `第${YAO_POS[i]}爻`,
    coins: ["正", "正", "正"] as ("正" | "反")[],
    sum: y.yang ? 7 : 8,
  }));
}

function buildAtmosphere(ctx: DimCtx): Pick<InterpretSection, "classic" | "lines"> {
  return {
    classic: buildClassicBlock(ctx),
    lines: buildAtmosphereLines(ctx),
  };
}

function toPracticalCtx(ctx: DimCtx): PracticalCtx {
  return {
    gua: ctx.gua,
    bian: ctx.bian,
    yaoci: ctx.yaoci,
    input: ctx.input,
  };
}

function buildDimensionLines(_dim: string, index: number, ctx: DimCtx): InterpretLine[] {
  return buildPracticalDimensionLines(toPracticalCtx(ctx), index);
}

function buildVerdict(ctx: DimCtx): string {
  const { gua, bian, yaoci, input } = ctx;
  const tone = extractJunji(bian?.guaci ?? gua.guaci);
  const yaoHint = yaoci ? yaoci.text.replace(/[。；]$/, "") : "";

  const verdicts: Record<CategoryId, Record<"吉" | "凶" | "慎", string>> = {
    career: {
      吉: "时机渐熟，宜稳进，不可躁进。",
      凶: "守正待时，厚积薄发，勿因焦虑妄动。",
      慎: "方向未终定，宜小步验证后再大举。",
    },
    relationship: {
      吉: "以诚相待，顺缘而进，勿强求。",
      凶: "宜缓不宜急，给关系留出呼吸空间。",
      慎: "心结在动爻，坦诚一次胜过反复试探。",
    },
    family: {
      吉: "家气和合，宜小步沟通，忌当众摊牌。",
      凶: "先止内耗，减冲突、留余地，再谈结构。",
      慎: "各方心态未齐，宜单独谈感受，再议大事。",
    },
    fate: {
      吉: "权衡已足，可行之选已现，小步验证即可。",
      凶: "当守则守，忌孤注一掷。",
      慎: "两可之间，先保底线再求增量。",
    },
    health: {
      吉: "养正则吉，循序调理，勿以欲速而伤本。",
      凶: "先止耗散，减负荷、规律作息，三月为一疗程。",
      慎: "身心同调，勿忽视小节之警。",
    },
  };

  const base = verdicts[input.category][tone];
  if (yaoHint && yaoHint.length < 20) {
    return `「${yaoHint}」——${base}`;
  }
  return base;
}

function buildFromGuaci(input: InterpretInput): InterpretResult {
  const gua = getGuaciByName(input.benName);
  if (!gua) return buildFallback(input);

  const bian = input.bianName ? getGuaciByName(input.bianName) : null;
  const yaoci = input.changingLine ? getYaociByName(input.benName, input.changingLine) : null;
  const dims = INTERPRETATION_FRAMEWORKS[input.category].dims;
  const dong = input.changingLine
    ? `第${YAO_POS[input.changingLine - 1]}爻为动爻`
    : "无动爻";

  const ctx: DimCtx = { gua, bian, yaoci, input, dong };

  const atmosphere = buildAtmosphere(ctx);

  return finalize([
    { title: "卦象气场", kind: "overview", ...atmosphere },
    ...dims.map((title, i) => ({
      title,
      kind: "dimension" as const,
      lines: buildDimensionLines(title, i, ctx),
    })),
    { title: "断语", kind: "verdict", body: buildVerdict(ctx) },
  ]);
}

/** 卦名不在库中时的兜底（理论上 64 卦全覆盖后极少触发） */
function buildFallback(input: InterpretInput): InterpretResult {
  const dims = INTERPRETATION_FRAMEWORKS[input.category].dims;
  const dong = input.changingLine
    ? `第${YAO_POS[input.changingLine - 1]}爻动`
    : "无动爻";
  const bian = input.bianName ? `，变而为${input.bianName}卦` : "";

  return finalize([
    {
      title: "卦象气场",
      kind: "overview",
      lines: [{ text: `本卦${input.benName}卦${bian}，${dong}。就「${input.question}」而言，请先静观卦象，再定进退。` }],
    },
    ...dims.map((title) => ({
      title,
      kind: "dimension" as const,
      lines: [{ text: `${title}：${input.benName}卦象需结合现实处境体悟。` }],
    })),
    { title: "断语", kind: "verdict", body: "心定则卦明，宜守中待变。" },
  ]);
}

function enrichCuratedSections(input: InterpretInput, sections: InterpretSection[]): InterpretSection[] {
  const gua = getGuaciByName(input.benName);
  if (!gua) return sections;

  const bian = input.bianName ? getGuaciByName(input.bianName) : null;
  const yaoci = input.changingLine ? getYaociByName(input.benName, input.changingLine) : null;
  const dong = input.changingLine
    ? `第${YAO_POS[input.changingLine - 1]}爻为动爻`
    : "无动爻";
  const ctx: DimCtx = { gua, bian, yaoci, input, dong };

  return sections.map((s) => {
    if (s.title === "卦象气场") {
      const base = s.body ?? s.analysis ?? "";
      return {
        title: s.title,
        kind: "overview" as const,
        classic: buildClassicBlock(ctx),
        lines: base ? textToLines(base) : buildAtmosphereLines(ctx),
      };
    }
    const base = s.body ?? s.analysis ?? "";
    const supplemented = supplementCuratedSection(toPracticalCtx(ctx), s.title, base);
    return {
      title: s.title,
      kind: "dimension" as const,
      lines: textToLines(supplemented),
    };
  });
}

function finalizeWithPipeline(input: InterpretInput, sections: InterpretSection[]): InterpretResult {
  const layer2 = buildInterpretLayerBundle(input);
  const gua = getGuaciByName(input.benName);
  const actionFallback = gua
    ? categoryHint({
        gua,
        bian: input.bianName ? getGuaciByName(input.bianName) : null,
        yaoci: input.changingLine ? getYaociByName(input.benName, input.changingLine) : null,
        input,
        dong: input.changingLine
          ? `第${YAO_POS[input.changingLine - 1]}爻为动爻`
          : "无动爻",
      })
    : "把卦象当镜子对照节奏，先完成一件本周可验证的小事。";
  const structured = applyFiveFieldSections(input, sections, actionFallback, layer2);
  return finalize(structured);
}

export function interpretLocally(input: InterpretInput): InterpretResult {
  const curated = resolveCurated(input);
  if (curated) {
    return finalizeWithPipeline(input, enrichCuratedSections(input, curated.sections));
  }

  return finalizeWithPipeline(input, buildFromGuaci(input).sections);
}

export { composeFollowUpReply as followUpLocally } from "@/lib/followup-engine";

function splitSectionBody(raw: string): Pick<InterpretSection, "classic" | "analysis" | "body"> {
  const trimmed = raw.trim();
  if (trimmed.startsWith(CLASSIC_MARKER)) {
    const rest = trimmed.slice(CLASSIC_MARKER.length).trimStart();
    const nl = rest.indexOf("\n\n");
    if (nl >= 0) {
      return {
        classic: rest.slice(0, nl).trim(),
        analysis: rest.slice(nl + 2).trim(),
      };
    }
  }
  return { body: trimmed };
}

export function parseSections(text: string): InterpretSection[] {
  const out: InterpretSection[] = [];
  const re = /【([^】]+)】\s*([\s\S]*?)(?=【|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ title: m[1].trim(), ...splitSectionBody(m[2]) });
  }
  return out;
}
