/** 追问人格：知己细语 vs 大师解惑 */

import * as followUpConfig from "@/lib/followUpConfig";
import * as followUpMaster from "@/lib/followUpMaster";

export type FollowUpPersona = "analyst" | "master";

/** UI 展示顺序：大师解惑优先 */
export const FOLLOWUP_PERSONA_ORDER: FollowUpPersona[] = ["master", "analyst"];

export const FOLLOWUP_PERSONA_STORAGE_KEY = "iching:followUpPersona";

/** 默认大师解惑语气 */
export const DEFAULT_FOLLOWUP_PERSONA: FollowUpPersona = "master";

export function normalizeFollowUpPersona(value?: string | null): FollowUpPersona {
  if (value === "analyst") return "analyst";
  return "master";
}

export function loadFollowUpPersona(): FollowUpPersona {
  if (typeof window === "undefined") return DEFAULT_FOLLOWUP_PERSONA;
  try {
    return normalizeFollowUpPersona(localStorage.getItem(FOLLOWUP_PERSONA_STORAGE_KEY));
  } catch {
    return DEFAULT_FOLLOWUP_PERSONA;
  }
}

export function saveFollowUpPersona(persona: FollowUpPersona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLLOWUP_PERSONA_STORAGE_KEY, persona);
}

type FollowUpConfigModule = {
  buildFollowUpPrompt: (args: { category: string; userMessage: string }) => string;
};

export function resolveFollowUpConfig(persona?: FollowUpPersona | string | null): FollowUpConfigModule {
  return normalizeFollowUpPersona(persona) === "master"
    ? (followUpMaster as unknown as FollowUpConfigModule)
    : (followUpConfig as unknown as FollowUpConfigModule);
}
