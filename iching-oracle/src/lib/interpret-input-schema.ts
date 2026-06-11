import { z } from "zod";
import type { InterpretInput } from "@/lib/interpret.local";

const YaoLineSchema = z.object({
  yang: z.union([z.literal(0), z.literal(1)]),
  changing: z.boolean(),
  label: z.string().optional(),
});

/** 仅当恰好 6 爻时保留；否则视为未传（与本地引擎一致） */
function normalizeYao(val: unknown): InterpretInput["yao"] {
  if (!Array.isArray(val) || val.length !== 6) return undefined;
  return val as NonNullable<InterpretInput["yao"]>;
}

export const InterpretInputSchema = z.object({
  category: z.enum(["career", "family", "relationship", "health", "fate"]),
  question: z.string().min(1).max(500),
  benName: z.string().min(1).max(20),
  bianName: z.string().max(20).optional().nullable(),
  changingLine: z.number().int().min(0).max(6),
  castMethod: z.enum(["coin", "yarrow", "meihua", "direct"]).optional(),
  yao: z.preprocess(
    normalizeYao,
    z.array(YaoLineSchema).length(6).optional(),
  ),
});

export function parseInterpretInput(d: unknown): InterpretInput {
  const raw =
    typeof d === "object" && d !== null && "data" in d
      ? (d as { data: unknown }).data
      : d;
  return InterpretInputSchema.parse(raw);
}

/** 将 Zod / 网络错误转为用户可读文案 */
export function formatInterpretValidationError(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues: { path: (string | number)[]; message: string }[] })
      .issues;
    const yaoIssue = issues.find((i) => i.path[0] === "yao");
    if (yaoIssue) {
      return "六爻数据不完整，请返回「起卦」步骤确认已得齐六爻后再生成全AI解读。";
    }
    return issues[0]?.message ?? "参数校验失败";
  }
  if (e instanceof Error) {
    const msg = e.message.trim();
    if (msg.startsWith("[")) {
      try {
        return formatInterpretValidationError({ issues: JSON.parse(msg) });
      } catch {
        /* fall through */
      }
    }
    if (msg.includes("Array must contain exactly 6") || msg.includes("too_small")) {
      return "六爻数据不完整，请返回「起卦」步骤确认已得齐六爻后再试。";
    }
    return e.message;
  }
  return "全AI解读请求失败";
}
