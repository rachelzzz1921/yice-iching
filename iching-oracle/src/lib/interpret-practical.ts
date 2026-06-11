/**
 * 贴合现实处境的解读补充（各维度多段分析）
 */

import type { CategoryId } from "@/lib/iching";
import { getTransition } from "@/lib/bianguaTransitions";
import { formatStrategyBlock } from "@/lib/hexagram-strategy";
import { getEssence, getSignal } from "@/lib/hexagramEssence";
import { paragraphsToLines, type InterpretLine } from "@/lib/interpret-format";
import { getYaociByName, type GuaciEntry } from "@/lib/guaci";
import { getTimingHint, getYaoWeight } from "@/lib/yaoWeights";

type PracticalInput = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
  changingLine: number;
};

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

export type PracticalCtx = {
  gua: GuaciEntry;
  bian: GuaciEntry | null;
  yaoci: ReturnType<typeof getYaociByName>;
  input: PracticalInput;
};

export type QuestionProfile = {
  careerQuit: boolean;
  careerStartup: boolean;
  careerCoop: boolean;
  careerPromo: boolean;
  careerProject: boolean;
  relInterest: boolean;
  relFuture: boolean;
  relConfess: boolean;
  relReunite: boolean;
  relMarriage: boolean;
  famConflict: boolean;
  famSettle: boolean;
  famHouse: boolean;
  famParentChild: boolean;
  famOverall: boolean;
  fateStayGo: boolean;
  fateOffer: boolean;
  fateInvest: boolean;
  fateBuy: boolean;
  healthStatus: boolean;
  healthSurgery: boolean;
  healthAnxiety: boolean;
  healthChronic: boolean;
};

export function detectQuestionProfile(input: PracticalInput): QuestionProfile {
  const q = input.question;
  return {
    careerQuit: /辞|离职|跳槽|换工作|该不该留/.test(q),
    careerStartup: /创业|开店|起步/.test(q),
    careerCoop: /合作|合伙|可信/.test(q),
    careerPromo: /升职|晋升|提拔/.test(q),
    careerProject: /项目|推进|继续/.test(q),
    relInterest: /有意|喜欢我|心思/.test(q),
    relFuture: /未来|还有没有/.test(q),
    relConfess: /表白|主动/.test(q),
    relReunite: /复合|回头/.test(q),
    relMarriage: /婚姻|结婚|合适/.test(q),
    famConflict: /矛盾|紧张|冲突|不和|何时能缓/.test(q),
    famSettle: /扎根|定居|这个城市|移居|换城/.test(q),
    famHouse: /家宅|房子|新房|适不适合我们|搬家/.test(q),
    famParentChild: /亲子|孩子|父母|青春期/.test(q),
    famOverall: /家庭运势|整体运势|家里事情/.test(q),
    fateStayGo: /去还是留|留还是/.test(q),
    fateOffer: /offer|二选一|两个选择|怎么选/.test(q),
    fateInvest: /投资|理财|入股/.test(q),
    fateBuy: /买还是|入手|买车/.test(q),
    healthStatus: /身体状态|近况|整体/.test(q),
    healthSurgery: /手术|开刀/.test(q),
    healthAnxiety: /焦虑|失眠|紧张|何时好转/.test(q),
    healthChronic: /慢性|长期|调养/.test(q),
  };
}

function lineLabel(n: number): string {
  return n >= 1 && n <= 6 ? `第${YAO_POS[n - 1]}爻` : "动爻";
}

function yaoNatureFromYaoci(yaoci: PracticalCtx["yaoci"]): 0 | 1 | null {
  if (!yaoci) return null;
  if (/九/.test(yaoci.position)) return 1;
  if (/六/.test(yaoci.position)) return 0;
  return null;
}

type CorpusSlice = {
  guaSignal: string | null;
  bianSignal: string | null;
  essence: string | null;
  yaoWeight: ReturnType<typeof getYaoWeight> | null;
  transitionSignal: string | null;
  timing: string | null;
};

function readCorpus(ctx: PracticalCtx): CorpusSlice {
  const { gua, bian, yaoci, input } = ctx;
  const category = input.category;
  const nature = yaoNatureFromYaoci(yaoci);
  const yaoWeight =
    input.changingLine >= 1 && input.changingLine <= 6 && nature !== null
      ? getYaoWeight(input.changingLine, nature, category)
      : null;
  const transition = bian ? getTransition(gua.id, bian.id, category) : null;

  return {
    guaSignal: getSignal(gua.id, category),
    bianSignal: bian ? getSignal(bian.id, category) : null,
    essence: getEssence(gua.id)?.essence ?? null,
    yaoWeight,
    transitionSignal: transition?.categorySignal ?? null,
    timing: yaoWeight ? getTimingHint(input.changingLine, yaoWeight.weight.final) : null,
  };
}

