/**
 * Node 打包入口 → backend/src/services/interpret.bundle.cjs
 */
export { interpretLocally, followUpLocally, parseSections, finalizeInterpretSections } from "@/lib/interpret.local";
export { composeFollowUpReply } from "@/lib/followup-engine";
export { answerFollowUp, generateFollowUpWithZhipu, isFollowUpAiEnabled } from "@/lib/zhipu-followup";
export { polishInterpretationWithZhipu, isZhipuEnabled } from "@/lib/zhipu-polish";
export { runZhipuTestGeneration } from "@/lib/zhipu-generate";
export { extractInterpretFacts, factsToPromptJson } from "@/lib/interpret-facts";
export { attachInterpretExtras, buildInterpretExtras } from "@/lib/interpret-extras";
export { buildAiCorpusBundle, formatAiCorpusUserPrompt } from "@/lib/ai-corpus-context";
export {
  FULL_AI_INTERPRET_SYSTEM_PROMPT,
  FULL_AI_PROMPT_VERSION,
  buildFullAiReadingContext,
  buildFullAiUserPrompt,
  buildFullAiInterpretSystemPrompt,
  buildFullAiInterpretUserPrompt,
  buildSpecialNotes,
  formatYaoPositions,
  dimensionTitlesForCategory,
  type FullAiReadingContext,
} from "@/lib/full-ai-interpret-prompts";
export {
  normalizeFollowUpPersona,
  resolveFollowUpConfig,
  DEFAULT_FOLLOWUP_PERSONA,
  FOLLOWUP_PERSONA_ORDER,
} from "@/lib/follow-up-persona";
