import { linesToAnalysis, resolveSectionLines, type InterpretLine } from "@/lib/interpret-format";
import { FIVE_FIELD_TITLES } from "@/lib/interpret-pipeline";
import type { InterpretSection } from "@/lib/interpret.local";

/** 正文内嵌【标题】被 parseSections 误拆出的段落，展示时并入上一维 */
const MERGE_INTO_PREV_TITLES = new Set([
  "下一步",
  "长期来看",
  "策略",
  "梅花策略",
  "直断",
]);

function mergeSectionInto(target: InterpretSection, extra: InterpretSection): InterpretSection {
  const targetLines = resolveSectionLines(target);
  const extraLines = resolveSectionLines(extra).map((line): InterpretLine => {
    if (line.label) return line;
    const label = extra.title === "下一步" ? "长期来看" : extra.title;
    return { label, text: line.text };
  });
  const lines = [...targetLines, ...extraLines];
  return {
    ...target,
    lines,
    analysis: linesToAnalysis(lines),
    body: undefined,
  };
}

export type OrganizedInterpretSections = {
  headline: InterpretSection | null;
  dimensions: InterpretSection[];
  verdict: InterpretSection;
  /** 全篇收束（海外 AI 偶发混在断语段内的长文） */
  synopsis: InterpretSection | null;
  timing: InterpretSection | null;
  action: InterpretSection | null;
  /** 旧版「卦象气场」兜底 */
  overview: InterpretSection | null;
};

const VERDICT_INLINE_RE = /断语[：:]\s*(.+)$/;

/** 将混在长段里的「断语：短语」拆成纵览 + 短断语 */
export function splitVerdictBody(raw: string): { summary: string | null; punchline: string } {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { summary: null, punchline: "" };

  const match = text.match(VERDICT_INLINE_RE);
  if (match) {
    const punchline = match[1].trim().replace(/[。！？.!?]+$/, "").trim();
    const before = text.slice(0, match.index).trim().replace(/[。！？\s]+$/, "");
    if (punchline && before.length > punchline.length) {
      return { summary: before, punchline };
    }
  }

  if (text.length <= 48) return { summary: null, punchline: text };

  const sentences = text.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
  const last = sentences.at(-1) ?? text;
  const lastCore = last.replace(/[。！？.!?]+$/, "").trim();
  if (sentences.length > 1 && lastCore.length <= 48) {
    return {
      summary: sentences.slice(0, -1).join(""),
      punchline: lastCore,
    };
  }

  return { summary: text, punchline: text.slice(0, 48) };
}

function sectionPlainText(section: InterpretSection): string {
  if (section.lines?.length) {
    return section.lines.map((l) => (l.label ? `${l.label}：${l.text}` : l.text)).join(" ");
  }
  return (section.analysis ?? section.body ?? "").trim();
}

/** 海外全 AI：断语段若含长文总结，拆成「纵览综括」+ 短断语 */
export function normalizeOverlongVerdict(sections: InterpretSection[]): InterpretSection[] {
  if (sections.length === 0) return sections;

  let verdictIdx = sections.findIndex((s) => s.title === "断语" || s.kind === "verdict");
  if (verdictIdx < 0) verdictIdx = sections.length - 1;

  const sec = sections[verdictIdx];
  const raw = sectionPlainText(sec);
  const { summary, punchline } = splitVerdictBody(raw);
  if (!summary) {
    if (raw === punchline) return sections;
    const next = [...sections];
    next[verdictIdx] = {
      ...sec,
      title: "断语",
      kind: "verdict",
      body: punchline,
      analysis: punchline,
      lines: [{ text: punchline }],
    };
    return next;
  }

  const synopsisSec: InterpretSection = {
    title: "纵览综括",
    kind: "synopsis",
    body: summary,
    analysis: summary,
    lines: [{ text: summary }],
  };
  const verdictSec: InterpretSection = {
    ...sec,
    title: "断语",
    kind: "verdict",
    body: punchline,
    analysis: punchline,
    lines: [{ text: punchline }],
  };

  return [...sections.slice(0, verdictIdx), synopsisSec, verdictSec, ...sections.slice(verdictIdx + 1)];
}

/** 规范解读区块：一句话定性 → 分维 → 断语 → 时间节点 / 行动锚点 */
export function organizeInterpretSections(
  sections: InterpretSection[],
): OrganizedInterpretSections | null {
  if (sections.length === 0) return null;

  const headline =
    sections.find((s) => s.title === FIVE_FIELD_TITLES.headline || s.kind === "headline") ??
    null;

  const synopsis = sections.find((s) => s.title === "纵览综括" || s.kind === "synopsis") ?? null;

  let verdictIdx = sections.findIndex((s) => s.title === "断语" || s.kind === "verdict");
  if (verdictIdx < 0) verdictIdx = sections.length - 1;
  const verdict = sections[verdictIdx];

  const timing =
    sections.find((s) => s.title === FIVE_FIELD_TITLES.timing || s.kind === "timing") ?? null;
  const action =
    sections.find((s) => s.title === FIVE_FIELD_TITLES.action || s.kind === "action") ?? null;

  const skip = new Set(
    [headline, synopsis, verdict, timing, action].filter(Boolean) as InterpretSection[],
  );

  let overview =
    sections.find((s) => s.title === "卦象气场" || s.kind === "overview") ?? null;

  const dimensions: InterpretSection[] = [];

  for (const s of sections) {
    if (skip.has(s) || s === overview) continue;

    if (MERGE_INTO_PREV_TITLES.has(s.title.trim())) {
      const prev = dimensions.at(-1) ?? overview;
      if (prev) {
        const merged = mergeSectionInto(prev, s);
        if (prev === overview) overview = merged;
        else dimensions[dimensions.length - 1] = merged;
      } else {
        dimensions.push(s);
      }
      continue;
    }

    if (s.kind === "dimension" || (!s.kind && s.title !== "断语")) {
      dimensions.push(s);
    }
  }

  return { headline, dimensions, verdict, synopsis, timing, action, overview };
}
