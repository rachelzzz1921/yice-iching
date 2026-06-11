/**
 * 追问回复引擎：直断 → 白话卦理 → 具体方向 → 忌 → 行
 * 原则：不堆卦辞原文、不套通用清单、先答人话再问
 */

import type { CategoryId } from "@/lib/iching";
import { GUA_CAREER, type GuaCareerProfile } from "@/lib/followup-gua-career";
import { getHexStrategy } from "@/lib/hexagram-strategy";
import { getGuaciByName, getYaociByName } from "@/lib/guaci";
import { detectQuestionProfile, type PracticalCtx } from "@/lib/interpret-practical";
import { splitVerdictBody } from "@/lib/interpret-sections";

export type FollowUpInput = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName?: string | null;
  changingLine: number;
  interpretation: string;
  userMessage: string;
};

export type FollowIntent =
  | "job_direction"
  | "next_step"
  | "timing"
  | "yesno"
  | "person_mind"
  | "risk"
  | "salary"
  | "comparison"
  | "other";

export function detectFollowIntent(msg: string, category: CategoryId): FollowIntent {
  const m = msg.trim();
  if (/什么工作|啥工作|哪种工作|哪个方向|什么岗位|什么行业|去哪行|做什么工作|什么类型|找啥|找什么|下一步找/.test(m)) {
    return "job_direction";
  }
  if (/下一步|怎么做|怎么办|如何做|该怎么|应该怎么|从哪开始|怎么跟|如何/.test(m)) return "next_step";
  if (/什么时候|何时|几时|多久|还要等|几月|几号|哪天/.test(m)) return "timing";
  if (/该不该|要不要|能不能|可以吗|行不行|值得吗|有没有机会|能成吗|去不去/.test(m)) return "yesno";
  if (category === "relationship" && /他|她|对方|ta|怎么想|什么态度|有没有意|喜不喜欢/.test(m)) {
    return "person_mind";
  }
  if (/风险|最坏|输了|后果|代价|有什么坑|会后悔/.test(m)) return "risk";
  if (/薪资|工资|待遇|多少钱|收入|offer/.test(m)) return "salary";
  if (/还是|哪个好|选哪个|二选一|两个/.test(m)) return "comparison";
  return "other";
}

function cleanUserAsk(msg: string): string {
  return msg.replace(/^(那|那么|请问|我想问|就是说)+/u, "").trim() || msg.trim();
}

function getCareerProfile(guaName: string): GuaCareerProfile {
  if (GUA_CAREER[guaName]) return GUA_CAREER[guaName];
  const s = getHexStrategy(guaName);
  if (s?.action === "走") {
    return {
      gist: "当前土壤不宜久留，宜主动换槽，但先找好下家",
      picks: ["同行业换团队", "增长赛道里能学到东西的岗", "有书面 offer 再动"],
      avoid: "无缓冲裸辞、为逃而跳进同类坑",
    };
  }
  if (s?.action === "变") {
    return {
      gist: "困局需破局，宜换打法或换场，不宜原地硬扛",
      picks: ["技能升级后换岗", "从死局职能切出", "小步试点新方向"],
      avoid: "同一模式重复期待不同结果",
    };
  }
  if (s?.action === "慎") {
    return {
      gist: "环境多坑，宜慎选、合同写清",
      picks: ["大平台职能线", "合同与 KPI 书面化岗位", "可快速退出的项目制"],
      avoid: "高杠杆、口头承诺、未经背调的团队",
    };
  }
  return {
    gist: "局面中等，先看清再动，小步验证",
    picks: ["列三类候选各试一轮", "信息访谈后再投", "同赛道内换更好的团队"],
    avoid: "第一份 offer 就签、无调研冲动入职",
  };
}

