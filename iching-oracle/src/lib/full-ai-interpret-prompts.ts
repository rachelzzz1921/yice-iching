/**
 * 结果页 · 海外顶级大模型 · 全量解读 Prompt（P1 System + P2 User）
 * 规范：prompts-P1-P2.md
 * 仅用于 zhipu-generate / 云端全 AI 解读，不与 ai-prompts（本地/润色/追问）混用。
 */

import type { CategoryId } from "@/lib/iching";
import { CATEGORIES, INTERPRETATION_FRAMEWORKS } from "@/lib/iching";
import {
  buildTransitionContext,
  getNatureLabel,
  getTransition,
} from "@/lib/bianguaTransitions";
import { buildEssenceContext } from "@/lib/hexagramEssence";
import { getGuaciPlainSummary, getYaoPlainSummary } from "@/lib/guaci-plain";
import { getGuaciByName, getYaociByName } from "@/lib/guaci";
import { buildYaoContext } from "@/lib/yaoWeights";
import type { InterpretInput } from "@/lib/interpret.local";
import { buildAiCorpusBundle } from "@/lib/ai-corpus-context";
import { formatHexFactsBrief } from "@/lib/interpret-context";
import { formatPromptLayers } from "@/lib/prompt-layers";
import { formatProfileHintForPrompt, matchFullAiQuestionProfile } from "@/lib/full-ai-question-profiles";

export const FULL_AI_PROMPT_VERSION = "iching-v4-p1-p2-overseas";

const YAO_POS_LABELS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

/** P1 · 海外全 AI 解读 System Prompt */
export const FULL_AI_INTERPRET_SYSTEM_PROMPT = `你是易测的解读引擎，精通易经象意，以文白并用的哲理大师风格解读易卦。

## 你的角色

你不是算命师，不是心理咨询师，也不是 ChatGPT。你是一个读象的人——读卦象，说象意，指方向。你的解读有重量，让人恍然大悟，有时让人不舒服，但总是真实的。

## 解读风格

**语气**：冷静，客观，偶有锋利。不安慰，不鼓励，不说废话。有时候一句话比三段话更有力量。

**文字**：文白并用。白话为主，关键处用文言收口。不掉书袋，不堆砌典故。每个字都有位置。

**节奏**：四个维度各自独立，有起有落。不是流水账，是四段各有重心的文字。每段开头不做引子，直接说结论。

**禁止**：
- 不用「卦象显示」「从卦象来看」「这是卦象给出的提示」作为引子
- 不用「建议您」「可以考虑」等敬语前缀，直接给动作
- 不在结尾用「转机」「顺势」「时机成熟」「宜观察」「等待时机」「方向是对的」这类空话收口
- 不重复同一类句式：一篇解读里「从 X 走向 Y」最多一次，「否极泰来」最多一次
- 不说「改弦则有机会改写终局」，不用任何格式类似的文学煽情句

## 格式规则

输出四个维度，每个维度：
- 标题用【】包裹，例如【时机判断】
- 标题下直接是正文，不加编号，不加副标题
- 每段 150–250 字，不超过 300 字
- 段与段之间空一行
- 不用表格，不用 bullet list，不用加粗
- 全篇最后单独一段【断语】，正文仅一句短语，20 字以内，文言或文白皆可，有力量，不废话
- 【断语】段禁止写长文总结；禁止在正文里再写「断语：」前缀

## 断语规则

断语是整篇解读的落脚点，不是总结，是判断。

好的断语：
- 「乾道极处，天意已换手。」
- 「困是筛选，留下的才是真的。」
- 「路上有石，清掉它——路还在。」
- 「散了，停下来看——再走。」

坏的断语（禁止）：
- 「整体来看，卦象较为有利，建议保持观察。」
- 「时机将至，顺势而为，必有转机。」
- 「方向是对的，坚持下去。」

## 解读的底层逻辑

你在做的事：把一个卦象翻译成一个人当下处境的真实图景，然后说清楚他站在哪里，前面是什么，该怎么走。

不是预言，是读象。不是安慰，是镜子。

每一条解读，用户读完应该有一个感受：「这说的就是我。」然后有一个判断：「我知道该怎么做了。」

## 事实约束（最高优先级）

- 卦名、爻位、卦辞/爻辞/象辞只能来自 user 提供的材料，禁止编造、替换、张冠李戴。
- 不得虚构用户未提供的背景。
- 不得输出「我是 AI」「我无法判断」等破坏沉浸感的句子。
- 简体中文；不用 emoji；不要用 Markdown # 标题（【】维度标题除外）。`;

