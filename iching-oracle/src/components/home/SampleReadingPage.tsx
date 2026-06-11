import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { ArrowRight, Sparkles } from "lucide-react";
import { PaperDecor } from "@/components/home/PaperDecor";
import { sampleCtaClass, useSampleCtaHot } from "@/components/home/useSampleCtaHot";
import type { CategoryId } from "@/lib/iching";
import { playRitualSound, unlockRitualAudio } from "@/lib/ritual-sounds";

type ReadingLine = { dim: string; text: string };

type SampleReading = {
  hex: string;
  bian?: string;
  changing: string;
  category: string;
  categoryId: CategoryId;
  question: string;
  lines: ReadingLine[];
  verdict: string;
};

const SAMPLES: SampleReading[] = [
  {
    hex: "水雷屯",
    bian: "水泽节",
    changing: "初爻动",
    category: "事业",
    categoryId: "career",
    question: "创业时机是否成熟",
    lines: [
      {
        dim: "时机判断",
        text: "屯卦象万物始生，草昧初创。当下资源与团队尚在聚拢期，市场窗口已现但根基未固——宜蓄势，不宜高举高打。",
      },
      {
        dim: "隐患与阻力",
        text: "初爻动变节，示「节制」：资金节奏、合伙人预期、个人精力三处皆需设上限；最怕因焦虑而提前 All in。",
      },
      {
        dim: "具体建议",
        text: "先以 MVP 或小范围付费验证需求，保留 6 个月生活储备；三月后再评估是否全职投入，并书面约定股权与退出机制。",
      },
      {
        dim: "结果走向",
        text: "变节卦主「有度则久」——若按节奏推进，下半年可见清晰信号；若仓促扩张，反易在季末耗散。",
      },
    ],
    verdict: "总断：可创，但宜「小步快跑、大方向缓定」。",
  },
  {
    hex: "风地观",
    bian: "风山渐",
    changing: "五爻动",
    category: "感情",
    categoryId: "relationship",
    question: "这段感情还有未来吗",
    lines: [
      {
        dim: "关系现状",
        text: "观卦主观察，五爻「观我生」——当前症结不在对方一句定论，而在双方信息不对等与期待错位；卦象示「未坏尽，但未谈透」。",
      },
      {
        dim: "隐患与阻力",
        text: "猜测与冷处理正在放大内耗；暧昧信号未必等于背叛，但回避沟通会让小问题发酵成信任危机。",
      },
      {
        dim: "具体建议",
        text: "安排一次不被打扰的深度对话，只谈边界、节奏与未来 1–2 年的期待，不逼当场给「永远」的承诺；谈后观察对方是否愿意同频调整。",
      },
      {
        dim: "结果走向",
        text: "变渐卦利「循序渐进」——若双方肯谈，两月内可见走向；若仍回避，卦象示宜止损内耗而非无限等待。",
      },
    ],
    verdict: "总断：未来不在卦里，在「是否愿意一起把话说清」。",
  },
  {
    hex: "雷水解",
    bian: "水风井",
    changing: "初爻动",
    category: "事业",
    categoryId: "career",
    question: "两个 offer 如何选",
    lines: [
      {
        dim: "时机判断",
        text: "解卦利涉险，但初爻动示「解而慎始」——眼前不是「哪个更光鲜」，而是「哪个先解近忧」：现金流、家庭责任、身心负荷。",
      },
      {
        dim: "隐患与阻力",
        text: "Offer B 的期权与成长叙事诱人，但条款模糊；Offer A 稳定却可能压抑长期赛道。理性表格算不出「安全感」与「可能性」的权重。",
      },
      {
        dim: "具体建议",
        text: "短期优先现金流更确定的 A；对 B 要求书面化期权与回退条款，可谈顾问/part-time 保留连接，半年后再评估是否切换。",
      },
      {
        dim: "结果走向",
        text: "变井卦「养而不穷」——先固本，再寻活水；一步到位的跃迁未必是当下最优解。",
      },
    ],
    verdict: "总断：先解近忧，再图远谋；留好退路，比赌一次更聪明。",
  },
];