function yaoPlainLine(benName: string, changingLine: number): string | null {
  if (!changingLine) return null;
  const y = getYaociByName(benName, changingLine);
  if (!y) return null;
  const pos = ["初", "二", "三", "四", "五", "上"][changingLine - 1] ?? "";
  const text = y.text.replace(/[。；]$/, "");
  const hints: Record<string, string> = {
    鼎耳革: "想动却卡住，先补下家与交接，勿赌气裸辞",
    肥遁: "宜彻底远离内耗场，选能独立交付的岗",
    好遁: "君子宜退而独善，小人宜留而争功——选能独立成事、少站队的环境",
    嘉遁: "体面退出、好聚好散，再谋下一段",
    系遁: "被旧岗或人情拴住——先理清拖累你的那条线（副业/未交接/成员），再谈跳槽",
    黄牛: "被旧责拴住，先减负再动",
    鸿渐: "宜循序渐进，忌一步登天",
    征不复: "不宜仓促远行或大幅换城，先小步试",
  };
  for (const [k, v] of Object.entries(hints)) {
    if (text.includes(k)) return `动爻在${pos}爻：${v}。`;
  }
  return `动爻在${pos}爻：当下卡点在这一层，宜先处理「${text.slice(0, 12)}…」相关的人事或责任，再做大决定。`;
}

function pickVerdict(interpretation: string): string | null {
  const m = interpretation.match(/【断语】\s*([\s\S]*?)(?=【|$)/);
  if (!m) return null;
  const line = m[1].replace(/\n+/g, " ").replace(/⟦原文⟧[\s\S]*/g, "").trim();
  const { punchline } = splitVerdictBody(line);
  if (punchline.length < 4 || punchline.length > 80) return null;
  if (/①|写下你此刻|局外人|不决策日/.test(punchline)) return null;
  return punchline;
}

function formatPicks(picks: readonly string[]): string {
  return picks.map((p, i) => `${i + 1}. ${p}`).join("\n");
}

function careerJobDirection(ctx: PracticalCtx, userMessage: string, interpretation: string): string {
  const { gua, bian, input } = ctx;
  const ben = getCareerProfile(gua.name);
  const ask = cleanUserAsk(userMessage);
  const verdict = pickVerdict(interpretation);
  const yao = yaoPlainLine(input.benName, input.changingLine);

  const parts: string[] = [];

  parts.push(`【直断】`);
  if (verdict) {
    parts.push(`结合你原问「${input.question}」与本次断语：${verdict}`);
  } else {
    parts.push(`你问的是「${ask}」——${gua.name}卦主${ben.gist}。`);
  }

  parts.push(`\n【卦理】${gua.name}不是让你背古文，是说你该找「${ben.gist}」的土壤。`);

  if (bian) {
    const bianP = getCareerProfile(bian.name);
    parts.push(`变${bian.name}为走势：终局宜「${bianP.gist}」，筛岗时看 3 年后是否朝这条线走。`);
  }

  if (yao) parts.push(yao);

  parts.push(`\n【方向】优先考虑：\n${formatPicks(ben.picks)}`);
  parts.push(`\n【忌】${ben.avoid}`);

  const p = detectQuestionProfile(input);
  if (p.careerQuit) {
    parts.push(`\n【行】先列：下家/存款月数/交接成本/职业叙事四条，两项不达标先别辞；本周约 1 次目标行业信息访谈。`);
  } else {
    parts.push(`\n【行】本周各找 2 家符合上面方向的岗位，只投能写清「为何适合你」的；约 1 次 20 分钟行业访谈校正。`);
  }

  return parts.join("\n");
}

function careerNextStep(ctx: PracticalCtx, userMessage: string): string {
  const { gua, input } = ctx;
  const ben = getCareerProfile(gua.name);
  const ask = cleanUserAsk(userMessage);
  const p = detectQuestionProfile(input);

  const parts = [
    `【直断】就「${ask}」：${gua.name}卦——${ben.gist}。`,
    `\n【下一步】`,
    `1. 明天：更新简历里最能量化的一条成果，或约一位目标行业的人聊 20 分钟。`,
    `2. 本周：按上面方向筛 3 类岗位，每类写 1 条「6 周后如何验证选对了」。`,
    `3. 7 天内：不做不可逆动作（辞职/签长约），只收集信息与试探面试。`,
  ];

  if (p.careerQuit) {
    parts.push(`4. 离职线：书面 offer 到手再提辞；无 offer 则先内部谈边界或骑驴找马。`);
  }

  return parts.join("\n");
}

