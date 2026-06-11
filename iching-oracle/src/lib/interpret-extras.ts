import {
  buildFollowUpHints,
  type InterpretFollowUpHints,
} from "@/lib/common-questions";
import type { FollowUpPersona } from "@/lib/follow-up-persona";
import { extractInterpretFacts, type InterpretFacts } from "@/lib/interpret-facts";
import { buildLayer1Facts, buildLayer2Context } from "@/lib/interpret-pipeline";
import type { InterpretInput, InterpretResult } from "@/lib/interpret.local";

export type InterpretExtras = {
  facts: InterpretFacts | null;
  followUp: InterpretFollowUpHints;
};

/** 解读结果附加：层1 facts + 层2 匹配的追问引导 */
export function buildInterpretExtras(
  input: InterpretInput,
  persona: FollowUpPersona = "analyst",
): InterpretExtras {
  return {
    facts: buildLayer1Facts(input),
    followUp: buildFollowUpHints(input.question, input.category, persona),
  };
}

export function attachInterpretExtras(
  input: InterpretInput,
  result: InterpretResult,
  persona: FollowUpPersona = "analyst",
): InterpretResult {
  const { facts, followUp } = buildInterpretExtras(input, persona);
  return { ...result, facts: facts ?? undefined, followUp };
}

/** 层2 上下文（调试 / 全 AI prompt 复用） */
export { buildLayer2Context };