function yaoInsight(ctx: PracticalCtx): string {
  const { yaoci, input } = ctx;
  if (!yaoci) return "静卦：大势相对稳定，接下来 4–6 周的变化主要取决于你怎么选，而不是外力突然翻盘。";
  const line = yaoci.text.replace(/[。；]$/, "");
  const templates = [
    `关键在${lineLabel(input.changingLine)}：「${line}」。先把这一层理顺，再谈去留或加码。`,
    `${lineLabel(input.changingLine)}在提醒你：「${line}」。这是眼下最该正面处理的一环。`,
  ];
  return templates[(input.changingLine + input.benName.length) % templates.length]!;
}

function bianInsight(ctx: PracticalCtx): string {
  const { bian, input } = ctx;
  if (!bian) return "";
  const bianYao = input.changingLine ? getYaociByName(bian.name, input.changingLine) : null;
  const seed = bian.id * 7 + input.changingLine;
  if (bianYao) {
    const line = bianYao.text.replace(/[。；]$/, "");
    const variants = [
      `惯性延续会滑向${bian.name}卦：「${line}」。你若主动调整策略，结局仍可改写。`,
      `按现状走下去，${bian.name}卦同位爻「${line}」会越来越明显；现在改节奏还来得及。`,
      `变卦${bian.name}同位示警：「${line}」。宜在 6 周内做一次可验证的小调整，别等局面固化。`,
    ];
    return variants[seed % variants.length]!;
  }
  const guaLine = bian.guaci.replace(/[。；]$/, "");
  const variants = [
    `变卦${bian.name}（${guaLine}）是收束方向：未来 6–8 周你怎么做，比卦象本身更决定结局。`,
    `结局倾向${bian.name}卦之气，但尚未定局——用一项可量化的小目标在一个月内验证方向。`,
  ];
  return variants[seed % variants.length]!;
}

function practicalParagraphs(ctx: PracticalCtx, dimIndex: number): string[] {
  const { input } = ctx;
  const p = detectQuestionProfile(input);
  const builders: Record<CategoryId, ((c: PracticalCtx, profile: QuestionProfile) => string[])[]> = {
    career: [careerTiming, careerObstacle, careerAdvice, careerOutcome],
    relationship: [relField, relMind, relBarrier, relOutcome],
    family: [famPattern, famMindset, famConflictDim, famAction],
    fate: [decPros, decVars, decRisk, decTendency],
    health: [healthFive, healthCare, healthWatch, healthPhase],
  };
  const fn = builders[input.category][dimIndex];
  return fn ? fn(ctx, p).filter(Boolean) : [fallbackDim(ctx, dimIndex)];
}

/** 按类别 × 维度序号（0–3）生成多段现实分析 */
export function buildPracticalDimension(ctx: PracticalCtx, dimIndex: number): string {
  return practicalParagraphs(ctx, dimIndex).join("\n\n");
}

/** 结构化维度正文，供结果页直接渲染 */
export function buildPracticalDimensionLines(ctx: PracticalCtx, dimIndex: number): InterpretLine[] {
  return paragraphsToLines(practicalParagraphs(ctx, dimIndex));
}

function fallbackDim(ctx: PracticalCtx, i: number): string {
  return `结合${ctx.gua.name}卦象，第 ${i + 1} 层信息宜你对照近期一两件具体事例验证，忌空泛对号入座。`;
}

