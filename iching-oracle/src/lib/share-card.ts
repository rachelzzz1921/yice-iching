import type { CategoryId } from "@/lib/iching";
import { CATEGORIES } from "@/lib/iching";
import type { InterpretSection } from "@/lib/interpret.local";
import { linesToAnalysis } from "@/lib/interpret-format";
import { splitVerdictBody } from "@/lib/interpret-sections";

export type ShareCardData = {
  benName: string;
  benChar: string;
  bianName?: string | null;
  bianChar?: string | null;
  category: CategoryId;
  question: string;
  changingLine: number;
  sections: InterpretSection[];
  createdAt?: number;
};

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

export function pickShareCardCopy(sections: InterpretSection[]): {
  verdict: string;
  headline: string;
} {
  const verdictSec =
    sections.find((s) => s.kind === "verdict" || s.title === "断语") ??
    sections[sections.length - 1];
  const headlineSec =
    sections.find((s) => s.kind === "headline" || s.title === "一句话定性") ?? null;
  const overview =
    headlineSec ??
    sections.find((s) => s.kind === "overview" || s.title === "卦象气场") ??
    sections[0];

  const verdictRaw =
    verdictSec?.analysis ??
    verdictSec?.body ??
    (verdictSec?.lines?.length ? linesToAnalysis(verdictSec.lines) : "") ??
    "";
  const { punchline } = splitVerdictBody(verdictRaw);
  const headlineRaw =
    headlineSec?.lines?.[0]?.text ??
    overview?.lines?.[0]?.text ??
    overview?.analysis?.split("\n").find((l) => l.trim()) ??
    overview?.body?.split("\n").find((l) => l.trim()) ??
    "";

  return {
    verdict: punchline.replace(/\s+/g, " ").trim().slice(0, 72),
    headline: headlineRaw.replace(/\s+/g, " ").trim().slice(0, 56),
  };
}

export function formatShareCardMeta(data: ShareCardData): string {
  const cat = CATEGORIES.find((c) => c.id === data.category)?.label ?? data.category;
  const dong =
    data.changingLine >= 1 && data.changingLine <= 6
      ? ` · 第${YAO_POS[data.changingLine - 1]}爻动`
      : "";
  const bian = data.bianName ? ` → ${data.bianName}卦` : "";
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("zh-CN")
    : new Date().toLocaleDateString("zh-CN");
  return `${cat}${dong} · ${date}${bian}`;
}

export function buildSharePlainText(data: ShareCardData): string {
  const { verdict, headline } = pickShareCardCopy(data.sections);
  const meta = formatShareCardMeta(data);
  const lines = [
    `【易测】${data.benName}卦 ${data.benChar}`,
    meta,
    `问：${data.question}`,
    headline ? `卦象：${headline}` : "",
    verdict ? `断语：${verdict}` : "",
    "",
    "—— 易测 · 易经事占",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function exportElementAsPng(el: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#f3ece0",
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function sharePngIfSupported(
  el: HTMLElement,
  title: string,
  text: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: "#f3ece0" });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "yice-hexagram.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return true;
  }
  await navigator.share({ title, text });
  return true;
}
