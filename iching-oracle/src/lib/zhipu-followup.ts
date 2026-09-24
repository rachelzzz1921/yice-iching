/**
 * 深入追问：100% 智谱 AI，多轮对话 + 结构化 Prompt
 */

import { buildFollowUpMessages, stripTemplateLabels } from "@/lib/ai-prompts";
import type { CategoryId } from "@/lib/iching";
import { buildInterpretContext } from "@/lib/interpret-context";
import type { FollowUpPersona } from "@/lib/follow-up-persona";
import type { InterpretFacts } from "@/lib/interpret-facts";
import type { CastMethod } from "@/lib/profile";
import { getZhipuFastModel, ZHIPU_SPEED } from "@/lib/zhipu-speed";
import { callZhipuChatMessages, isZhipuEnabled } from "@/lib/zhipu-shared";
import {
  getCachedFollowUpReply,
  setCachedFollowUpReply,
} from "@/lib/zhipu-followup-cache";

export type FollowUpChatMessage = { role: "user" | "assistant"; content: string };

export type FollowUpRequest = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
  changingLine: number;
  interpretation: string;
  userMessage: string;
  history: FollowUpChatMessage[];
  castMethod?: CastMethod;
  yao?: { yang: 0 | 1; changing: boolean; label?: string }[];
  /** 占问时固化的客观卦象事实（优先于现场重建） */
  facts?: InterpretFacts | null;
  persona?: FollowUpPersona;
};

export type FollowUpAnswer = {
  reply: string;
  source: "ai";
  model: string;
};

export async function generateFollowUpWithZhipu(req: FollowUpRequest): Promise<string> {
  const cached = getCachedFollowUpReply({
    category: req.category,
    benName: req.benName,
    bianName: req.bianName,
    changingLine: req.changingLine,
    userMessage: req.userMessage,
    persona: req.persona,
    history: req.history,
  });
  if (cached) return cached;

  const ctx = buildInterpretContext({
    category: req.category,
    question: req.question,
    benName: req.benName,
    bianName: req.bianName,
    changingLine: req.changingLine,
    castMethod: req.castMethod,
    yao: req.yao,
  });
  if (!ctx) throw new Error(`卦名「${req.benName}」不在卦辞库中`);

  const messages = buildFollowUpMessages(
    {
      category: req.category,
      question: req.question,
      benName: req.benName,
      bianName: req.bianName,
      changingLine: req.changingLine,
      interpretation: req.interpretation,
      userMessage: req.userMessage,
      history: req.history,
      facts: req.facts,
      persona: req.persona,
    },
    ctx,
  );

  const { maxTokens, temperature, timeoutMs } = ZHIPU_SPEED.followUp;
  const raw = await callZhipuChatMessages(messages, {
    model: getZhipuFastModel(),
    maxTokens,
    temperature,
    timeoutMs,
    enableThinking: false,
    retries: 2,
  });

  const cleaned = stripTemplateLabels(raw);
  if (cleaned.length < 8) throw new Error("AI 回复过短，请重试");
  setCachedFollowUpReply(
    {
      category: req.category,
      benName: req.benName,
      bianName: req.bianName,
      changingLine: req.changingLine,
      userMessage: req.userMessage,
      persona: req.persona,
      history: req.history,
    },
    cleaned,
  );
  return cleaned;
}

/** 深入追问：仅 AI，无本地模板兜底 */
export async function answerFollowUp(req: FollowUpRequest): Promise<FollowUpAnswer> {
  if (!isZhipuEnabled()) {
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "深入追问需接入云端大模型，当前暂未开放"
        : "深入追问需接入云端 AI，请在服务端配置密钥后重启",
    );
  }

  const reply = await generateFollowUpWithZhipu(req);
  return { reply, source: "ai", model: getZhipuFastModel() };
}

export { isZhipuEnabled as isFollowUpAiEnabled };
