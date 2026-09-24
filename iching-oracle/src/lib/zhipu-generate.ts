/**
 * 智谱 GLM：结果页 · 海外顶级大模型 · 全量解读（P1/P2）
 */

import {
  buildFullAiInterpretSystemPrompt,
  buildFullAiInterpretUserPrompt,
} from "@/lib/full-ai-interpret-prompts";
import { normalizeOverlongVerdict } from "@/lib/interpret-sections";
import { buildAiCorpusBundle } from "@/lib/ai-corpus-context";
import {
  finalizeInterpretSections,
  parseSections,
  type InterpretInput,
  type InterpretResult,
} from "@/lib/interpret.local";
import {
  getCachedFullAiInterpret,
  setCachedFullAiInterpret,
} from "@/lib/zhipu-fullai-cache";
import { ZHIPU_SPEED } from "@/lib/zhipu-speed";
import { callZhipuChat, getZhipuFullAiModel, isZhipuEnabled } from "@/lib/zhipu-shared";

export type ZhipuTestBlock = {
  enabled: boolean;
  status: "disabled" | "ok" | "error";
  message?: string;
  model?: string;
  result?: InterpretResult;
  /** 命中进程内缓存（同卦同问 1 小时内） */
  fromCache?: boolean;
};

export { isZhipuEnabled };

/** 智谱完整生成一卦解读 */
export async function generateInterpretationWithZhipu(
  input: InterpretInput,
): Promise<{ result: InterpretResult; fromCache: boolean }> {
  const cached = getCachedFullAiInterpret(input);
  if (cached) return { result: cached, fromCache: true };

  const bundle = buildAiCorpusBundle(input);
  if (!bundle) throw new Error(`卦名「${input.benName}」不在卦辞库中`);

  const model = getZhipuFullAiModel();
  const { maxTokens, temperature, timeoutMs } = ZHIPU_SPEED.fullAi;

  const raw = await callZhipuChat(
    buildFullAiInterpretSystemPrompt(),
    buildFullAiInterpretUserPrompt(input),
    { model, maxTokens, temperature, timeoutMs },
  );

  const sections = normalizeOverlongVerdict(parseSections(raw));
  if (sections.length < 4) {
    throw new Error("AI 输出格式异常，请重试");
  }

  const withKinds = sections.map((s, i, arr) => {
    if (s.title === "卦象气场") return { ...s, kind: "overview" as const };
    if (s.title === "断语" || i === arr.length - 1) return { ...s, kind: "verdict" as const };
    return { ...s, kind: "dimension" as const };
  });

  const result = finalizeInterpretSections(withKinds);
  setCachedFullAiInterpret(input, result);
  return { result, fromCache: false };
}

export async function runZhipuTestGeneration(input: InterpretInput): Promise<ZhipuTestBlock> {
  if (!isZhipuEnabled()) {
    return {
      enabled: false,
      status: "disabled",
      message:
        process.env.NODE_ENV === "production"
          ? "云端大模型暂未接入"
          : "云端 AI 未配置，请在服务端设置密钥后重启",
    };
  }

  try {
    const { result, fromCache } = await generateInterpretationWithZhipu(input);
    return {
      enabled: true,
      status: "ok",
      model: getZhipuFullAiModel(),
      result,
      fromCache,
    };
  } catch (e) {
    return {
      enabled: true,
      status: "error",
      message: e instanceof Error ? e.message : "AI 生成失败",
    };
  }
}