export type ReadingContext = {
  category: CategoryId;
  categoryLabel: string;
  userQuestion: string;
  benGuaId: number;
  benGuaName: string;
  yaoPositions: number[];
  bianGuaId: number | null;
  bianGuaName: string | null;
  bianGuaLabel: string | null;
  benGuaEssence: string;
  yaoMeanings: string;
  bianguaContext: string;
  involvesOthers?: boolean;
  /** 可选：profile / 范例 / 开场白等补充语料 */
  supplementaryCorpus?: string;
};

const DIMENSION_INSTRUCTIONS: Record<CategoryId, string> = {
  career: `【时机判断】
当前处境在卦象里是宜动、宜守还是待机。说清楚时间窗口的性质——这个节点大概持续多久，什么信号出现说明阶段结束。动爻的位置对当下行动有什么直接指示。

【隐患与阻力】
潜在的风险在哪个方向，具体是什么性质的阻力——不是笼统的「注意风险」。有没有外部变量正在影响局势。这个阻力是可以主动化解的，还是等待绕过。

【具体建议】
7天内可以做的一件具体的事，动词加对象，不泛化。什么情况下不要轻举妄动（忌）。6-8周内，什么信号出现说明走对了。

【结果走向】
给出一个明确的倾向判断——有利、待机、还是谨慎。如果有变卦，变卦的象意对结果有什么修正。长期（3-6个月）这件事的卦象走势。`,

  family: `【现状格局】
基于本卦卦性，用一到两句话定性当前家庭气场——是聚合还是离散，是暂时波动还是阶段性转折。用白话象意定性，不堆卦辞原文，不复述这段指令。

【各方心态】
点到至少两个家庭角色当下的状态或立场，指出谁是主要影响者，有无隐藏的情绪或动机。直接写出判断，不要用「至少点到」「需要指出」这类元语言。

【核心矛盾】
说清这个矛盾的象意性质是沟通错位、利益分歧还是磁场问题，指出最大阻力来自哪个方向，这个矛盾有没有自然化解的时间节点。直接给判断，不要列问题清单。

【建议行动】
给出7天内可执行的一件具体的事（动词+对象，不泛化），6-8周内什么信号说明方向对了，这段时间明确不要做什么。直接写动作，不要用编号列条，不要写「设验证窗」「忌因」这类模板语。`,

  relationship: `【缘分磁场】
当前两人之间的磁场状态——是在靠近、在拉开，还是在一个微妙的平衡里。这个状态是动态的还是相对稳定的。卦象对这段关系整体质地的判断。

【对方心意】
卦象里对方的状态和心意指向。不是读心术，是象意推断——对方当下的主要情绪或动力是什么。有没有对方还没说出来的部分。

【关系障碍】
当前关系里最真实的阻力在哪里。是外部条件、内部裂缝，还是时机不对。这个障碍是可以主动处理的，还是需要等待自然演变。

【发展走向】
给出一个明确的方向判断——深化、维持、还是需要重新评估。如果有变卦，变卦对关系走向的修正。接下来6-8周，什么信号说明方向在变。`,

  health: `【五行对应】
当前身体状态在卦象里的五行对应——哪个脏腑系统、哪条经络、哪个方向的能量在偏。这个偏是虚还是实，是过剩还是不足。

【调养方向】
对应五行的调养思路——饮食、作息、情绪管理，给出具体方向，不给医嘱。哪个方向的调养当前最有效。

【注意事项】
这个阶段需要特别回避的行为或习惯（忌）。身体正在发出的信号里，有没有被忽视的部分。如果有症状，象意对症状性质的指向。

【时运节点】
这个身体状态大概持续多久。什么信号出现说明在好转。长期（3-6个月）卦象对健康走势的倾向判断。`,

  fate: `【选项利弊】
当前摆在面前的选项，卦象对各个方向的倾向判断——哪条路阻力小，哪条路代价高。不是做决定，是读象意。

【核心变量】
影响这个选择结果的最关键变量是什么——是时机、是某个人、是某个外部条件。这个变量当前在什么状态。

【风险提示】
这个际遇里隐藏的风险在哪里。不是泛泛的「谨慎」，是具体说清风险的方向和性质。有没有容易被忽视的代价。

【卦象倾向】
给出一个明确的卦象倾向——当前时机有利于出手，还是等待，还是调整方向。如果有变卦，变卦对这个倾向的修正。接下来6-8周，什么信号说明时机在变。`,
};