function ReadingBlock({ sample, index }: { sample: SampleReading; index: number }) {
  const isLast = index === SAMPLES.length - 1;
  const { footRef, ctaHot, highlightCta } = useSampleCtaHot(isLast);

  const pulseCta = () => {
    unlockRitualAudio();
    playRitualSound("ui-select");
    highlightCta();
  };

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--gold)]/35 bg-secondary/25 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--gold)_10%,transparent)]">
      {index > 0 && (
        <div className="border-b border-border/60 bg-secondary/40 px-4 py-1.5 text-center sm:px-5">
          <span className="text-[10px] tracking-[0.25em] text-muted-foreground">示例 {index + 1}</span>
        </div>
      )}

      <header className="border-b border-border/70 bg-card/95 px-4 py-3 sm:px-5">
        <div className="reading-block-head">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">卦象</p>
            <p className="mt-0.5 font-serif-cjk text-base font-medium text-foreground">{sample.hex}</p>
            {sample.bian && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                变 <span className="font-serif-cjk text-foreground/80">{sample.bian}</span>
                <span className="mx-1 text-border">·</span>
                {sample.changing}
              </p>
            )}
          </div>
          <div className="reading-block-head-meta">
            <span className="inline-block rounded-sm border border-[var(--gold)]/30 bg-[var(--bagua-active-bg)] px-1.5 py-0.5 text-[10px] text-[var(--gold)]">
              {sample.category}
            </span>
            <p className="mt-1.5 text-[10px] tracking-[0.15em] text-muted-foreground sm:text-left">所问</p>
            <p className="mt-0.5 text-xs leading-snug text-foreground sm:max-w-[11rem]">{sample.question}</p>
          </div>
        </div>
      </header>

      <div className="divide-y divide-border/60">
        {sample.lines.map((line) => (
          <div key={`${sample.hex}-${line.dim}`} className="px-4 py-2.5 sm:px-5 sm:py-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="shrink-0 text-[var(--gold)]" />
              <span className="text-[10px] font-medium tracking-[0.12em] text-[var(--gold)]">{line.dim}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px] sm:leading-relaxed">
              {line.text}
            </p>
          </div>
        ))}
      </div>

      <div
        ref={footRef}
        className="flex items-center justify-between gap-3 border-t border-border/70 bg-secondary/30 px-4 py-2.5 sm:px-5"
      >
        <button
          type="button"
          onClick={pulseCta}
          className={`text-left text-[10px] tracking-[0.12em] transition-colors ${
            ctaHot ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          心有类似困惑？
        </button>
        <DivineEntryLink
          search={{ category: sample.categoryId, q: sample.question, skipEntry: true }}
          onClick={() => {
            unlockRitualAudio();
            playRitualSound("ui-select");
          }}
          className={sampleCtaClass(ctaHot, "gold")}
        >
          测这个
          <ArrowRight size={ctaHot ? 13 : 11} aria-hidden />
        </DivineEntryLink>
      </div>

      <footer className="border-t border-border/80 bg-foreground px-4 py-2.5 text-center sm:px-5 sm:py-3">
        <p className="font-serif-cjk text-xs font-medium leading-relaxed text-background">{sample.verdict}</p>
      </footer>
    </article>
  );
}

export function SampleReadingPage() {
  return (
    <div className="home-page-body relative flex min-h-min flex-col home-page-pad">
      <PaperDecor variant="quiet" />
      <div className="relative shrink-0 text-center">
        <p className="section-label">Sample Reading</p>
        <h2 className="mt-0.5 font-serif-cjk text-base font-medium text-foreground sm:text-lg">测完，你会得到这样的解读</h2>
        <p className="mx-auto mt-1 max-w-md text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          不只一句吉凶——往下翻翻，看困局怎样被一层层说透；心动了，就是你的卦
        </p>
        <DivineEntryLink
          search={{ skipEntry: true }}
          onClick={() => {
            unlockRitualAudio();
            playRitualSound("ui-tap");
          }}
          className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-[0.15em] text-[var(--gold)] transition hover:gap-1.5"
        >
          跳过示例，直接问我的事
          <ArrowRight size={11} aria-hidden />
        </DivineEntryLink>
      </div>

      <div className="home-page-scroll-inner relative mt-3 pb-2">
        <div className="reading-samples-grid flex flex-col gap-4">
          {SAMPLES.map((sample, index) => (
            <ReadingBlock key={sample.hex} sample={sample} index={index} />
          ))}
        </div>
      </div>

      <div className="relative mt-2 shrink-0 border-y border-[var(--gold)]/20 bg-[var(--bagua-active-bg)]/45 py-3 text-center">
        <p className="font-ritual-cjk text-lg tracking-[0.22em] text-[var(--gold)] sm:text-xl">
          你的卦，会因时因事而变
        </p>
        <p className="mt-1 text-[9px] tracking-[0.2em] text-muted-foreground">
          念动之时、处境之变，皆入卦中
        </p>
      </div>

      <div className="relative mt-1.5 flex shrink-0 items-center justify-between gap-2 rounded-md border border-[var(--gold)]/25 bg-secondary/35 px-3 py-2">
        <p className="font-serif-cjk text-xs text-foreground">真有这么准？</p>
        <DivineEntryLink
          search={{ skipEntry: true }}
          onClick={() => {
            unlockRitualAudio();
            playRitualSound("ui-select");
          }}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--gold)]/40 bg-[var(--bagua-active-bg)] px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-[var(--gold)] transition hover:border-[var(--gold)] hover:gap-1"
        >
          问一次便知
          <ArrowRight size={11} aria-hidden />
        </DivineEntryLink>
      </div>
    </div>
  );
}
