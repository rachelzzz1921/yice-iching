/** 解读正文的最小展示单元：可选小标题 + 一段文字 */

export type InterpretLine = {
  label?: string;
  text: string;
};

const COLON_LABEL = /^([^：\n]{2,12})：([\s\S]*)$/;
const BRACKET_LABEL = /^【([^】]+)】([\s\S]*)$/;

export function paragraphToLine(paragraph: string): InterpretLine {
  const trimmed = paragraph.trim();
  if (!trimmed) return { text: "" };

  const bracket = trimmed.match(BRACKET_LABEL);
  if (bracket) {
    const label = bracket[1] === "下一步" ? "长期来看" : bracket[1];
    return { label, text: bracket[2].trim() || trimmed };
  }

  const colon = trimmed.match(COLON_LABEL);
  if (colon && !/[，。]/.test(colon[1])) {
    return { label: colon[1], text: colon[2].trim() };
  }

  if (trimmed.startsWith("梅花策略")) {
    return { label: "策略", text: trimmed };
  }

  return { text: trimmed };
}

export function paragraphsToLines(paragraphs: string[]): InterpretLine[] {
  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map(paragraphToLine)
    .filter((l) => l.text);
}

export function textToLines(text: string): InterpretLine[] {
  return paragraphsToLines(text.split(/\n\n+/));
}

export function linesToAnalysis(lines: InterpretLine[]): string {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => (l.label ? `${l.label}：${l.text}` : l.text))
    .join("\n\n");
}

export function resolveSectionLines(section: {
  lines?: InterpretLine[];
  analysis?: string;
  body?: string;
}): InterpretLine[] {
  if (section.lines?.length) return section.lines;
  const raw = (section.analysis ?? section.body ?? "").trim();
  return raw ? textToLines(raw) : [];
}
