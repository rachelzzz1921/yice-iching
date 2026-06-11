import { forwardRef } from "react";
import { CATEGORIES } from "@/lib/iching";
import {
  formatShareCardMeta,
  pickShareCardCopy,
  type ShareCardData,
} from "@/lib/share-card";

/** 分享图固定样式（不用 CSS 变量，便于导出 PNG） */
const CARD = {
  width: 360,
  bg: "linear-gradient(165deg, #f7f2ea 0%, #ebe3d4 48%, #e2d9c8 100%)",
  border: "#b8954a",
  ink: "#2a2620",
  muted: "#6b6358",
  gold: "#9a7b3c",
  bar: "#2a2620",
  barText: "#f5f0e8",
} as const;

type Props = {
  data: ShareCardData;
};

export const HexagramShareCard = forwardRef<HTMLDivElement, Props>(function HexagramShareCard(
  { data },
  ref,
) {
  const cat = CATEGORIES.find((c) => c.id === data.category);
  const { verdict, headline } = pickShareCardCopy(data.sections);
  const meta = formatShareCardMeta(data);

  return (
    <div
      ref={ref}
      style={{
        width: CARD.width,
        boxSizing: "border-box",
        fontFamily:
          '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
        background: CARD.bg,
        border: `1px solid ${CARD.border}`,
        borderRadius: 16,
        overflow: "hidden",
        color: CARD.ink,
      }}
    >
      <div
        style={{
          padding: "20px 22px 16px",
          borderBottom: `1px solid ${CARD.border}33`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.28em",
                color: CARD.gold,
              }}
            >
              易测
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 10, color: CARD.muted }}>
              易经事占 · 分享卡片
            </p>
          </div>
          {cat ? (
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 999,
                border: `1px solid ${cat.borderColor}`,
                background: cat.bg,
                color: cat.textColor,
              }}
            >
              {cat.label}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            marginTop: 20,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, lineHeight: 1, color: CARD.ink }}>{data.benChar}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: CARD.muted }}>{data.benName}卦</div>
          </div>
          {data.bianChar && data.bianName ? (
            <>
              <span style={{ fontSize: 18, color: CARD.gold }}>→</span>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 56, lineHeight: 1, color: CARD.ink }}>{data.bianChar}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: CARD.muted }}>
                  {data.bianName}卦（变）
                </div>
              </div>
            </>
          ) : null}
        </div>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: 10,
            color: CARD.muted,
            textAlign: "center",
          }}
        >
          {meta}
        </p>
      </div>

      <div style={{ padding: "16px 22px 18px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: CARD.gold,
          }}
        >
          所问
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          {data.question}
        </p>

        {headline ? (
          <>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: CARD.gold,
              }}
            >
              卦象气场
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                lineHeight: 1.6,
                color: CARD.muted,
              }}
            >
              {headline}
            </p>
          </>
        ) : null}
      </div>

      {verdict ? (
        <div
          style={{
            background: CARD.bar,
            padding: "14px 22px 16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: `${CARD.barText}99`,
            }}
          >
            断语
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 15,
              lineHeight: 1.5,
              fontWeight: 600,
              color: CARD.barText,
            }}
          >
            {verdict}
          </p>
        </div>
      ) : null}

      <div
        style={{
          padding: "10px 22px 12px",
          textAlign: "center",
          fontSize: 9,
          color: CARD.muted,
          letterSpacing: "0.08em",
        }}
      >
        yice · 易测
      </div>
    </div>
  );
});
