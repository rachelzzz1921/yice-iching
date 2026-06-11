/**
 * 智谱调用提速：模型选择与 token / 超时默认值
 */

import { AI_MAX_TOKENS } from "@/lib/ai-prompts";
import { getZhipuFullAiModel } from "@/lib/zhipu-shared";

export const ZHIPU_SPEED = {
  /** 结果页 · 海外顶级大模型 · P1/P2 四维度 + 断语 */
  fullAi: {
    maxTokens: Number(process.env.ZHIPU_FULL_AI_MAX_TOKENS) || AI_MAX_TOKENS.fullAiOverseas,
    temperature: 0.55,
    timeoutMs: Number(process.env.ZHIPU_FULL_AI_TIMEOUT_MS) || 55_000,
  },
  /** 本地草稿润色 */
  polish: {
    maxTokens: Number(process.env.ZHIPU_POLISH_MAX_TOKENS) || AI_MAX_TOKENS.polishFast,
    temperature: 0.5,
    timeoutMs: 40_000,
    /** 单段送入润色的最大字符数 */
    sectionCharCap: 280,
    /** 最多润色段数（其余保持本地引擎原文） */
    maxSections: 3,
  },
  /** 深入追问 */
  followUp: {
    maxTokens: Number(process.env.ZHIPU_FOLLOWUP_MAX_TOKENS) || AI_MAX_TOKENS.followUpFast,
    temperature: 0.65,
    timeoutMs: 22_000,
    interpretSummaryPerSection: 220,
  },
} as const;

export function getZhipuFastModel(): string {
  return getZhipuFullAiModel();
}
