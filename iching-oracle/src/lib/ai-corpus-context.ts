/**
 * 全 AI 解读 · 语料库 Prompt 组装
 * 接通：guaci 卦辞库、prompt-layers（卦性/动爻/变卦/范例）、梅花策略、问事画像
 */

import { formatProfileHintForPrompt, matchQuestionProfile } from "@/lib/common-questions";
import {
  buildInterpretContext,
  formatHexFactsBrief,
  type InterpretContextPayload,
} from "@/lib/interpret-context";
import { extractInterpretFacts, type InterpretFacts } from "@/lib/interpret-facts";
import { formatStrategyBlock } from "@/lib/hexagram-strategy";
import type { InterpretInput } from "@/lib/interpret.local";
import { getGuaciByName } from "@/lib/guaci";
import { buildPrompt, formatPromptLayers } from "@/lib/prompt-layers";

export type AiCorpusBundle = {
  ctx: InterpretContextPayload;
  facts: InterpretFacts | null;
  /** prompt-layers：hexagramEssence / yaoWeights / bianguaTransitions / openers / curatedReadings */
  corpusLayers: string;
  /** 原始 layer 列表，供 P2 补充语料筛选 */
  promptLayers: ReturnType<typeof buildPrompt>;
  strategyHint: string;
  meihuaHint: string;
  profileHint: string;
  structureBrief: string;
};

function yaoYinyangFromCtx(ctx: InterpretContextPayload): "阳" | "阴" | null {
  const pos = ctx.changingYao?.position;
  if (!pos) return null;
  if (/九/.test(pos)) return "阳";
  if (/六/.test(pos)) return "阴";
  return null;
}

function formatFactsBrief(facts: InterpretFacts): string {
  const lines = [
    `本卦 ${facts.benGua.name}${facts.benGua.char} · 下${facts.benGua.lower}上${facts.benGua.upper}（${facts.benGua.lowerWuxing}/${facts.benGua.upperWuxing}）`,
  ];
  if (facts.changingLine) {
    const y = facts.changingLine.yinyang ? `${facts.changingLine.yinyang}爻` : "动爻";
    lines.push(
      `${y} 第${facts.changingLine.position}爻：${facts.changingLine.yaoci ?? "—"}`,
    );
  } else {
    lines.push("静卦（无动爻）");
  }
  if (facts.bianGua) {
    lines.push(
      `变卦 ${facts.bianGua.name}${facts.bianGua.char} · 下${facts.bianGua.lower}上${facts.bianGua.upper}`,
    );
  }
  return lines.join("\n");
}

function buildStrategyHint(input: InterpretInput): string {
  if (input.category !== "career" && input.category !== "fate") return "";
  const lines = formatStrategyBlock(input.benName, input.category);
  if (input.bianName) {
    lines.push(...formatStrategyBlock(input.bianName, input.category));
  }
  return lines.join("\n");
}

function buildMeihuaHint(ctx: InterpretContextPayload): string {
  if (!ctx.meihua) return "";
  const layerLines = ctx.meihua.layers
    .slice(0, 4)
    .map((l) => (l.label ? `${l.label}：${l.text}` : l.text))
    .join("\n");
  return [
    `体卦 ${ctx.meihua.ti} · 用卦 ${ctx.meihua.yong} · ${ctx.meihua.relation}`,
    `互卦 ${ctx.meihua.mutual}`,
    layerLines,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 从起卦输入组装语料库上下文（本地 DB + 参考库） */
export function buildAiCorpusBundle(input: InterpretInput): AiCorpusBundle | null {
  const ctx = buildInterpretContext(input);
  if (!ctx) return null;

  const facts = extractInterpretFacts(input);
  const benGua = getGuaciByName(input.benName);
  const bianGua = input.bianName ? getGuaciByName(input.bianName) : null;

  const layers =
    benGua != null
      ? buildPrompt({
          benGuaId: benGua.id,
          bianGuaId: bianGua?.id ?? null,
          category: ctx.category,
          changingLine: ctx.changingLine,
          yaoPosition: ctx.changingYao?.position,
          yaoYinyang: yaoYinyangFromCtx(ctx),
        })
      : [];

  return {
    ctx,
    facts,
    promptLayers: layers,
    corpusLayers: layers.length ? formatPromptLayers(layers) : "",
    strategyHint: buildStrategyHint(input),
    meihuaHint: buildMeihuaHint(ctx),
    profileHint: formatProfileHintForPrompt(
      matchQuestionProfile(input.question, input.category),
    ),
    structureBrief: facts ? formatFactsBrief(facts) : "",
  };
}

/** P2 补充语料：开场白/范例/画像/策略（不与主卦象材料重复） */
export function buildSupplementaryCorpus(bundle: AiCorpusBundle): string {
  const parts: string[] = [];
  const extraLayers = bundle.promptLayers.filter((l) =>
    ["opener", "curated"].includes(l.key),
  );
  if (extraLayers.length) {
    parts.push(formatPromptLayers(extraLayers));
  }
  if (bundle.strategyHint.trim()) parts.push(bundle.strategyHint.trim());
  if (bundle.meihuaHint.trim()) parts.push(bundle.meihuaHint.trim());
  return parts.join("\n\n");
}

/** @deprecated 旧版语料块；海外全 AI 解读请用 full-ai-interpret-prompts */
export function formatAiCorpusUserPrompt(bundle: AiCorpusBundle): string {
  const { ctx, corpusLayers, strategyHint, meihuaHint, profileHint, structureBrief } =
    bundle;

  const blocks: string[] = [
    `## 用户原问题\n「${ctx.question}」`,
    `## 卦辞爻辞（权威原文，禁止改写字句）\n${formatHexFactsBrief(ctx)}`,
  ];

  if (structureBrief) {
    blocks.push(`## 卦象结构\n${structureBrief}`);
  }

  if (corpusLayers) {
    blocks.push(
      `## 语料库参考（本地引擎数据库，须融合到各段改写，禁止照抄范例原文）\n${corpusLayers}`,
    );
  }

  if (strategyHint) {
    blocks.push(`## 梅花策略参考（事业/际遇）\n${strategyHint}`);
  }

  if (meihuaHint) {
    blocks.push(`## 梅花体用·时间层\n${meihuaHint}`);
  }

  if (profileHint.trim()) {
    blocks.push(profileHint.trim());
  }

  blocks.push(
    `## 写作要求\n` +
      `- 严格按 system 中的【标题】顺序输出；每段 2–4 句，紧扣「${ctx.question}」。\n` +
      `- 一句话定性：从开场白备选中选一条改写，≤30 字。\n` +
      `- 各分维：吸收语料库中卦性、动爻权重、变卦转化、范例的语气与密度，但内容必须贴本题。\n` +
      `- 变卦转化层中的「写法提示」作禁忌与方向；「断语方向」须化入总断语，忌空泛「宜观察」。\n` +
      `- 断语：20–40 字；时间节点与行动锚点各 1–2 句，可观察、可执行。`,
  );

  return blocks.join("\n\n");
}