function careerTiming(ctx: PracticalCtx, userMessage: string): string {
  const { gua, input } = ctx;
  const ask = cleanUserAsk(userMessage);
  const yao = yaoPlainLine(input.benName, input.changingLine);
  return [
    `【直断】就「${ask}」：${gua.name}卦下，宜以 6–8 周为验证窗，勿用单日情绪做决定。`,
    yao ?? "",
    `\n【行】日历标出 6 周后的「决定日」；此前只做信息收集与 1 件可量化小实验（如 3 次面试或 1 个副业试点）。`,
  ]
    .filter(Boolean)
    .join("\n");
}

function careerYesNo(ctx: PracticalCtx, userMessage: string, interpretation: string): string {
  const { gua, bian, input } = ctx;
  const ask = cleanUserAsk(userMessage);
  const verdict = pickVerdict(interpretation);
  const guaText = getGuaciByName(gua.name)?.guaci ?? "";
  const bianText = bian ? getGuaciByName(bian.name)?.guaci ?? "" : "";
  const bad = /凶|厉|悔|吝|不利|无攸利/.test(bianText || guaText);
  const good = /吉|亨|元吉|利贞|无咎/.test(bianText || guaText);

  let tendency = "可做准备和小步试探，暂不宜一把梭的不可逆动作。";
  if (bad && !good) tendency = "卦意偏守：先补退路、保底，再谈出手。";
  else if (good && !bad) tendency = "卦意偏可行：宜小步验证、留退路，忌赌气一搏。";

  return [
    `【直断】就「${ask}」：${tendency}`,
    verdict ? `（本次断语：${verdict}）` : "",
    `\n【行】列最坏三种情形各写一条应对；设 7 天冷静期，到期仍倾向同一选择再小步出手。`,
  ]
    .filter(Boolean)
    .join("\n");
}

const REL_GUA_HINT: Partial<Record<string, string>> = {
  咸: "感应初萌，宜低压力确认，忌连环试探",
  恒: "看长期能否同频，忌用短期冷淡定论",
  归妹: "名分与角色要写清，忌暧昧合作",
  渐: "宜慢火熬，忌逼签",
  睽: "分歧可调和则谈，不可则换相处方式",
};

function relationshipAnswer(ctx: PracticalCtx, userMessage: string, intent: FollowIntent): string {
  const { gua, input } = ctx;
  const ask = cleanUserAsk(userMessage);
  const hint = REL_GUA_HINT[gua.name] ?? `${gua.name}卦下，感情宜看节奏与边界，忌用猜测代替对话。`;

  if (intent === "person_mind") {
    return [
      `【直断】就「${ask}」：别猜心，看行动。`,
      `\n【怎么看】三次——主动找你聊深度话题吗？你遇困对方回避还是站位？对未来有没有具体安排（不仅是甜言蜜语）？`,
      `三次里只有一次为正：降期待、升观察，不宜立刻表白加压。`,
      `\n【卦理】${hint}`,
      `\n【行】本周找一次低压力确认（约见或直问边界），用对方行动作答。`,
    ].join("\n");
  }

  return [
    `【直断】就「${ask}」：${hint}`,
    `\n【行】给关系 4–8 周观察窗，记录「舒服/别扭」各几件事；别扭持续则坦诚谈一次。`,
  ].join("\n");
}

