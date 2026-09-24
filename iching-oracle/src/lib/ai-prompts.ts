/**
 * 易经事占 · AI Prompt 设计（解读 / 追问 / 润色 共用）
 *
 * 结构：角色 → 贴题流程 → 类别规则 → 事实约束 → 输出格式 → 反例
 */

import type { CategoryId } from "@/lib/iching";
import { INTERPRETATION_FRAMEWORKS } from "@/lib/iching";
import { linesToAnalysis } from "@/lib/interpret-format";
import { parseSections } from "@/lib/interpret.local";
import type { InterpretContextPayload } from "@/lib/interpret-context";
import type { InterpretInput } from "@/lib/interpret.local";
import { contextToPromptJson, formatHexFactsBrief } from "@/lib/interpret-context";

export { formatHexFactsBrief };
import { formatProfileHintForPrompt, matchQuestionProfile } from "@/lib/common-questions";
import { factsToPromptJson, type InterpretFacts } from "@/lib/interpret-facts";
import { resolveFollowUpConfig, type FollowUpPersona } from "@/lib/follow-up-persona";
import { detectIntent, intentToPromptHint } from "@/lib/intentLibrary";
import { formatAiCorpusUserPrompt, buildAiCorpusBundle } from "@/lib/ai-corpus-context";
import { buildFollowUpPromptLayers, formatPromptLayers } from "@/lib/prompt-layers";
import { buildPrompt } from "@/lib/prompt-layers";
import { getGuaciByName } from "@/lib/guaci";

export const PROMPT_VERSION = "iching-v3-corpus";

const CATEGORY_LABEL: Record<CategoryId, string> = {
  career: "事业",
  family: "家庭",
  relationship: "情感",
  health: "健康",
  fate: "际遇",
};

/** 每个分维段应回答什么（贴题锚点） */
const DIMENSION_GUIDE: Record<CategoryId, Record<string, string>> = {
  career: {
    时机判断: "现在动/不动/先观察？依据动爻与变卦说清窗口，勿空喊「时机未到」。",
    隐患与阻力: "真正卡住的是人、钱、信息还是情绪？点 1–2 个具体阻力。",
    具体建议: "本周到 6 周内可做的 2–3 步，含对话对象或验证动作。",
    结果走向: "按惯性走下去 1–2 个季度大致落点；主动调整可改写什么。",
  },
  family: {
    现状格局: "家庭气场是聚合还是离散？暂时波动还是阶段性转折？用白话象意定性。",
    各方心态: "至少点到两个家庭角色的立场；谁主导紧张；有无隐藏动机。",
    核心矛盾: "矛盾象意（沟通/利益/磁场错位）；最大阻力方向；有无自然化解节点。",
    建议行动: "7天内可执行的一步 + 6-8周验证信号 + 明确一件忌做的事。",
  },
  relationship: {
    缘分磁场: "关系当下是靠近、僵持还是松动？用可观察信号而非猜测。",
    对方心意: "从行动看心意（时间、公开性、未来安排），忌替对方读心。",
    关系障碍: "最大障碍是节奏、沟通、第三方还是自我期待？",
    发展走向: "4–8 周内若维持现状 vs 若主动推进一步，各会怎样。",
  },
  fate: {
    选项利弊: "帮用户看见每个选项「得到/失去/能否撤回」，不写空洞好坏。",
    核心变量: "哪 1–2 个变量决定成败？用户往往忽略了什么。",
    风险提示: "最坏情形 + 是否承受得起；忌恐吓式断言。",
    卦象倾向: "卦变方向提示哪类风险最大，但不替用户按键。",
  },
  health: {
    五行对应: "身心联动的一两层提醒，不堆砌术语。",
    调养方向: "可执行的作息/运动/情绪调节，优先「能坚持 15 分钟的事」。",
    注意事项: "何时必须就医；卦象辅理不代医。",
    时运节点: "4–6 周观察窗，看趋势不看单日。",
  },
};

const CATEGORY_VOICE: Record<CategoryId, string> = {
  career: "像懂职场的顾问：谈筹码、退路、下家、交接，不谈「命运安排」。",
  family: "像懂家庭结构的长辈：谈各方立场与可执行的一步，不站队、不道德绑架。",
  relationship: "像冷静的朋友：谈节奏与边界，不替用户做「他/她一定怎样」的判决。",
  fate: "像际遇教练：谈不可逆成本与小步验证，不制造非黑即白。",
  health: "像温和的调养提醒：谈节律与趋势，反复强调不能替代医学检查。",
};

// ─── 共用块 ───────────────────────────────────────────────────────────────

function factualConstraints(): string {
  return `## 事实约束（最高优先级）
- 卦名、爻位、卦辞/爻辞/象辞只能来自用户提供的 JSON，禁止编造、替换、张冠李戴。
- 不得虚构用户未提供的背景（如「你有下家」「对方出轨」）。
- 不得输出「我是 AI」「我无法判断」等破坏沉浸感的句子。
- 简体中文；不用 emoji；不用 Markdown 标题（# ##）。`;
}