const USER_PROMPT_TEMPLATE = `## 本次占卜信息

问题类别：{{category_label}}
用户问题：{{user_question}}

本卦：{{ben_gua_name}}（第{{ben_gua_id}}卦）
动爻：{{yao_positions}}（{{yao_count}}爻动）
变卦：{{bian_gua_str}}

---

## 卦象材料

### 本卦卦性

{{ben_gua_essence}}

### 动爻象意

{{yao_meanings}}

### 变卦转化

{{bianhua_context}}

---

## 解读任务

请按以下四个维度的写作指令生成正文（勿复述、引用或清单式复现这些指令本身）：

{{dimension_instructions}}

---

## 特别注意

{{special_notes}}

{{supplementary_block}}

输出格式严格按照 system prompt 中的格式规则。四个维度之后，另起一段写断语，不超过 20 字。`;

export function formatYaoPositions(positions: number[]): string {
  if (positions.length === 0) return "无动爻";
  return positions.map((p) => YAO_POS_LABELS[p - 1] ?? `第${p}爻`).join("、");
}

function yaoNatureFromPosition(positionLabel: string): 0 | 1 {
  return /九/.test(positionLabel) ? 1 : 0;
}

function collectChangingYaoPositions(input: InterpretInput): number[] {
  if (input.yao?.length === 6) {
    const fromCoins = input.yao
      .map((y, i) => (y.changing ? i + 1 : 0))
      .filter((p) => p > 0);
    if (fromCoins.length) return fromCoins;
  }
  if (input.changingLine >= 1 && input.changingLine <= 6) {
    return [input.changingLine];
  }
  return [];
}

function questionInvolvesOthers(question: string): boolean {
  return /他|她|对方|父母|孩子|配偶|老公|老婆|合伙人|老板|同事|家人|伴侣|对象/.test(
    question,
  );
}

export function buildSpecialNotes(ctx: Pick<
  ReadingContext,
  "yaoPositions" | "bianguaContext" | "involvesOthers" | "category"
>): string {
  const notes: string[] = [];

  if (ctx.yaoPositions.length === 0) {
    notes.push("本卦无动爻，无变卦。解读以本卦整体卦性为主，不强行引入变卦逻辑。");
  }

  if (ctx.yaoPositions.length === 6) {
    notes.push("六爻全动，以之卦（变卦）为主卦解读，本卦作为背景参考。");
  }

  if (ctx.bianguaContext.includes("有隐患") || ctx.bianguaContext.includes("warning")) {
    notes.push(
      "变卦性质为「有隐患需注意」，在发展走向/卦象倾向维度里需要明确写出警示，不能只写正面走向。",
    );
  }

  if (ctx.involvesOthers) {
    notes.push(
      "用户问题涉及第三方，解读对方心意时保持象意推断的边界，不做确定性断言。",
    );
  }

  if (ctx.category === "health") {
    notes.push(
      "健康类解读不给具体医疗建议，不命名具体疾病，只说象意方向和调养思路。",
    );
  }

  return notes.length > 0 ? notes.join("\n") : "无特别注意事项。";
}

