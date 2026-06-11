import { ArrowRight, Coins, Flower2, Keyboard, Sprout, type LucideIcon } from "lucide-react";
import { DivineEntryLink } from "@/components/home/DivineEntryLink";
import { PaperDecor } from "@/components/home/PaperDecor";
import { CAST_METHOD_META, type CastMethod } from "@/components/RitualEffects";
import { playMethodIntro, unlockRitualAudio } from "@/lib/ritual-sounds";

type MethodId = "coin" | "yarrow" | "meihua" | "direct";

type MethodCard = {
  id: MethodId;
  label: string;
  desc: string;
  intro: string;
  tag: string;
  icon: LucideIcon;
};

const METHODS: MethodCard[] = [
  {
    id: "coin",
    label: "铜钱摇卦",
    desc: "三枚铜钱，六掷成卦",
    intro: "最经典的入门方式。心诚则灵，掷六次而成六爻，变爻自然呈现。",
    tag: "入门首选",
    icon: Coins,
  },
  {
    id: "yarrow",
    label: "蓍草数",
    desc: "古法大衍，仪式郑重",
    intro: "大衍之数，概率正统。步骤虽繁，宜重大事项郑重问卜。",
    tag: "正统",
    icon: Sprout,
  },
  {
    id: "meihua",
    label: "梅花易数",
    desc: "心念一动，三数成卦",
    intro: "取时间或心中三数即可成卦。快捷轻便，适合当下即有决断之需。",
    tag: "快捷",
    icon: Flower2,
  },
  {
    id: "direct",
    label: "直接输入",
    desc: "已知六爻，直接落墨",
    intro: "若已通晓卦象或他处成卦，可直接录入六爻，即刻进入解读。",
    tag: "进阶",
    icon: Keyboard,
  },
];

function MethodTile({ m }: { m: MethodCard }) {
  const Icon = m.icon;
  const meta = CAST_METHOD_META[m.id];

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/90 p-3 shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] transition-[border-color,background-color,box-shadow] duration-300 has-[.method-cta:hover]:border-[var(--gold)]/45 has-[.method-cta:hover]:bg-[var(--bagua-active-bg)] has-[.method-cta:hover]:shadow-[0_4px_16px_-6px_color-mix(in_oklab,var(--gold)_28%,transparent)] sm:p-3.5">
      <span aria-hidden className="pointer-events-none absolute -right-1 -bottom-1 font-ritual-cjk text-4xl leading-none text-[var(--gold)]/10">
        {meta.seal}
      </span>
      <span className="absolute right-2.5 top-2.5 z-[1] rounded-sm border border-[var(--gold)]/25 bg-card/90 px-1.5 py-0.5 text-[9px] tracking-wider text-[var(--gold)]">
        {m.tag}
      </span>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground sm:h-10 sm:w-10">
        <Icon size={18} className="sm:h-5 sm:w-5" />
      </div>

      <div className="mt-2.5 flex min-h-0 flex-1 flex-col pr-6 sm:mt-3">
        <h3 className="font-serif-cjk text-[13px] font-medium leading-snug text-foreground sm:text-sm">{m.label}</h3>
        <p className="mt-0.5 text-[10px] text-[var(--gold)]/90 sm:text-[11px]">{meta.epithet} · {meta.mantra}</p>
        <p className="mt-1 line-clamp-2 flex-1 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          {m.intro}
        </p>
      </div>

      <DivineEntryLink
        search={{ method: m.id, skipEntry: true }}
        onClick={() => {
          unlockRitualAudio();
          playMethodIntro(m.id as CastMethod);
        }}
        className="method-cta group mt-2 inline-flex shrink-0 items-center gap-0.5 border-t border-border/50 pt-2 text-[10px] text-muted-foreground transition-colors hover:text-[var(--gold)]"
      >
        选此方式起卦
        <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
      </DivineEntryLink>
    </div>
  );
}

export function HomeMethodCards() {
  return (
    <div className="home-page-body relative flex min-h-min flex-col home-page-pad">
      <PaperDecor variant="quiet" />
      <div className="relative shrink-0 text-center">
        <p className="section-label">Casting Methods</p>
        <h2 className="mt-0.5 font-serif-cjk text-base font-medium sm:text-lg">四式起卦，各得其妙</h2>
        <p className="mx-auto mt-1 max-w-xs text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          问清所问之后，选一种与当下心境相合的方式，默念所问而观象
        </p>
      </div>

      <div className="relative home-method-grid mt-3 sm:mt-4">
        {METHODS.map((m) => (
          <MethodTile key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}