function antiPatterns(): string {
  return `## 禁止出现的写法
- 模板标签：【直断】【卦理】【方向】【忌】【行】、以及任何【xxx】小标题（追问模式除外见格式说明）。
- 空泛句：「顺其自然」「一切随缘」「心诚则灵」「吉人自有天相」。
- 堆砌：把整段卦辞原文抄一遍再解释。
- 复读：同一段里重复「就你所问」超过一次。
- 八股清单：①②③④ 连发四条以上而无具体场景。`;
}

function stickToQuestionFlow(question: string): string {
  return `## 贴题流程（每段内部遵守）
1. 心里默念用户原问题：「${question}」
2. 第一句就要碰到这个问题，而不是先科普易经。
3. 用卦象作证据，不作结论的唯一依据。
4. 收束到「接下来 7 天内能做的一件事」。`;
}

export function categoryRubric(category: CategoryId): string {
  return `## ${CATEGORY_LABEL[category]}类专则
- 语气：${CATEGORY_VOICE[category]}
- 分维锚点：
${INTERPRETATION_FRAMEWORKS[category].dims
  .map((d) => `  · ${d}：${DIMENSION_GUIDE[category][d] ?? "紧扣原问题。"}`)
  .join("\n")}`;
}

export function summarizeInterpretation(text: string, maxPerSection = 380): string {
  const sections = parseSections(text);
  if (sections.length === 0) {
    const t = text.trim();
    return t.length <= 3500 ? t : `${t.slice(0, 3500)}…`;
  }

  return sections
    .map((s) => {
      const body =
        s.analysis ?? s.body ?? (s.lines?.length ? linesToAnalysis(s.lines) : "");
      const flat = body.replace(/\s+/g, " ").trim();
      const excerpt = flat.slice(0, maxPerSection);
      return `[${s.title}] ${excerpt}${flat.length > maxPerSection ? "…" : ""}`;
    })
    .join("\n");
}

