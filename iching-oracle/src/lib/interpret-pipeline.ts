/**
 * 五层解读流水线 · 层1/2（零 AI）
 *
 * 层1：客观 facts（卦辞/爻辞/象辞/结构）
 * 层2：模板拼装（常见问题 / 范例 / 开场白 / 时间窗 / prompt-layers）
 * 层3–5：见 interpret.local、ai-prompts、zhipu-followup
 */

import {
  formatProfileHintForPrompt,
  matchQuestionProfile,
  type QuestionProfileMatch,
} from "@/lib/common-questions";
import { resolveCurated } from "@/lib/curated-readings";
import { getGuaciByName } from "@/lib/guaci";
import { extractInterpretFacts, type InterpretFacts } from "@/lib/interpret-facts";
import type { InterpretInput, InterpretSection } from "@/lib/interpret.local";
import { getOpeners, getRandomOpener } from "@/lib/hexagramOpeners";
import { buildPrompt, formatPromptLayers, resolveYaoNature } from "@/lib/prompt-layers";
import { getYaoWeight, getTimingHint } from "@/lib/yaoWeights";
import type { CategoryId } from "@/lib/iching";
import { INTERPRETATION_FRAMEWORKS } from "@/lib/iching";
import { paragraphsToLines, textToLines, type InterpretLine } from "@/lib/interpret-format";

export type Layer2Context = {
  facts: InterpretFacts | null;
  profile: QuestionProfileMatch | null;
  profileHint: string;
  /** 开场白备选（层3 选一条改写；本地引擎取一条落地） */
  openerOptions: { tone: string; text: string }[];
  timingHint: string | null;
  /** 精选范例是否命中 */
  curatedHit: boolean;
  /** 写入层3 prompt 的语料块 */
  corpusLayersText: string;
};

export type FiveFieldCopy = {
  headline: string;
  timingNode: string;
  actionAnchor: string;
};

export const FIVE_FIELD_TITLES = {
  headline: "一句话定性",
  timing: "时间节点",
  action: "行动锚点",
  verdict: "断语",
} as const;

/** 层1：纯数据 facts */
export function buildLayer1Facts(input: InterpretInput): InterpretFacts | null {
  return extractInterpretFacts(input);
}

function yaoNatureFromFacts(
  input: InterpretInput,
  facts: InterpretFacts | null,
): 0 | 1 | null {
  const yin = facts?.changingLine?.yinyang;
  if (yin === "阳") return 1;
  if (yin === "阴") return 0;
  if (!input.changingLine) return null;
  const pos = facts?.changingLine?.position;
  const posLabel = pos ? `第${pos}爻` : "";
  const resolved = resolveYaoNature(posLabel, null);
  return resolved === 1 ? 1 : resolved === 0 ? 0 : null;
}

const OPENER_TONE_PREF: Record<CategoryId, string[]> = {
  career: ["direct", "warning", "encourage"],
  family: ["empathy", "direct", "poetic"],
  relationship: ["empathy", "poetic", "direct"],
  health: ["empathy", "encourage", "direct"],
  fate: ["direct", "warning", "poetic"],
};

function pickOpenerOptions(guaId: number, category: CategoryId): { tone: string; text: string }[] {
  const openers = getOpeners(guaId) as { tone: string; text: string }[];
  if (!openers.length) return [];
  const preferred = OPENER_TONE_PREF[category] ?? ["direct", "poetic", "empathy"];
  const selected = preferred
    .map((tone) => openers.find((o) => o.tone === tone))
    .filter((o): o is { tone: string; text: string } => !!o)
    .slice(0, 3);
  if (selected.length) return selected;
  const fallback = getRandomOpener(guaId) as { tone: string; text: string } | null;
  return fallback ? [fallback] : [];
}

function weaveHeadline(openerText: string, question: string, category: CategoryId): string {
  const q = question.length > 28 ? `${question.slice(0, 28)}…` : question;
  const labels: Record<CategoryId, string> = {
    career: "事业",
    family: "家庭",
    relationship: "情感",
    health: "健康",
    fate: "际遇",
  };
  if (/就你所问/.test(openerText)) return openerText;
  return `就${labels[category]}所问「${q}」——${openerText}`;
}

function defaultHeadline(input: InterpretInput, profile: QuestionProfileMatch | null): string {
  if (profile?.talkingPoints?.[0]) {
    return profile.talkingPoints[0].replace(/。$/, "") + "。";
  }
  return `就「${input.question}」而言，卦象先给方向，细节见下。`;
}