function careerTiming(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const { gua, bian, input } = ctx;
  const out = [
    yaoInsight(ctx),
    `时机判断：${gua.name}卦下，不必追求「一次选对」，更要避免「在信息不全时做不可逆动作」。`,
  ];
  if (p.careerQuit) {
    out.push(
      "就离职而言，现实里真正卡人的往往是四件事：有没有下家或现金流缓冲、当前岗位还能不能换来可写进简历的成果、团队关系是否已到不可修复、你自己是「想逃」还是「想升级」。",
      "建议窗口：先给自己 6 周观察期——第 1–2 周补信息（行情、内推、存款），第 3–4 周做 1 次关键对话（上级或 HR），第 5–6 周再定是否提离职。冲动辞职多出现在第 0 周，卦象不赞同期。",
    );
  } else if (p.careerStartup) {
    out.push(
      "创业时机要看「需求是否被验证」而非「热情是否足够」。若目前只有想法、没有付费用户或复购，卦意偏向再打磨 MVP。",
      "可执行节点：三个月内做出最小闭环（获客—交付—回款），有一项为正再谈全职 All in。",
    );
  } else if (p.careerPromo) {
    out.push(
      "升职窗口往往在上级「能解释你为何升」之前——先对齐评价标准、要一次书面或邮件确认的期待，比私下焦虑有效。",
      "若本季无名额，问清「下一窗口需要什么成果」，把等待变成可交付项目。",
    );
  } else {
    out.push(
      "近期宜做「可验证的小步」：一项能在一两个月内看见数据的任务，用它代替空泛的纠结。",
    );
    if (!bian) out.push("无变卦则以稳为主，别在情绪高点做结构性决定。");
  }
  if (gua.name === "蒙" && p.careerQuit) {
    out.push("蒙卦特别提醒：不是不能走，而是「还没把局面看清就走」容易从一个坑跳进另一个坑。");
  }
  return out;
}

function careerObstacle(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const { gua, input } = ctx;
  const out = [
    `隐患与阻力：${gua.name}卦所示阻力，常落在三类——资源不配（人/钱/时间）、权责不清、情绪内耗。你对照一下哪一类占比最高。`,
    "人际上：有人拖进度、有人抢功、有人只施压不给资源，对应策略不同，忌混为一谈。",
  ];
  if (p.careerQuit) {
    out.push(
      "离职场景里最大隐性成本是「职业叙事断裂」：下家会问为何离开、你能否自洽。若现在走，理由要能站得住（成长天花板、业务收缩、健康等），而非单纯吐槽。",
      "经济阻力：房贷、家庭支出、试用期空窗——任一项吃紧，都应把「现金流月数」写在纸面上再决定。",
    );
  } else if (p.careerCoop) {
    out.push(
      "合作阻力常在条款：分成、退出机制、知识产权、决策权。卦象示警时，宜慢签、宜律师或过懂行的朋友过目。",
    );
  } else if (p.careerProject) {
    out.push(
      "项目阻力可能是目标本身已失真——继续推进只是在沉没成本里加码。列出「再投 3 个月的最坏结果」再决定砍还是保。",
    );
  }
  if (ctx.yaoci?.xiang) {
    out.push(`动爻象意：${ctx.yaoci.xiang.replace(/[。；]$/, "")}——这往往指向你个人习惯或态度上的卡点。`);
  }
  return out;
}

function careerAdvice(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "具体建议（可照做）：",
    "① 写下你此刻最真实的三个顾虑，按「能解决 / 只能接受」分类；",
    "② 找一位信得过的局外人聊 30 分钟，只问「若你是我，会怎么做」；",
    "③ 设一个「不决策日」：连续 7 天不做不可逆动作，只收集信息。",
  ];
  if (p.careerQuit) {
    out.push(
      "④ 更新简历与作品，先投 3–5 个试探性面试，用市场反馈校正自我认知；",
      "⑤ 若留下：谈一次明确边界（工时、分工、晋升路径）；若离开：先拿书面 offer 再提辞。",
      "忌：情绪性裸辞、公开抱怨、未交接就消失——这些会在小圈子里跟很久。",
    );
  } else if (p.careerStartup) {
    out.push("④ 本周只验证一个假设（谁付钱、为什么付）；⑤ 控制投入上限，设止损线。");
  } else if (p.careerPromo) {
    out.push("④ 用数据对齐贡献（营收、效率、带人）；⑤ 主动要反馈，不要等年终惊喜。");
  } else {
    out.push("④ 每周留 2 小时复盘：本周唯一有效进展是什么；⑤ 把大目标拆成下周可完成的一件小事。");
  }
  out.push(...formatStrategyBlock(ctx.gua.name, "career"));
  return out;
}

function careerOutcome(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const { gua, bian } = ctx;
  const tone = bian?.name === "涣" ? "中短期有松动、重组之象，结局未必更差，但会经历一段「散而后聚」的空白。" : "大势仍在量变积累，爆发点未到。";
  const out = [
    `结果走向：${tone}`,
    `本卦${gua.name} + ${bian ? `变${bian.name}` : "无变"}的组合，更像过程管理题，而非一夜翻盘。`,
  ];
  if (p.careerQuit) {
    out.push(
      "三个月内较可能的路径：① 先稳住现金流与口碑，再动；② 若动，换槽后 1–2 个季度仍有磨合期，勿用第一周好坏论成败；",
      "你真正要的是「更合适的生长土壤」，卦支持慢慢换，不支持赌气跳。",
    );
  } else {
    out.push("把「好坏」改成「是否更接近我想要的生活结构」——到年底回看，比今天纠结更有用。");
  }
  if (ctx.bian) out.push(bianInsight(ctx));
  if (ctx.bian) out.push(...formatStrategyBlock(ctx.bian.name, "career"));
  return out;
}

