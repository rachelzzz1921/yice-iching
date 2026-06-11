import type { CastMethod } from "@/components/RitualEffects";

/** 起卦方式注解 · 起卦页与十问共用 */
export type CastMethodGuide = {
  id: CastMethod;
  label: string;
  /** 特色优点（一两句） */
  strength: string;
  /** 一两句说明：为何是「起卦」而非「算命」 */
  whyNotFortune: string;
  /** 仪式与象意 */
  ritualNote: string;
  /** 适合何时选用 */
  whenToUse: string;
};

export const CAST_METHOD_GUIDES: Record<CastMethod, CastMethodGuide> = {
  coin: {
    id: "coin",
    label: "铜钱摇卦",
    strength:
      "最经典、最易上手：三钱六掷，仪轨简明，概率与古法一致，仪式感足而不拖沓，日常问事首选。",
    whyNotFortune:
      "三钱六掷，概率与古法一致——随机落点只为成象，不是替你「抽命运签」。你默念所问，卦象映照的是当下局势，不是鬼神给出的固定答案。",
    ritualNote:
      "天三地六，最贴近民间流传的摇卦仪轨。正背成数，六爻自下而上渐显，本卦与动爻一并呈现。",
    whenToUse: "日常问事、希望仪式感与经典仪轨兼得时，首选此法。",
  },
  yarrow: {
    id: "yarrow",
    label: "蓍草大衍",
    strength:
      "最正统、最郑重：大衍概率完整保留，数变之间逼你把问题想透，适合大事与久决之事。",
    whyNotFortune:
      "大衍之数五十，其用四十有九——古法概率最重「变」与「守」的平衡。蓍草起卦慢而郑重，逼你在数变之间把问题想透，而非求一个爽快结论。",
    ritualNote:
      "分二、挂一、揲四、归奇，一爻需经多轮数变。仪式越长，心念越专，象意越不易被杂念冲淡。",
    whenToUse: "大事、长久不决之事，或你愿意用更郑重的方式与卦象对话时。",
  },
  meihua: {
    id: "meihua",
    label: "梅花易数",
    strength:
      "最快捷、最灵动：三数成卦，可取时辰或心念之数，体用互参，随时随地快问快观。",
    whyNotFortune:
      "数由心起，卦由数成——梅花重「当下心念与时空」的合参，不是查表断吉凶。三个数字是你与所问之间的契约，卦象是结构的展开，不是预言脚本。",
    ritualNote:
      "下卦、上卦、动爻可由数字、时辰或随机一念推出，体用互参，宜快问快观。",
    whenToUse: "心念已集中、问题清晰，想快速成卦观象时；或用手机随时问一事。",
  },
  direct: {
    id: "direct",
    label: "直书六爻",
    strength:
      "最灵活、可复盘：跳过随机，直接录入六爻，便于对照卦书、沿用他处成卦或研习结构。",
    whyNotFortune:
      "此法跳过随机，直接录入六爻——适用于你已用别的方式成卦，或研习卦象结构。易测仍按卦辞与动爻解读，不把你的输入当作「天命认证」。",
    ritualNote:
      "自上而下录阴阳与动变，适合复盘、教学或沿用他处成卦结果。",
    whenToUse: "已有卦象、重放问事，或研习者对照卦书时使用。",
  },
};

export const ICHING_VS_FORTUNE_TELLING = {
  title: "易经起卦，为何不是算命？",
  summary:
    "算命多求「定数」——好不好、成不成、何时应验，仿佛答案在卦外等你领取。易经起卦求的是「明势」——先问清一事，再以象照局，看清处境、阻力与可执行的一步。",
  points: [
    "问在于人：同一卦象，问法不同，照见的角度不同；起卦前先静心明所问，比催促「准不准」更重要。",
    "象在于势：卦辞爻辞是三千年的结构语言，描述的是局势如何变、人该如何应，而非替你按下命运按钮。",
    "行在于己：解读收束到断语与行动锚点——卦不代你签字，只帮你看清再选。",
    "法在于传：铜钱、蓍草、梅花、直书，各有仪轨与概率，都是成象的手段，不是通灵仪式。",
  ],
  quote: "算命要答案，起卦要清醒——清醒了，答案往往自己浮现。",
};

const CAST_METHOD_ORDER: CastMethod[] = ["coin", "yarrow", "meihua", "direct"];

/** 十问等场景用的四式浓缩说明 */
export function formatFourMethodsForTenQuestions(): string {
  return CAST_METHOD_ORDER.map((id) => {
    const g = CAST_METHOD_GUIDES[id];
    return `· ${g.label}：${g.strength}`;
  }).join("\n");
}
