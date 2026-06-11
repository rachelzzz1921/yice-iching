/** 宣纸纤维与浮墨装饰 — 字形锚定边缘，避免压住主内容 */
type GlyphSlot = "tl" | "tr" | "bl" | "br" | "ml" | "mr";

type GlyphConfig = {
  g: string;
  slot: GlyphSlot;
  delay: string;
  dur: string;
  size?: "sm" | "md" | "lg";
  pulse: 1 | 2 | 3 | 4 | 5 | 6;
};

const GLYPH_SLOTS: Record<"hero" | "default" | "quiet" | "intro", GlyphConfig[]> = {
  hero: [
    { g: "卦", slot: "tl", delay: "0s", dur: "22s", pulse: 1 },
    { g: "问", slot: "tr", delay: "1.2s", dur: "26s", pulse: 2 },
    { g: "爻", slot: "bl", delay: "2.4s", dur: "20s", pulse: 3 },
    { g: "象", slot: "br", delay: "0.6s", dur: "24s", pulse: 4 },
  ],
  default: [
    { g: "卦", slot: "tl", delay: "0s", dur: "22s", pulse: 1 },
    { g: "象", slot: "br", delay: "1.5s", dur: "26s", pulse: 2 },
  ],
  quiet: [{ g: "易", slot: "tr", delay: "0s", dur: "28s", pulse: 1 }],
  intro: [
    { g: "卦", slot: "tl", delay: "-1.4s", dur: "9.5s", size: "lg", pulse: 1 },
    { g: "易", slot: "tr", delay: "-5.2s", dur: "13s", size: "md", pulse: 2 },
    { g: "问", slot: "ml", delay: "-7.8s", dur: "11s", size: "md", pulse: 3 },
    { g: "象", slot: "mr", delay: "-2.9s", dur: "15s", size: "md", pulse: 4 },
    { g: "爻", slot: "bl", delay: "-9.6s", dur: "12s", size: "lg", pulse: 5 },
    { g: "测", slot: "br", delay: "-4.1s", dur: "10s", size: "md", pulse: 6 },
  ],
};

const INTRO_WATERMARK = "道";

export function PaperDecor({
  variant = "default",
}: {
  variant?: "hero" | "default" | "quiet" | "intro";
}) {
  const glyphs = GLYPH_SLOTS[variant];
  const isIntro = variant === "intro";

  return (
    <div aria-hidden className={`paper-decor paper-decor--${variant} pointer-events-none absolute inset-0 overflow-hidden`}>
      <span className="paper-fiber paper-fiber-a" />
      <span className="paper-fiber paper-fiber-b" />
      <span className="paper-fiber paper-fiber-c" />
      {isIntro ? (
        <span className="paper-glyph-watermark font-ritual-cjk">{INTRO_WATERMARK}</span>
      ) : null}
      {glyphs.map(({ g, slot, delay, dur, size, pulse }) => (
        <span
          key={`${variant}-${g}-${slot}`}
          className={[
            "paper-glyph",
            `paper-glyph-${slot}`,
            "font-ritual-cjk",
            size ? `paper-glyph-size-${size}` : "",
            isIntro ? `paper-glyph-pulse-${pulse}` : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            ["--delay" as never]: delay,
            ["--dur" as never]: dur,
          }}
        >
          {g}
        </span>
      ))}
      {variant === "hero" ? (
        <>
          <span className="paper-seal-ring paper-seal-ring-a" />
          <span className="paper-seal-ring paper-seal-ring-b" />
        </>
      ) : null}
    </div>
  );
}