function relField(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  return [
    yaoInsight(ctx),
    `缘分磁场：${ctx.gua.name}卦下，吸引力往往已在，只是表达方式、节奏或信任尚未对齐。`,
    "别用社交媒体热度、回复快慢单独判生死；看对方是否愿意为你付出稀缺资源（时间、公开身份、未来计划）。",
  ];
}

function relMind(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "对方心意：猜心最耗人。比猜更有效的，是一次低压力、可退场的确认——例如约见、直接问边界、看是否愿意把你写进日常安排。",
  ];
  if (p.relInterest) {
    out.push(
      "「有没有意」：观察三次——主动找你聊深度话题吗？你遇到困难他/她是回避还是站位？对未来有没有具体承诺（不仅是甜言蜜语）。",
      "若三次里只有一次为正，宜降期待、升观察，不宜立刻表白加压。",
    );
  } else if (p.relConfess) {
    out.push("表白宜在「氛围已暖但未说破」时进行；若已冷很久，先复温再谈名分。");
  } else if (p.relReunite) {
    out.push("复合要问：分手原因是否仍存在？双方是否都愿意改同一处？否则是 nostalgia 不是 renewal。");
  }
  return out;
}

function relBarrier(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "关系障碍：常见是节奏不一、价值期待错位、或一方在逃避深度承诺。",
    "你可以自问：我在这段关系里，是更怕失去对方，还是更怕失去自我？答案不同，策略不同。",
  ];
  if (p.relMarriage) {
    out.push(
      "婚姻合适与否，看日常生活兼容性（金钱观、家庭边界、冲突修复方式）大于看热恋峰值。",
      "宜共同参与一件稍大的事（旅行筹备、见家长、财务规划）试炼，再定终身。",
    );
  }
  return out;
}

function relOutcome(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  return [
    "发展走向：顺缘推进，忌逼签、忌连环试探。给关系 4–8 周观察窗，记录「舒服」与「别扭」各几件事。",
    "若别扭持续增多，宜坦诚谈一次；若舒服占多数，可小步加深投入。",
    ctx.bian ? `变${ctx.bian.name}示关系会进入新阶段，但新阶段需要双方一起定义规则。` : "无变则宜守中，勿用极端手段测试对方。",
    ctx.bian ? bianInsight(ctx) : "",
  ].filter(Boolean);
}

function famPattern(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const c = readCorpus(ctx);
  const out = [yaoInsight(ctx)];

  if (c.guaSignal) {
    out.push(`现状格局：${c.guaSignal}`);
  } else {
    out.push(
      `现状格局：${ctx.gua.name}卦下，家里宜先辨是外压传导，还是内部裂缝在扩大。`,
    );
  }

  if (c.yaoWeight) {
    out.push(`${lineLabel(ctx.input.changingLine)}落在${c.yaoWeight.positionName}：${c.yaoWeight.signal}`);
  }

  if (c.transitionSignal) {
    out.push(`变卦信号：${c.transitionSignal}`);
  }

  if (p.famConflict) {
    out.push("矛盾很多时，先看清谁主导了紧张气氛，再留意有没有沉默的人在两边都不站。");
  } else if (p.famHouse) {
    out.push("问家宅时，宅象与成员磁场是否相合，比单看价格或地段更先。");
  } else if (p.famOverall) {
    out.push("整体运势看聚散与稳动：平和不等于可躺平，动荡也不等于内裂。");
  }
  return out;
}

function famMindset(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const c = readCorpus(ctx);
  const out: string[] = [];

  if (c.yaoWeight) {
    out.push(`各方心态：${c.yaoWeight.verdict}。${c.yaoWeight.signal}`);
  } else {
    out.push("各方心态：主事者、沉默者、或感觉没被听见的那一方，往往各自藏着不同的顾虑。");
  }

  if (p.famParentChild) {
    out.push("亲子场景里，双方常都在等对方先软化，却都没意识到自己在等。");
  } else if (p.famSettle) {
    out.push("扎根决策里，伴侣或父母「没完全松口」往往不是反对，而是还没有安全感。");
  } else if (p.famConflict) {
    out.push("表面在争的事，底下常是「谁说了算」或「谁更委屈」还没被听见。");
  }

  if (ctx.yaoci) {
    out.push(`「${ctx.yaoci.text.replace(/[。；]$/, "")}」——看谁的态度先变，局面就会跟着动。`);
  }
  return out;
}

