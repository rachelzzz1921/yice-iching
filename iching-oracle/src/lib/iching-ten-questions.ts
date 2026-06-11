import { formatFourMethodsForTenQuestions } from "@/lib/cast-method-guide";

export type TenQuestionTheme = "culture" | "method" | "trust" | "service";

export type TenQuestion = {
  id: string;
  num: string;
  theme: TenQuestionTheme;
  question: string;
  /** 一句话点睛 */
  tagline: string;
  answer: string;
  /** 文中金句，展开后高亮展示 */
  quote: string;
};

/** 十问序号：标准汉字，配合衬线体展示 */
export const QUESTION_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

export const TEN_QUESTIONS_TOTAL = 10;

export function questionNumeralByIndex(index: number): string {
  return QUESTION_NUMERALS[index] ?? `${index + 1}`;
}

export const THEME_LABELS: Record<TenQuestionTheme, { label: string; desc: string }> = {
  culture: { label: "文化根基", desc: "为何千年不绝" },
  method: { label: "起卦之道", desc: "为何用易经" },
  trust: { label: "准确与信任", desc: "为何值得信赖" },
  service: { label: "易测初心", desc: "为何做此服务" },
};

export const ICHING_TEN_QUESTIONS: TenQuestion[] = [
  {
    id: "civilization",
    num: "一",
    theme: "culture",
    question: "为什么中华文明能够源远流长？",
    tagline: "传统文化，是不可替代的精神根基",
    answer:
      "文明不绝，因有可传承的精神结构：易经教人借象明势、辅助抉择；儒家凝聚认同、规范秩序；兼收并蓄、化为己用。三者合力，使这个民族在万变中仍有根。",
    quote: "以象观势，以教化人，以包容成其大。",
  },
  {
    id: "iching-role",
    num: "二",
    theme: "culture",
    question: "易经在中国传统文化中扮演什么角色？",
    tagline: "不是算命书，而是观天察地的智慧总纲",
    answer:
      "《易经》以阴阳八卦、六十四卦描述变化之道，教人知进退、识时机。它是一面镜子：照局势，不代你签字；历代遇大事者借它观象，百姓亦从中取义安身。",
    quote: "观象不观命，察势不察鬼神。",
  },
  {
    id: "why-cast",
    num: "三",
    theme: "method",
    question: "为什么要用易经起卦？",
    tagline: "问清一事，才能把纷乱的心收回来",
    answer: [
      "岔路口最难的是心绪纷乱。起卦用千年仪轨把心念收成「清晰一问」：先静心，再观象。六爻既成，本卦变卦同现，处境与走向结构化呈现。",
      "易测四式，仪轨不同、照镜同一：",
      formatFourMethodsForTenQuestions(),
      "没有「更灵」的方式，只有更合你当下心境的一种。",
    ].join("\n"),
    quote: "先问一事，再起卦观象。",
  },
  {
    id: "not-superstition",
    num: "四",
    theme: "method",
    question: "易经起卦是迷信吗？和算命有何不同？",
    tagline: "起卦要清醒，算命要答案",
    answer:
      "迷信是无理由盲信，把结果当天命。起卦是借象明理：先问清，再以卦照局，帮你看清已知与未察——卦不替你做决定。算命求定数，起卦求明势；问在于诚，观在于悟，行在于人。",
    quote: "卦象是镜，照当下之势，非未来定数。",
  },
  {
    id: "accuracy",
    num: "五",
    theme: "trust",
    question: "为什么说易经起卦能够做到准确？",
    tagline: "准确来自经典的概括力与问事的专心",
    answer:
      "六十四卦是古人对世事万变的高度提炼，三千年传续即是验证。另一方面，起卦时的专心会把模糊焦虑化成清晰一问——问题越准，象意越切。故非预言未来，而是照见当下；当下清了，方向自明。",
    quote: "卦不答定数，而照当下之势。",
  },
  {
    id: "ancient-tradition",
    num: "六",
    theme: "trust",
    question: "越古老、越传统，是否越准确？",
    tagline: "经得住岁月，才配称准",
    answer:
      "经典流传三千年，本身即经无数检验。四式起卦各有古法概率与仪轨，少后人添枝加叶——非盲目崇古，而是时间筛出的可靠。铜钱重经典普及，蓍草重大衍正统，梅花重时空合参，直书重结构复盘；择式不如择心，心专则象明。",
    quote: "三千年传续不绝，本身便是最长的验证。",
  },
  {
    id: "help",
    num: "七",
    theme: "trust",
    question: "易经起卦能为人们提供什么帮助和指引？",
    tagline: "从迷茫中梳理思路，让决策有迹可循",
    answer:
      "厘清你在哪、阻滞何在、何时宜进何时宜守，并收束到可执行的一步。不是替你逃避选择，而是把「不知道怎么办」变成「看清了再决定」。",
    quote: "不是替你选，而是帮你看清再选。",
  },
  {
    id: "founder-intent",
    num: "八",
    theme: "service",
    question: "易测创立者的初衷是什么？",
    tagline: "帮助更多人从迷茫中走出来",
    answer:
      "太多人在岔路口辗转难眠——不缺选项，缺一面照见局势的镜子。易测把起卦智慧以现代、庄重的方式带给需要它的人：诚心问事，静观其象，再做清醒决策。",
    quote: "让三千年的智慧，用在今晚这一个抉择上。",
  },
  {
    id: "decision",
    num: "九",
    theme: "service",
    question: "如何从迷茫中做出更正确的决策？",
    tagline: "问清 · 观象 · 笃行",
    answer:
      "问清：把模糊焦虑化成一事一问。观象：按事择式——日常用铜钱，大事用蓍草，急问用梅花，复盘用直书；默念所问，成卦观象。笃行：读解读、可追问、可存档。问清而后观象，观象而后笃行。",
    quote: "清晰一问 → 笃定前行。",
  },
  {
    id: "motto",
    num: "十",
    theme: "service",
    question: "「易测，让天下没有难做的决策」是什么意思？",
    tagline: "不是不必思考，而是再难也有方向",
    answer:
      "不是「万事不用想」，而是诚心问一事、静观其象，再难的抉择也能找到方向。你问，卦象应；你观，心渐明；你行，步更稳。",
    quote: "易测，让天下没有难做的决策。",
  },
];
