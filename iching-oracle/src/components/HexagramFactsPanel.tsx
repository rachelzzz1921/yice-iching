import type { InterpretFacts } from "@/lib/interpret-facts";
import type { CategoryId } from "@/lib/iching";
import {
  getGuaciPlainSummary,
  getXiangPlainSummary,
  getYaoPlainSummary,
  getYaoXiangPlainSummary,
} from "@/lib/guaci-plain";

type Props = {
  facts: InterpretFacts;
  category?: CategoryId;
};

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

function PlainNote({
  text,
  missingHint = "语料库暂无专条白话，可参阅上方原文释义。",
}: {
  text: string | null;
  missingHint?: string;
}) {
  if (text?.trim()) {
    return (
      <div className="mt-1.5 rounded-md border border-[var(--gold)]/15 bg-[var(--gold)]/6 px-2.5 py-2">
        <p className="mb-1 text-[9px] tracking-[0.14em] text-[var(--gold)]/80">白话</p>
        <p className="text-[11px] leading-relaxed text-foreground/92">{text}</p>
      </div>
    );
  }

  return (
    <div className="mt-1.5 rounded-md border border-dashed border-border/70 bg-secondary/20 px-2.5 py-2">
      <p className="mb-0.5 text-[9px] tracking-[0.14em] text-muted-foreground/80">白话</p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/90">{missingHint}</p>
    </div>
  );
}

function ClassicBlock({
  label,
  text,
  plain,
  plainMissingHint,
}: {
  label: string;
  text: string | null | undefined;
  plain: string | null;
  plainMissingHint?: string;
}) {
  if (!text?.trim()) return null;

  return (
    <div className="border-l-2 border-border/60 pl-3">
      <p className="text-[9px] tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif-cjk text-[12px] leading-[1.75] text-foreground/88">{text}</p>
      <PlainNote text={plain} missingHint={plainMissingHint} />
    </div>
  );
}

function BlockHeader({
  step,
  title,
  meta,
}: {
  step: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 font-serif-cjk text-[11px] tabular-nums text-[var(--gold)]">{step}</span>
      <div className="min-w-0">
        <p className="font-serif-cjk text-sm font-medium text-foreground">{title}</p>
        {meta ? <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
}

export function HexagramFactsPanel({ facts, category = "fate" }: Props) {
  const { benGua, changingLine, bianGua, meihua } = facts;
  const benPlain = getGuaciPlainSummary(benGua.name, category);
  const benXiangPlain = getXiangPlainSummary(benGua.name);
  const yaoPlain =
    changingLine?.position
      ? getYaoPlainSummary(benGua.name, changingLine.position, category)
      : null;
  const yaoXiangPlain =
    changingLine?.position
      ? getYaoXiangPlainSummary(changingLine.position, changingLine.yinyang, category)
      : null;
  const bianPlain = bianGua ? getGuaciPlainSummary(bianGua.name, category) : null;

  const xiangPlainForDisplay =
    benXiangPlain && benXiangPlain !== benPlain
      ? benXiangPlain
      : benXiangPlain && benPlain
        ? "象意与卦辞同向，见上卦辞白话。"
        : benXiangPlain;

  return (
    <section
      aria-label="卦象原文"
      className="rounded-lg border border-border/80 bg-background/50 px-4 py-3.5"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground">卦象原文 · 语料库</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground/90">
        先读原文，再看白话；每条原文下均附白话或缺省说明。
      </p>

      <div className="space-y-4">
        <article className="space-y-2.5">
          <BlockHeader
            step="①"
            title={`本卦 · ${benGua.name} ${benGua.char}`}
            meta={`${benGua.lower}下${benGua.upper}上 · 下${benGua.lowerWuxing}上${benGua.upperWuxing}`}
          />
          <div className="space-y-3 pl-5">
            <ClassicBlock label="卦辞" text={benGua.guaci} plain={benPlain} />
            <ClassicBlock
              label="象曰"
              text={benGua.xiangci}
              plain={xiangPlainForDisplay}
              plainMissingHint="象辞白话语料待补，可结合卦辞白话理解。"
            />
          </div>
        </article>

        {changingLine ? (
          <article className="rounded-md border border-[var(--gold)]/20 bg-secondary/25 px-3 py-2.5">
            <BlockHeader
              step="②"
              title={`动爻 · 第${YAO_POS[changingLine.position - 1]}爻${changingLine.yinyang ? ` · ${changingLine.yinyang}` : ""}`}
            />
            <div className="mt-2.5 space-y-3 pl-5">
              <ClassicBlock label="爻辞" text={changingLine.yaoci} plain={yaoPlain} />
              <ClassicBlock
                label="小象"
                text={changingLine.yaoxiang}
                plain={yaoXiangPlain}
                plainMissingHint="此爻小象白话待补，可结合爻辞白话与动爻位置理解。"
              />
            </div>
          </article>
        ) : (
          <p className="pl-5 text-[11px] text-muted-foreground">② 静卦 · 无动爻</p>
        )}

        {bianGua ? (
          <article className="space-y-2.5">
            <BlockHeader
              step="③"
              title={`变卦 · ${bianGua.name} ${bianGua.char}`}
              meta={`${bianGua.lower}下${bianGua.upper}上`}
            />
            <div className="pl-5">
              <ClassicBlock label="卦辞" text={bianGua.guaci} plain={bianPlain} />
            </div>
          </article>
        ) : null}
      </div>

      {meihua ? (
        <p className="mt-4 border-t border-border/50 pt-3 text-[10px] leading-relaxed text-muted-foreground">
          梅花体用：体{meihua.ti} · 用{meihua.yong}（{meihua.relation}）· 互卦{meihua.mutual}
        </p>
      ) : null}
    </section>
  );
}