function famConflictDim(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const c = readCorpus(ctx);
  const out: string[] = [];

  if (c.essence && c.yaoWeight) {
    out.push(
      `核心矛盾：${ctx.gua.name}卦底色是「${c.essence}」，而${c.yaoWeight.positionName}又示警——要在整体方向与眼前风险之间找平衡。`,
    );
  } else if (c.guaSignal) {
    out.push(`核心矛盾：${c.guaSignal}`);
  } else {
    out.push("核心矛盾：先分清是沟通、利益还是相处节奏错位，再对准最大阻力下手。");
  }

  if (p.famConflict) {
    out.push("家庭矛盾常不是事本身，而是「谁说了算」还没解决；先松一格，话才有地方落。");
  } else if (p.famSettle) {
    out.push("最大阻力往往是「这里真的适合我们吗」这个没说出口的疑问，而不是数字本身。");
  } else if (p.famParentChild) {
    out.push("亲子问题多半是沟通频道错位，不是感情出了问题；强行说教会加深隔阂。");
  }

  const window = c.timing ?? "6-8周";
  const windowPhrase = /不宜|再等|待时机/.test(window)
    ? `在${window}之前，留意外部信号`
    : `未来${window}内`;
  out.push(
    `${windowPhrase}——若出现气氛缓和、有人主动开口、或搁置的事有了可谈余地，说明局势在松动。`,
  );
  return out;
}

function famAction(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const c = readCorpus(ctx);
  const window = c.timing ?? "6-8周";
  const out: string[] = [];

  if (c.yaoWeight) {
    const actWindow = /不宜|再等|待时机/.test(window)
      ? `在${window}之前`
      : `优先在${window}内`;
    out.push(`建议行动：${c.yaoWeight.verdict}。${actWindow}完成一件可验证的小步。`);
  } else {
    out.push(`建议行动：未来${window}内做一件家里人都感受得到的小步，并明确一件暂时不要做的事。`);
  }

  if (p.famConflict) {
    out.push("本周可找沉默的人单独谈一次，只问感受；忌在饭桌上当众摊牌。");
  } else if (p.famSettle) {
    out.push("本周可开一次家庭会把顾虑摆出来；忌因「再等等可能更好」错过窗口。");
  } else if (p.famParentChild) {
    out.push("本周可停止说教，做一件孩子喜欢的事陪他/她；忌这段时间叠新规定。");
  } else if (p.famHouse) {
    out.push("本周可再去实地感受采光与气流；忌在各方未齐时强行定搬家日。");
  } else if (c.guaSignal?.includes("靠近") || c.guaSignal?.includes("主动")) {
    out.push("本周可对需要被靠近的家人主动迈一步；忌把亲近当成理所当然、长期沉默。");
  } else {
    out.push("本周可安排一次全家一起做的事；忌把稳定当成不必再经营。");
  }
  return out;
}

function decPros(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [yaoInsight(ctx), "选项利弊：把每个选项写成「得到什么 / 失去什么 / 能否撤回」三列，空泛的「好/不好」会骗人。"];
  if (p.fateOffer) {
    out.push(
      "两个选择：除表面标签外，比长期方向、隐性成本与可撤回性。短期诱惑，长期可能不如稳健选项。",
    );
  } else if (p.famSettle) {
    out.push(
      "扎根：列清户口、社保、子女教育、父母赡养、社交重建成本；第一年往往是「花钱换可能性」，要有心理与现金准备。",
    );
  } else if (p.fateInvest) {
    out.push("投资：只用闲钱；问清流动性、最大回撤、你是否睡得着觉。");
  } else if (p.fateBuy) {
    out.push("买还是等：区分「需要」与「想要」；若是需要，看交付与保修；若是想要，设三个月冷静期。");
  }
  return out;
}

function decVars(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  return [
    "核心变量：往往不在选项标签，而在你的底线——最坏情况下你还能不能承受？",
    "找三个你信得过且风格不同的人各给一句意见，若三人方向一致，可信度上升。",
    ctx.yaoci ? `动爻提示：${ctx.yaoci.text.replace(/[。；]$/, "")}——把它翻译成「我现在缺什么能力/信息」。` : "",
  ].filter(Boolean);
}

