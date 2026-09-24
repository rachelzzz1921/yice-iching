/**
 * 智谱调用提速：模型选择与 token / 超时默认值
 */

import { AI_MAX_TOKENS } from "@/lib/ai-prompts";
import { getZhipuModel } from "@/lib/zhipu-shared";

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
  /** 深入追问（关思考链 + compact prompt；单次超时，外层还有重试） */
  followUp: {
    maxTokens: Number(process.env.ZHIPU_FOLLOWUP_MAX_TOKENS) || AI_MAX_TOKENS.followUpFast,
    temperature: Number(process.env.ZHIPU_FOLLOWUP_TEMPERATURE) || 0.35,
    timeoutMs: Number(process.env.ZHIPU_FOLLOWUP_TIMEOUT_MS) || 28_000,
  },
} as const;

/** 追问 / 润色等交互场景：用 Flash，Pro 留给全量解读 */
export function getZhipuFastModel(): string {
  return getZhipuModel();
}
