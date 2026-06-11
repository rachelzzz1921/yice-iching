/**
 * 智谱 GLM：润色本地解读草稿（结构不变，提升贴题度）
 */

import {
  polishSystemPromptCompact,
  polishUserPrompt,
} from "@/lib/ai-prompts";
import { linesToAnalysis, textToLines } from "@/lib/interpret-format";
import type { CategoryId } from "@/lib/iching";
import type { InterpretResult, InterpretSection } from "@/lib/interpret.local";
import { getZhipuFastModel, ZHIPU_SPEED } from "@/lib/zhipu-speed";
import { callZhipuChat, isZhipuEnabled } from "@/lib/zhipu-shared";

export { isZhipuEnabled };

function sectionAnalysis(s: InterpretSection): string {
  return s.analysis ?? s.body ?? "";
}

function setSectionAnalysis(s: InterpretSection, text: string): InterpretSection {
  const lines = textToLines(text);
  const analysis = lines.length ? linesToAnalysis(lines) : text;
  if (s.classic) return { ...s, analysis, lines };
  return { ...s, analysis, body: text, lines };
}

function truncatePolishBody(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

/** 对除断语外的 analysis 做贴题润色，保留【标题】结构（仅润色最长几段以提速） */
export async function polishInterpretationWithZhipu(
  result: InterpretResult,
  meta: { category: string; question: string; benName: string; bianName?: string | null },
): Promise<InterpretResult> {
  if (!isZhipuEnabled()) return result;

  const sections = [...result.sections];
  const verdictIdx = sections.length - 1;
  const { sectionCharCap, maxSections } = ZHIPU_SPEED.polish;

  const toPolish = sections
    .map((s, i) => ({ s, i, len: sectionAnalysis(s).length }))
    .filter(({ i, len }) => i < verdictIdx && len > 48)
    .sort((a, b) => b.len - a.len)
    .slice(0, maxSections);

  if (toPolish.length === 0) return result;

  const payload = toPolish
    .map(({ s }) => `【${s.title}】\n${truncatePolishBody(sectionAnalysis(s), sectionCharCap)}`)
    .join("\n\n");

  let raw: string;
  try {
    const { maxTokens, temperature, timeoutMs } = ZHIPU_SPEED.polish;
    raw = await callZhipuChat(
      polishSystemPromptCompact({
        category: meta.category as CategoryId,
        question: meta.question,
      }),
      polishUserPrompt(payload),
      {
        model: getZhipuFastModel(),
        maxTokens,
        temperature,
        timeoutMs,
      },
    );
  } catch (e) {
    console.warn("[zhipu-polish] skip:", e instanceof Error ? e.message : e);
    return result;
  }

  const polished = parsePolishedSections(raw);
  for (const { s, i } of toPolish) {
    const p = polished.get(s.title);
    if (p) sections[i] = setSectionAnalysis(s, p);
  }

  const text = sections
    .map((s) => {
      const body =
        s.classic && s.analysis
          ? `⟦原文⟧\n${s.classic}\n\n${s.analysis}`
          : s.analysis ?? s.body ?? "";
      return `【${s.title}】\n${body}`;
    })
    .join("\n\n");

  return { text, sections };
}

function parsePolishedSections(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /【([^】]+)】\s*([\s\S]*?)(?=【|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    let body = m[2].trim();
    if (body.startsWith("⟦原文⟧")) {
      const nl = body.indexOf("\n\n");
      body = nl >= 0 ? body.slice(nl + 2).trim() : body;
    }
    map.set(m[1].trim(), body);
  }
  return map;
}