function decisionAnswer(ctx: PracticalCtx, userMessage: string, intent: FollowIntent): string {
  const { gua, bian, input } = ctx;
  const ask = cleanUserAsk(userMessage);
  const p = detectQuestionProfile(input);

  if (intent === "comparison" || p.fateOffer || p.fateStayGo) {
    return [
      `【直断】就「${ask}」：没有满分选项，只有「更符合你三年目标、且最坏情况仍承受得起」的选项。`,
      `\n【怎么选】每个选项写三列：得到什么 / 失去什么 / 能否撤回。`,
      p.famSettle ? "扎根类：先算清落户、社交、家庭支撑能否重建，宜试点再定。" : "",
      bian ? `变${bian.name}示走势：${getCareerProfile(bian.name).gist}（决策亦可用此象对照）。` : "",
      `\n【行】4–6 周小步试运行（试点、兼职、小额仓位），用数据再放大。`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (intent === "risk") {
    return [
      `【直断】就「${ask}」：最大风险常是「不可逆动作在情绪高点做出」。`,
      `\n【忌】大额签约、辞职、离婚、加杠杆——宜早晨清醒时定。`,
      `\n【行】写下最坏情形 + 存款月数/回退方案，有退路再决策。`,
    ].join("\n");
  }

  return [
    `【直断】就「${ask}」：${gua.name}卦——${getCareerProfile(gua.name).gist}。`,
    `\n【行】把选项拆成「得到/失去/能否撤回」，情绪平稳的早晨再定不可逆动作。`,
  ].join("\n");
}

function healthAnswer(ctx: PracticalCtx, userMessage: string, intent: FollowIntent): string {
  const ask = cleanUserAsk(userMessage);
  if (intent === "timing") {
    return [
      `【直断】就「${ask}」：以 4–6 周看睡眠与精力趋势，勿用单日好坏论全局。`,
      `\n【行】每天 10 分钟散步 + 睡前断屏；持续影响工作睡眠超两周，宜寻求专业帮助。`,
      `卦象辅理不代医，异常症状先就医。`,
    ].join("\n");
  }
  return [
    `【直断】就「${ask}」：先找最影响生活的一项症状集中改善（睡眠/消化/情绪常联动）。`,
    `\n【行】规律作息优先于猛补；记录 4 周曲线；胸痛高热便血等立即就医。`,
  ].join("\n");
}

function careerSalary(ctx: PracticalCtx, userMessage: string): string {
  const ask = cleanUserAsk(userMessage);
  return [
    `【直断】就「${ask}」：薪资要和成长空间、团队稳定、能否写进简历的成果一起看。`,
    `\n【行】拿到书面 offer 后比三项：底薪结构、考核挂钩、试用期与退出条款；短期高 10% 无成长，往往不如能积筹码的位。`,
  ].join("\n");
}

function otherAnswer(ctx: PracticalCtx, userMessage: string): string {
  const { gua, input } = ctx;
  const ask = cleanUserAsk(userMessage);
  if (input.category === "career") {
    return careerJobDirection(ctx, userMessage, "");
  }
  return [
    `【直断】就「${ask}」：仍扣你原题「${input.question}」。`,
    `\n【卦理】${gua.name}卦——${getCareerProfile(gua.name).gist}。`,
    `\n【行】把问题拆成一件本周能完成的小动作，做完再看要不要加码。`,
  ].join("\n");
}

export function composeFollowUpReply(input: FollowUpInput): string {
  const gua = getGuaciByName(input.benName);
  if (!gua) {
    return `【直断】卦象数据暂缺。请对照本次解读中的【具体建议】与【断语】执行；把你的追问拆成一件本周能做的小事。`;
  }

  const bian = input.bianName ? getGuaciByName(input.bianName) : null;
  const benYao = input.changingLine ? getYaociByName(input.benName, input.changingLine) : null;

  const ctx: PracticalCtx = {
    gua,
    bian,
    yaoci: benYao,
    input: {
      category: input.category,
      question: input.question,
      benName: input.benName,
      bianName: input.bianName,
      changingLine: input.changingLine,
    },
  };

  const intent = detectFollowIntent(input.userMessage, input.category);

  if (input.category === "career") {
    switch (intent) {
      case "job_direction":
        return careerJobDirection(ctx, input.userMessage, input.interpretation);
      case "next_step":
        return careerNextStep(ctx, input.userMessage);
      case "timing":
        return careerTiming(ctx, input.userMessage);
      case "yesno":
        return careerYesNo(ctx, input.userMessage, input.interpretation);
      case "salary":
        return careerSalary(ctx, input.userMessage);
      case "risk":
        return decisionAnswer(ctx, input.userMessage, "risk");
      case "comparison":
        return decisionAnswer(ctx, input.userMessage, "comparison");
      default:
        return careerNextStep(ctx, input.userMessage);
    }
  }

  if (input.category === "relationship") {
    return relationshipAnswer(ctx, input.userMessage, intent);
  }

  if (input.category === "fate") {
    return decisionAnswer(ctx, input.userMessage, intent);
  }

  if (input.category === "family") {
    return decisionAnswer(ctx, input.userMessage, intent);
  }

  if (input.category === "health") {
    return healthAnswer(ctx, input.userMessage, intent);
  }

  return otherAnswer(ctx, input.userMessage);
}