/** 层2：模板上下文（供层3 prompt 与本地五字段落地） */
export function buildLayer2Context(
  input: InterpretInput,
  facts?: InterpretFacts | null,
): Layer2Context {
  const layer1 = facts ?? buildLayer1Facts(input);
  const profile = matchQuestionProfile(input.question, input.category);
  const profileHint = formatProfileHintForPrompt(profile);
  const curatedHit = !!resolveCurated(input);

  const benGua = getGuaciByName(input.benName);
  const bianGua = input.bianName ? getGuaciByName(input.bianName) : null;

  let openerOptions: { tone: string; text: string }[] = [];
  let corpusLayersText = "";

  if (benGua) {
    openerOptions = pickOpenerOptions(benGua.id, input.category);
    const layers = buildPrompt({
      benGuaId: benGua.id,
      bianGuaId: bianGua?.id ?? null,
      category: input.category,
      changingLine: input.changingLine,
      yaoPosition: layer1?.changingLine?.position
        ? `第${layer1.changingLine.position}爻`
        : undefined,
      yaoYinyang: layer1?.changingLine?.yinyang ?? null,
    });
    corpusLayersText = layers.length ? formatPromptLayers(layers) : "";
  }

  let timingHint: string | null = null;
  if (input.changingLine >= 1 && input.changingLine <= 6) {
    const nature = yaoNatureFromFacts(input, layer1);
    if (nature !== null) {
      const w = getYaoWeight(input.changingLine, nature, input.category);
      if (w) timingHint = getTimingHint(input.changingLine, w.weight.final);
    }
  } else {
    timingHint = "静卦：未来 4–8 周为观察窗，按周复盘一次即可，不必因单日起伏改计划。";
  }

  return {
    facts: layer1,
    profile,
    profileHint,
    openerOptions,
    timingHint,
    curatedHit,
    corpusLayersText,
  };
}

export function buildInterpretLayerBundle(input: InterpretInput): Layer2Context {
  return buildLayer2Context(input);
}

/** 从层2 落地「一句话定性 / 时间节点 / 行动锚点」文案 */
export function buildFiveFieldCopy(
  input: InterpretInput,
  layer2: Layer2Context,
  actionFallback: string,
): FiveFieldCopy {
  const opener = layer2.openerOptions[0];
  const headline = opener
    ? weaveHeadline(opener.text, input.question, input.category)
    : defaultHeadline(input, layer2.profile);

  const timingNode = layer2.timingHint
    ? `时间节点：${layer2.timingHint} 用一件可在一个月内验收的小事验证方向，比空泛等待更有效。`
    : "时间节点：未来 4–6 周看趋势走向，本周先落实一件可量化的小步。";

  const anchor =
    layer2.profile?.talkingPoints?.[1] ??
    layer2.profile?.talkingPoints?.[0] ??
    actionFallback;

  return {
    headline,
    timingNode,
    actionAnchor: anchor.endsWith("。") ? anchor : `${anchor}。`,
  };
}

function isAtmosphereSection(s: InterpretSection): boolean {
  return s.title === "卦象气场" || s.kind === "overview";
}

function stripAtmosphereFromAiSections(sections: InterpretSection[]): InterpretSection[] {
  return sections.filter((s) => !isAtmosphereSection(s));
}

/** 将解读 sections 规范为层3 五字段 + 四分维 + 断语（卦象原文仅在 facts 区展示） */
export function applyFiveFieldSections(
  input: InterpretInput,
  sections: InterpretSection[],
  actionFallback: string,
  layer2?: Layer2Context,
): InterpretSection[] {
  const l2 = layer2 ?? buildLayer2Context(input);
  const copy = buildFiveFieldCopy(input, l2, actionFallback);

  const dims = INTERPRETATION_FRAMEWORKS[input.category].dims;
  const byTitle = new Map(sections.map((s) => [s.title.trim(), s]));

  const dimensionSections: InterpretSection[] = [];
  for (const title of dims) {
    const found = byTitle.get(title);
    if (found && !isAtmosphereSection(found)) {
      dimensionSections.push({ ...found, kind: "dimension", title });
      continue;
    }
    const loose = sections.find(
      (s) => s.kind === "dimension" && !dims.includes(s.title) && !isAtmosphereSection(s),
    );
    if (loose && dimensionSections.length < dims.length) {
      dimensionSections.push({ ...loose, kind: "dimension", title });
    }
  }
  if (dimensionSections.length === 0) {
    dimensionSections.push(
      ...stripAtmosphereFromAiSections(sections).filter((s) => s.kind === "dimension" || (!s.kind && s.title !== "断语")),
    );
  }

  const verdictSec =
    byTitle.get("断语") ??
    sections.find((s) => s.kind === "verdict") ??
    sections[sections.length - 1];

  const verdictBody =
    verdictSec?.analysis ??
    verdictSec?.body ??
    (verdictSec?.lines?.length ? verdictSec.lines.map((l) => l.text).join(" ") : "心定则卦明，宜守中待变。");

  const headlineSection: InterpretSection = {
    title: FIVE_FIELD_TITLES.headline,
    kind: "headline",
    lines: [{ text: copy.headline }],
  };

  const timingSection: InterpretSection = {
    title: FIVE_FIELD_TITLES.timing,
    kind: "timing",
    lines: [{ text: copy.timingNode }],
  };

  const actionSection: InterpretSection = {
    title: FIVE_FIELD_TITLES.action,
    kind: "action",
    lines: [{ text: copy.actionAnchor }],
  };

  const verdictOut: InterpretSection = {
    title: FIVE_FIELD_TITLES.verdict,
    kind: "verdict",
    lines: textToLines(verdictBody),
    body: verdictBody,
  };

  return [headlineSection, ...dimensionSections.slice(0, 4), verdictOut, timingSection, actionSection];
}

export function sectionToPlainLines(section: InterpretSection): string {
  if (section.lines?.length) {
    return section.lines.map((l) => (l.label ? `${l.label}：${l.text}` : l.text)).join("\n");
  }
  return section.analysis ?? section.body ?? "";
}

export function linesFromFiveField(section: InterpretSection): InterpretLine[] {
  return section.lines ?? textToLines(section.analysis ?? section.body ?? "");
}