function buildBenGuaEssence(
  benGuaId: number,
  bianGuaId: number | null,
  category: CategoryId,
  benGuaName: string,
): string {
  const fromCorpus = buildEssenceContext(benGuaId, bianGuaId, category).trim();
  if (fromCorpus) return fromCorpus;
  const plain = getGuaciPlainSummary(benGuaName, category);
  return plain ?? "（卦性语料暂缺，请据卦辞象意推断。）";
}

function buildYaoMeaningsText(
  benGuaName: string,
  category: CategoryId,
  positions: number[],
): string {
  if (positions.length === 0) {
    return "本卦无动爻，以整卦卦性为主，不单独论爻。";
  }

  return positions
    .map((p) => {
      const yaoci = getYaociByName(benGuaName, p);
      const posLabel = YAO_POS_LABELS[p - 1] ?? `第${p}爻`;
      const plain = getYaoPlainSummary(benGuaName, p, category);
      const nature = yaoci ? yaoNatureFromPosition(yaoci.position) : 1;
      const weightHint = buildYaoContext(p, nature, category);
      const signalLine =
        weightHint
          .split("\n")
          .find((l) => l.includes("方向信号")) ?? "";

      if (yaoci) {
        const line = yaoci.text.replace(/[。；]$/, "");
        const tail = plain ?? signalLine.replace(/^[^：]+：/, "");
        return `${posLabel}动：${line}。${tail}`;
      }
      return `${posLabel}动：${(plain ?? signalLine) || "此爻为当下最该正面处理的一层。"}`;
    })
    .join("\n");
}

export type FullAiReadingContext = ReadingContext;

/** 从起卦输入组装 P2 所需上下文（海外全 AI 专用） */
export function buildFullAiReadingContext(
  input: InterpretInput,
  supplementaryCorpus?: string,
): ReadingContext | null {
  const benGua = getGuaciByName(input.benName);
  if (!benGua) return null;

  const bianGua = input.bianName ? getGuaciByName(input.bianName) : null;
  const yaoPositions = collectChangingYaoPositions(input);
  const categoryLabel =
    CATEGORIES.find((c) => c.id === input.category)?.label ?? input.category;

  const bianguaContext = buildTransitionContext(
    benGua.id,
    bianGua?.id ?? null,
    input.category,
  );

  let bianGuaLabel: string | null = null;
  if (bianGua) {
    const transition = getTransition(benGua.id, bianGua.id, input.category);
    bianGuaLabel = transition ? getNatureLabel(transition.nature) : null;
  }

  return {
    category: input.category,
    categoryLabel,
    userQuestion: input.question,
    benGuaId: benGua.id,
    benGuaName: benGua.name,
    yaoPositions,
    bianGuaId: bianGua?.id ?? null,
    bianGuaName: bianGua?.name ?? null,
    bianGuaLabel,
    benGuaEssence: buildBenGuaEssence(
      benGua.id,
      bianGua?.id ?? null,
      input.category,
      benGua.name,
    ),
    yaoMeanings: buildYaoMeaningsText(benGua.name, input.category, yaoPositions),
    bianguaContext,
    involvesOthers: questionInvolvesOthers(input.question),
    supplementaryCorpus: supplementaryCorpus?.trim() || undefined,
  };
}

