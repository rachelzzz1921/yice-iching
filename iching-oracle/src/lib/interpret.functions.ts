import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseInterpretInput, InterpretInputSchema } from "@/lib/interpret-input-schema";
import { interpretLocally } from "@/lib/interpret.local";
import { isZhipuEnabled, polishInterpretationWithZhipu } from "@/lib/zhipu-polish";
import { runZhipuTestGeneration } from "@/lib/zhipu-generate";
import { answerFollowUp, isFollowUpAiEnabled } from "@/lib/zhipu-followup";
import { normalizeFollowUpPersona, type FollowUpPersona } from "@/lib/follow-up-persona";
import { attachInterpretExtras } from "@/lib/interpret-extras";
import type { InterpretFacts } from "@/lib/interpret-facts";

/** 本地解读（秒出）+ 可选后台润色；智谱测试块改由 ZhipuTestPanel 按需加载 */
export const interpretReading = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => parseInterpretInput(d))
  .handler(async ({ data }) => {
    const local = interpretLocally(data);

    const polishOnLoad = process.env.ZHIPU_POLISH_ON_LOAD === "1";
    let result = local;
    if (polishOnLoad && isZhipuEnabled()) {
      result = await polishInterpretationWithZhipu(local, data).catch(() => local);
    }

    return attachInterpretExtras(data, {
      ...result,
      aiFollowUpEnabled: isFollowUpAiEnabled(),
    });
  });

/** 智谱完整生成 · 测试对比（与正式解读分离，避免阻塞主流程） */
export const zhipuTestGenerate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => parseInterpretInput(d))
  .handler(async ({ data }) => runZhipuTestGeneration(data));

const ChatInput = z.object({
  category: z.enum(["career", "family", "relationship", "health", "fate"]),
  question: z.string().min(1).max(500),
  benName: z.string().min(1).max(20),
  bianName: z.string().max(20).optional().nullable(),
  changingLine: z.number().int().min(0).max(6),
  castMethod: z.enum(["coin", "yarrow", "meihua", "direct"]).optional(),
  yao: InterpretInputSchema.shape.yao,
  interpretation: z.string().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .max(20),
  userMessage: z.string().min(1).max(500),
  facts: z.record(z.string(), z.unknown()).optional().nullable(),
  persona: z.enum(["analyst", "master"]).optional(),
});

/** 深入追问：仅智谱 AI（需 ZHIPU_API_KEY） */
export const followUpChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const { history, userMessage, ...rest } = data;
    const answer = await answerFollowUp({
      ...rest,
      userMessage,
      history,
      facts: (data.facts as InterpretFacts | null | undefined) ?? undefined,
      persona: normalizeFollowUpPersona(data.persona),
    });
    return {
      reply: answer.reply,
      source: answer.source,
      model: answer.model,
      persona: normalizeFollowUpPersona(data.persona),
    };
  });