export function stripTemplateLabels(text: string): string {
  return text
    .replace(/^【[^】]+】\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── 完整解读生成 ─────────────────────────────────────────────────────────

export function interpretSystemPrompt(ctx: InterpretContextPayload): string {
  const dims = ctx.dimensions;
  const dimBlock = dims.map((d) => `【${d}】`).join("\n");

  return `你是一位易经事占解读师，服务对象是带着真实困惑来问事的普通人。

${factualConstraints()}

${antiPatterns()}

${stickToQuestionFlow(ctx.question)}

${categoryRubric(ctx.category)}

## 输出格式（必须严格遵守，便于程序解析）
按顺序输出以下 ${dims.length + 4} 段，每段以【标题】独占一行开头，段内用空行分段：

【一句话定性】
${dimBlock}
【断语】
【时间节点】
【行动锚点】

### 各段要求
**一句话定性**（1 句，≤30 字）
- 从 user 提供的「一句话定性备选」中选最贴合的一条改写，融入用户问题，不得照抄原文。
- 这是用户第一眼看到的总括，要有判断力。

**${dims.join(" / ")}**（每段 2–4 句）
- 每段只回答该维度，禁止复制粘贴相同句子。
- 至少一段含具体时间（如「这 6 周」「下次发薪前」）。

**断语**（单独一行，20–45 字）
- 一句收束，可执行倾向，不断然替用户做 irreversible 决定（健康/感情尤甚）。

**时间节点**（1–2 句）
- 结合动爻权重与时间窗建议，给出可观察的时间范围（如「4–6 周内」）。

**行动锚点**（1–2 句）
- 本周内可验证的一件小事：谁、做什么、怎样算完成。`;
}


function factualConstraintsCompact(): string {
  return `事实约束：卦名/爻位/卦辞爻辞仅来自 user 提供的权威块与语料库；禁止编造背景；简体中文；不用 # 标题。`;
}

function corpusUsageRules(): string {
  return `语料库参考（卦性速查/动爻权重/变卦转化/解读范例）用于定语气、结构与落点，必须结合用户原问题改写，禁止照搬范例原文。`;
}

/** 全 AI 解读 system：短格式 + 语料库融合规则（v3-corpus；海外 P1/P2 见 full-ai-interpret-prompts） */
export function interpretSystemPromptCompact(ctx: InterpretContextPayload): string {
  const dims = ctx.dimensions;
  const dimBlock = dims.map((d) => `【${d}】`).join("\n");
  const label = CATEGORY_LABEL[ctx.category];
  const dimGuide = dims
    .map((d) => `${d}：${DIMENSION_GUIDE[ctx.category][d] ?? "紧扣原问题。"}`)
    .join("\n");

  return `你是易经事占解读师（${label}类）。${factualConstraintsCompact()}
${corpusUsageRules()}
${categoryRubric(ctx.category)}

输出 ${dims.length + 4} 段，每段以【标题】独占一行，顺序固定：
【一句话定性】
${dimBlock}
【断语】
【时间节点】
【行动锚点】

分维锚点：
${dimGuide}

规则：紧扣「${ctx.question}」；一句话定性≤30字且须改写开场白备选；每维 2–4 句；断语 20–40 字；时间节点与行动锚点各 1–2 句；忌空话与【直断】等模板标签。`;
}

/** 全 AI 解读 user：语料库 + 卦辞库（由 buildAiCorpusBundle 组装） */
export function interpretUserPromptFromCorpus(input: InterpretInput): string {
  const bundle = buildAiCorpusBundle(input);
  if (!bundle) throw new Error("无法组装语料库上下文");
  return formatAiCorpusUserPrompt(bundle);
}

export function interpretUserPrompt(
  ctx: InterpretContextPayload,
  input?: InterpretInput,
): string {
  const benGua = getGuaciByName(ctx.ben.name);
  if (!benGua) {
    return `## 用户原问题\n「${ctx.question}」\n\n${formatHexFactsBrief(ctx)}`;
  }
  const interpretInput: InterpretInput =
    input ?? {
      category: ctx.category,
      question: ctx.question,
      benName: ctx.ben.name,
      bianName: ctx.bian?.name ?? null,
      changingLine: ctx.changingLine,
      castMethod: ctx.castMethod,
    };
  const bundle = buildAiCorpusBundle(interpretInput);
  if (!bundle) return interpretUserPromptLegacy(ctx);
  return `${formatAiCorpusUserPrompt(bundle)}\n\n## 卦象事实 JSON（补充校验）\n${contextToPromptJson(ctx)}`;
}

/** 旧版完整 user（兜底） */
function interpretUserPromptLegacy(ctx: InterpretContextPayload): string {
  const profileHint = formatProfileHintForPrompt(matchQuestionProfile(ctx.question, ctx.category));
  return `## 用户原问题
「${ctx.question}」

## 卦象速览
${formatHexFactsBrief(ctx)}
${profileHint}

请按 system 中的【标题】顺序输出完整解读。`;
}

export function interpretUserPromptCompact(
  ctx: InterpretContextPayload,
  input?: InterpretInput,
): string {
  const interpretInput: InterpretInput =
    input ?? {
      category: ctx.category,
      question: ctx.question,
      benName: ctx.ben.name,
      bianName: ctx.bian?.name ?? null,
      changingLine: ctx.changingLine,
      castMethod: ctx.castMethod,
    };
  const bundle = buildAiCorpusBundle(interpretInput);
  if (!bundle) return interpretUserPromptLegacy(ctx);
  return formatAiCorpusUserPrompt(bundle);
}

// ─── 深入追问 ─────────────────────────────────────────────────────────────

const FOLLOWUP_GOOD_EXAMPLE = `用户追问：「那我下一步应该往哪个方向找？」

✓ 好的回复：
你问的是方向，不是能不能动——结合六五动爻「不富以其邻」，更像是先把手边资源和人脉理顺，再谈跳槽。若硬要离开，至少先确认：存款能撑几个月、当前岗还能不能换到可写进简历的成果。这周先做一件事：列 3 个你真正想去的行业方向，各找 1 个人聊 20 分钟，聊完再决定投不投简历。

✗ 差的回复：
【直断】谦卦示吉。【卦理】谦受益。【方向】1.努力 2.坚持 3.等待。`;

export function followUpSystemPrompt(category: CategoryId): string {
  return `你是同一卦下的追问助手。用户已看过完整解读，现在在聊天里问更具体的事。

${factualConstraints()}

${antiPatterns()}

## 追问专则
- 输出为自然对话：2–4 短段，口语化，无【】标题、无 Markdown、无 ①②③ 清单。
- **第一句必须直接回答用户刚问的那句话**，然后才引用卦象。
- 结合对话 history，不重复已说过的话。
- 至少给出 1 个「本周内、可验证」的小动作（谁、做什么、怎样算完成）。
- ${CATEGORY_VOICE[category]}

## 示例（学风格，勿抄内容）
${FOLLOWUP_GOOD_EXAMPLE}`;
}

export function buildFollowUpSessionContext(
  req: {
    category: CategoryId;
    question: string;
    benName: string;
    bianName?: string | null;
    changingLine: number;
    interpretation: string;
    facts?: InterpretFacts | null;
  },
  ctx: InterpretContextPayload,
): string {
  const label = CATEGORY_LABEL[req.category];
  const benGua = getGuaciByName(req.benName);
  const bianGua = req.bianName ? getGuaciByName(req.bianName) : null;
  const corpusLayers =
    benGua != null
      ? formatPromptLayers(
          buildFollowUpPromptLayers({
            benGuaId: benGua.id,
            bianGuaId: bianGua?.id ?? null,
            category: req.category,
            changingLine: req.changingLine,
            yaoPosition: ctx.changingYao?.position,
            yaoYinyang: req.facts?.changingLine?.yinyang ?? null,
          }),
        )
      : "";

  const headlineOnly = summarizeInterpretation(req.interpretation, 120);

  return `[占问背景 · 只读]
类型：${label}
原问题：「${req.question}」
卦象：${req.benName}${req.bianName ? ` → ${req.bianName}` : ""}${req.changingLine ? ` · 第${req.changingLine}爻动` : ""}

${formatHexFactsBrief(ctx)}
${corpusLayers ? `\n${corpusLayers}\n` : ""}
解读收束（仅对齐结论，勿复述全文）：
${headlineOnly}`;
}

export function buildFollowUpMessages(
  req: {
    category: CategoryId;
    question: string;
    benName: string;
    bianName?: string | null;
    changingLine: number;
    interpretation: string;
    userMessage: string;
    history: { role: "user" | "assistant"; content: string }[];
    facts?: InterpretFacts | null;
    persona?: FollowUpPersona | string | null;
  },
  ctx: InterpretContextPayload,
): { role: "system" | "user" | "assistant"; content: string }[] {
  const session = buildFollowUpSessionContext(req, ctx);
  const { buildFollowUpPrompt } = resolveFollowUpConfig(req.persona);
  const intent = detectIntent(req.userMessage);
  const intentHint = intentToPromptHint(intent);
  const isMaster = req.persona !== "analyst";

  // compact：去掉 few-shot 长语料，把输入从 ~2k tokens 压到几百，避免偶发超时「自己断掉」
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    {
      role: "system",
      content: `${buildFollowUpPrompt({
        category: req.category,
        userMessage: req.userMessage,
        compact: true,
      })}${intentHint ? `\n\n${intentHint}` : ""}`,
    },
    {
      role: "user",
      content: isMaster
        ? `${session}\n\n我会在这一卦下继续追问。请记住：每次只答我问的那一句；必须保持大师解惑的半文半白气口，先断其象，再点卦中事实，末了给一法或一兆。不得滑成现代分析、咨询建议或客服口吻。`
        : `${session}\n\n我会在这一卦下继续追问。请记住：每次只答我问的那一句，贴题、具体。`,
    },
    {
      role: "assistant",
      content: isMaster
        ? "明白。此卦在前，你再问，我便只就卦中所见答你一句：先断其象，再点你可行的一步。"
        : "明白。你问什么我就先答什么，结合这次卦象和你的原问题，尽量说到你能马上做的一步。",
    },
  ];

  for (const m of req.history.slice(-4)) {
    const content = m.content.length > 400 ? `${m.content.slice(0, 400)}…` : m.content;
    messages.push({ role: m.role, content });
  }

  messages.push({ role: "user", content: req.userMessage.trim() });
  return messages;
}

// ─── 润色（本地草稿 → 贴题口语） ───────────────────────────────────────────

export function polishSystemPrompt(meta: {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
}): string {
  const label = CATEGORY_LABEL[meta.category];
  return `易经解读编辑。${label}类；本卦${meta.benName}${meta.bianName ? `变${meta.bianName}` : ""}。
任务：贴题润色草稿，不重写卦象。保持【标题】段数、顺序、标题不变。
每段开头呼应「${meta.question}」；删套话；保留数字与时间窗；2–4 句/段；勿输出⟦原文⟧。`;
}

export function polishSystemPromptCompact(meta: {
  category: CategoryId;
  question: string;
}): string {
  const label = CATEGORY_LABEL[meta.category];
  return `润色${label}类易经解读草稿。贴题「${meta.question}」。保持【标题】不变，每段简练 2–4 句，删套话，勿⟦原文⟧。`;
}

export function polishUserPrompt(sectionPayload: string): string {
  return `以下是待润色草稿（保持【标题】结构）：

${sectionPayload}

请输出润色后的完整正文。`;
}

/** 推荐温度：解读 / 追问 / 润色 */
export const AI_TEMP = {
  interpret: 0.62,
  followUp: 0.68,
  polish: 0.52,
} as const;

export const AI_MAX_TOKENS = {
  interpret: 3400,
  /** 全 AI 解读（控制生成长度以提速） */
  fullAi: 1600,
  /** 结果页 · 海外顶级大模型 · P1/P2 四维度 + 断语 */
  fullAiOverseas: 1200,
  followUp: 1500,
  /** 追问（短回复） */
  followUpFast: 900,
  polish: 3000,
  /** 润色（仅部分段落） */
  polishFast: 1400,
} as const;