/** P2 · 海外全 AI 解读 User Prompt */
export function buildFullAiUserPrompt(ctx: ReadingContext): string {
  const dimensionInstructions = DIMENSION_INSTRUCTIONS[ctx.category];
  const specialNotes = buildSpecialNotes(ctx);

  const bianGuaStr = ctx.bianGuaId
    ? `${ctx.bianGuaName}（第${ctx.bianGuaId}卦）｜${ctx.bianGuaLabel ?? "转化中"}`
    : "无变卦";

  const supplementaryBlock = ctx.supplementaryCorpus
    ? `## 补充语料（语气与密度参考，须融合改写，禁止照抄）\n\n${ctx.supplementaryCorpus}`
    : "";

  return USER_PROMPT_TEMPLATE.replace("{{category_label}}", ctx.categoryLabel)
    .replace("{{user_question}}", ctx.userQuestion)
    .replace("{{ben_gua_name}}", ctx.benGuaName)
    .replace("{{ben_gua_id}}", String(ctx.benGuaId))
    .replace("{{yao_positions}}", formatYaoPositions(ctx.yaoPositions))
    .replace("{{yao_count}}", String(ctx.yaoPositions.length))
    .replace("{{bian_gua_str}}", bianGuaStr)
    .replace("{{ben_gua_essence}}", ctx.benGuaEssence)
    .replace("{{yao_meanings}}", ctx.yaoMeanings)
    .replace("{{bianhua_context}}", ctx.bianguaContext)
    .replace("{{dimension_instructions}}", dimensionInstructions)
    .replace("{{special_notes}}", specialNotes)
    .replace("{{supplementary_block}}", supplementaryBlock);
}

/** 海外全 AI：补充语料（开场白/范例/画像，用 full-ai-question-profiles） */
function buildFullAiSupplementaryCorpus(input: InterpretInput): string {
  const bundle = buildAiCorpusBundle(input);
  if (!bundle) return "";

  const parts: string[] = [];
  const extraLayers = bundle.promptLayers.filter((l) =>
    ["opener", "curated"].includes(l.key),
  );
  if (extraLayers.length) {
    parts.push(formatPromptLayers(extraLayers));
  }

  const profileHint = formatProfileHintForPrompt(
    matchFullAiQuestionProfile(input.question, input.category),
  );
  if (profileHint.trim()) parts.push(profileHint.trim());
  if (bundle.strategyHint.trim()) parts.push(bundle.strategyHint.trim());
  if (bundle.meihuaHint.trim()) parts.push(bundle.meihuaHint.trim());

  return parts.join("\n\n");
}

/** 从 InterpretInput 一键组装海外全 AI User Prompt */
export function buildFullAiInterpretUserPrompt(input: InterpretInput): string {
  const bundle = buildAiCorpusBundle(input);
  if (!bundle) throw new Error("无法组装语料库上下文");

  const reading = buildFullAiReadingContext(
    input,
    buildFullAiSupplementaryCorpus(input),
  );
  if (!reading) throw new Error(`卦名「${input.benName}」不在卦辞库中`);

  const userPrompt = buildFullAiUserPrompt(reading);
  const dimTitles = dimensionTitlesForCategory(input.category).join(" / ");

  return `${userPrompt}

## 卦辞爻辞原文（权威，禁止改写字句）
${formatHexFactsBrief(bundle.ctx)}

## 维度标题校验
本次必须输出且仅输出以下四个维度标题：${dimTitles}；最后单独一段【断语】。`;
}

export function buildFullAiInterpretSystemPrompt(): string {
  return FULL_AI_INTERPRET_SYSTEM_PROMPT;
}

/** 维度标题列表（与 P2 一致） */
export function dimensionTitlesForCategory(category: CategoryId): string[] {
  return [...INTERPRETATION_FRAMEWORKS[category].dims];
}

/** @deprecated 使用 FULL_AI_INTERPRET_SYSTEM_PROMPT */
export const INTERPRET_SYSTEM_PROMPT = FULL_AI_INTERPRET_SYSTEM_PROMPT;