function decRisk(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "风险提示：不可逆动作（大额签约、辞职、离婚、加杠杆）宜在情绪平稳的早晨决定，不在深夜。",
    "留一条退路：存款月数、回退方案、可道歉的台阶——有退路，决策质量会高很多。",
  ];
  if (p.fateStayGo) out.push("去留之问：若留下，最坏能否再忍一年？若离开，最坏能否生存半年？两问取答。");
  if (ctx.gua.name === "蒙" || ctx.bian?.name === "涣") {
    out.push(
      "本卦蒙、变涣常见于「看不清又想动」：先补信息再动，比凭情绪动更合卦意。",
    );
  }
  return out;
}

function decTendency(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  const lean = ctx.bian
    ? `倾向向${ctx.bian.name}卦演化，宜选「4–6 周内能验证」的那条路。`
    : `以${ctx.gua.name}卦为主势，宜先小步试跑再放大。`;
  return [
    `卦象倾向：${lean}`,
    `就你所问，我的判断是：别等满分时机，选最坏情况仍承受得起、且最接近你三年目标的那一项。`,
    ...formatStrategyBlock(ctx.gua.name, "fate"),
    ctx.bian ? bianInsight(ctx) : "",
  ].filter(Boolean);
}

function healthFive(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  return [
    yaoInsight(ctx),
    "身心对应：睡眠、消化、情绪、肌肉紧张往往联动。先找一项最影响生活的症状，集中改善它。",
    "卦象辅理：可作作息与心态的提醒，不能替代检查与医嘱。",
  ];
}

function healthCare(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "调养方向：规律作息优先于猛补；少熬夜、少酒精、少空腹咖啡，比买补品见效快。",
    "运动从「能每天坚持的 15 分钟」开始，别一上来就高强度导致放弃。",
  ];
  if (p.healthAnxiety) {
    out.push(
      "焦虑：每天固定 10 分钟散步 + 睡前断屏；若持续影响工作睡眠超过两周，宜寻求专业帮助，不必硬扛。",
    );
  }
  if (p.healthChronic) {
    out.push("慢病：遵医嘱复查，记录指标曲线，三个月一看趋势而非单日波动。");
  }
  return out;
}

function healthWatch(ctx: PracticalCtx, p: QuestionProfile): string[] {
  const out = [
    "注意事项：突然加重的胸痛、持续高热、便血、意识模糊等，立即就医，勿占卦延误。",
    "勿因卦辞「吉」而忽视复查；勿因「凶」而恐慌，先行动后解读。",
  ];
  if (p.healthSurgery) {
    out.push("手术时机：以主治医生评估为主，择期可避开你个人极度焦虑或工作无法请假的时段，保证术后休息资源到位。");
  }
  return out;
}

function healthPhase(ctx: PracticalCtx, _p: QuestionProfile): string[] {
  const near = ctx.input.changingLine <= 3;
  return [
    near ? "时运节点：近 4–6 周宜养不宜攻，目标是稳定节律而非奇迹好转。" : "时运节点：中期渐有起色，关键是连续坚持而非单日好坏。",
    "记录方式：每周同一天记睡眠时长、情绪 1–10 分、主要症状一次，曲线比感觉可靠。",
    ctx.bian ? bianInsight(ctx) : "",
  ].filter(Boolean);
}

/** 精选解读段落后追加的现实补充（避免 curated 过短） */
export function supplementCuratedSection(ctx: PracticalCtx, title: string, base: string): string {
  const dimMap: Record<CategoryId, Record<string, number>> = {
    career: { 时机判断: 0, 隐患与阻力: 1, 具体建议: 2, 结果走向: 3 },
    relationship: { 缘分磁场: 0, 对方心意: 1, 关系障碍: 2, 发展走向: 3 },
    family: { 现状格局: 0, 各方心态: 1, 核心矛盾: 2, 建议行动: 3 },
    fate: { 选项利弊: 0, 核心变量: 1, 风险提示: 2, 卦象倾向: 3 },
    health: { 五行对应: 0, 调养方向: 1, 注意事项: 2, 时运节点: 3 },
  };
  const idx = dimMap[ctx.input.category]?.[title];
  if (idx == null) return base;
  const extra = buildPracticalDimension(ctx, idx);
  if (!extra || base.includes(extra.slice(0, 24))) return base;
  return `${base}\n\n${extra}`;
}
