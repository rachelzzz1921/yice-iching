/**
 * 梅花易数策略速查（来源：muyen/meihua-yishu references/hexagram-strategy.md）
 * 384 爻数据分析：卦型 → 留/走/守/变/慎/观
 */

export type StrategyType =
  | "吸引子"
  | "排斥子"
  | "陷阱"
  | "福地"
  | "困境"
  | "一般";

export type StrategyAction = "留" | "走" | "守" | "变" | "慎" | "观";

export type HexStrategy = {
  id: number;
  name: string;
  auspiciousRate: number;
  type: StrategyType;
  action: StrategyAction;
  changePath?: string;
};

/** 梅花策略 · 长期走向（勿用【】嵌在维度段内，否则 parseSections 会误拆成独立区块） */
export const STRATEGY_OUTLOOK_TITLE = "长期来看";

/** 策略 → 固定【长期来看】（梅花 skill 表格） */
export const STRATEGY_NEXT_STEP: Record<StrategyAction, string> = {
  留: "维持现状，不宜改变。目前位置有利，变动反而损失。",
  走: "积极改变，离开当前状态。此位置不利久留，宜主动求变。",
  守: "稳守不动，静观其变。位置尚可，不主动出击，等待时机。",
  变: "必须改变，不变则困。当前困境需主动突破，犹豫更糟。",
  慎: "谨慎行事，小心陷阱。周围环境不佳，任何动作都要三思。",
  观: "观察局势，再做决定。情况中等，需要更多信息才能判断。",
};

export const HEXAGRAM_STRATEGY: Record<string, HexStrategy> = {
  乾: { id: 1, name: "乾", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变四爻→履(50%)" },
  坤: { id: 2, name: "坤", auspiciousRate: 33, type: "一般", action: "观", changePath: "变四爻→谦(83%)" },
  屯: { id: 3, name: "屯", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→比(67%)" },
  蒙: { id: 4, name: "蒙", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→损(50%)" },
  需: { id: 5, name: "需", auspiciousRate: 67, type: "吸引子", action: "留" },
  讼: { id: 6, name: "讼", auspiciousRate: 67, type: "吸引子", action: "留" },
  师: { id: 7, name: "师", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变六爻→临(83%)" },
  比: { id: 8, name: "比", auspiciousRate: 67, type: "吸引子", action: "留" },
  小畜: { id: 9, name: "小畜", auspiciousRate: 33, type: "一般", action: "观", changePath: "变五爻→家人(67%)" },
  履: { id: 10, name: "履", auspiciousRate: 50, type: "福地", action: "守" },
  泰: { id: 11, name: "泰", auspiciousRate: 33, type: "一般", action: "观", changePath: "变四爻→临(83%)" },
  否: { id: 12, name: "否", auspiciousRate: 50, type: "福地", action: "守" },
  同人: { id: 13, name: "同人", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变六爻→遁(67%)" },
  大有: { id: 14, name: "大有", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→鼎(67%)" },
  谦: { id: 15, name: "谦", auspiciousRate: 83, type: "吸引子", action: "留" },
  豫: { id: 16, name: "豫", auspiciousRate: 17, type: "困境", action: "变", changePath: "变一爻→晋(67%)" },
  随: { id: 17, name: "随", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→萃(50%)" },
  蛊: { id: 18, name: "蛊", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变三爻→鼎(67%)" },
  临: { id: 19, name: "临", auspiciousRate: 83, type: "吸引子", action: "留" },
  观: { id: 20, name: "观", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变一爻→比(67%)" },
  噬嗑: { id: 21, name: "噬嗑", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变六爻→晋(67%)" },
  贲: { id: 22, name: "贲", auspiciousRate: 33, type: "一般", action: "观", changePath: "变二爻→家人(67%)" },
  剥: { id: 23, name: "剥", auspiciousRate: 17, type: "困境", action: "变", changePath: "变三爻→晋(67%)" },
  复: { id: 24, name: "复", auspiciousRate: 33, type: "一般", action: "观", changePath: "变五爻→临(83%)" },
  无妄: { id: 25, name: "无妄", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→否(50%)" },
  大畜: { id: 26, name: "大畜", auspiciousRate: 50, type: "福地", action: "守" },
  颐: { id: 27, name: "颐", auspiciousRate: 50, type: "福地", action: "守" },
  大过: { id: 28, name: "大过", auspiciousRate: 33, type: "一般", action: "观" },
  坎: { id: 29, name: "坎", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变五爻→比(67%)" },
  习坎: { id: 29, name: "习坎", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变五爻→比(67%)" },
  离: { id: 30, name: "离", auspiciousRate: 33, type: "一般", action: "观", changePath: "变一爻→丰(50%)" },
  咸: { id: 31, name: "咸", auspiciousRate: 17, type: "困境", action: "变", changePath: "变一爻→遁(67%)" },
  恒: { id: 32, name: "恒", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变三爻→升(67%)" },
  遁: { id: 33, name: "遁", auspiciousRate: 67, type: "吸引子", action: "留" },
  大壮: { id: 34, name: "大壮", auspiciousRate: 50, type: "吸引子", action: "留" },
  晋: { id: 35, name: "晋", auspiciousRate: 67, type: "吸引子", action: "留" },
  明夷: { id: 36, name: "明夷", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变六爻→谦(83%)" },
  家人: { id: 37, name: "家人", auspiciousRate: 67, type: "吸引子", action: "留" },
  睽: { id: 38, name: "睽", auspiciousRate: 33, type: "一般", action: "观", changePath: "变六爻→未济(50%)" },
  蹇: { id: 39, name: "蹇", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变二爻→谦(83%)" },
  解: { id: 40, name: "解", auspiciousRate: 50, type: "吸引子", action: "留" },
  损: { id: 41, name: "损", auspiciousRate: 50, type: "福地", action: "守" },
  益: { id: 42, name: "益", auspiciousRate: 50, type: "福地", action: "守" },
  夬: { id: 43, name: "夬", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变三爻→需(67%)" },
  姤: { id: 44, name: "姤", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变五爻→遁(67%)" },
  萃: { id: 45, name: "萃", auspiciousRate: 50, type: "福地", action: "守" },
  升: { id: 46, name: "升", auspiciousRate: 67, type: "吸引子", action: "留" },
  困: { id: 47, name: "困", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变一爻→讼(67%)" },
  井: { id: 48, name: "井", auspiciousRate: 17, type: "困境", action: "变", changePath: "变六爻→需(67%)" },
  革: { id: 49, name: "革", auspiciousRate: 50, type: "吸引子", action: "留" },
  鼎: { id: 50, name: "鼎", auspiciousRate: 67, type: "吸引子", action: "留" },
  震: { id: 51, name: "震", auspiciousRate: 17, type: "陷阱", action: "慎" },
  艮: { id: 52, name: "艮", auspiciousRate: 33, type: "一般", action: "观", changePath: "变一爻→谦(83%)" },
  渐: { id: 53, name: "渐", auspiciousRate: 50, type: "福地", action: "守" },
  归妹: { id: 54, name: "归妹", auspiciousRate: 33, type: "一般", action: "观", changePath: "变三爻→临(83%)" },
  丰: { id: 55, name: "丰", auspiciousRate: 50, type: "吸引子", action: "留" },
  旅: { id: 56, name: "旅", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变五爻→鼎(67%)" },
  巽: { id: 57, name: "巽", auspiciousRate: 33, type: "一般", action: "观", changePath: "变五爻→渐(50%)" },
  兑: { id: 58, name: "兑", auspiciousRate: 50, type: "吸引子", action: "留" },
  涣: { id: 59, name: "涣", auspiciousRate: 33, type: "一般", action: "观", changePath: "变三爻→讼(67%)" },
  节: { id: 60, name: "节", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变二爻→临(83%)" },
  中孚: { id: 61, name: "中孚", auspiciousRate: 17, type: "排斥子", action: "走", changePath: "变五爻→益(50%)" },
  小过: { id: 62, name: "小过", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变三爻→谦(83%)" },
  既济: { id: 63, name: "既济", auspiciousRate: 0, type: "排斥子", action: "走", changePath: "变五爻→需(67%)" },
  未济: { id: 64, name: "未济", auspiciousRate: 50, type: "福地", action: "守" },
};

export function getHexStrategy(guaName: string): HexStrategy | null {
  return HEXAGRAM_STRATEGY[guaName] ?? null;
}

export function formatStrategyBlock(
  guaName: string,
  category: "career" | "fate",
): string[] {
  const s = getHexStrategy(guaName);
  if (!s) return [];
  if (category !== "career" && category !== "fate") return [];

  const lines = [
    `梅花策略（本卦${s.name}）：统计吉率约 ${s.auspiciousRate}%，卦型「${s.type}」，策略「${s.action}」。`,
    `${STRATEGY_OUTLOOK_TITLE}：${STRATEGY_NEXT_STEP[s.action]}`,
  ];
  if ((s.type === "排斥子" || s.type === "困境") && s.changePath) {
    lines.push(
      `变卦路径参考：${s.changePath}。宜小步验证后再做结构性变动，忌赌气一搏。`,
    );
  }
  if (s.name === "临" || s.changePath?.includes("临")) {
    lines.push("临卦为转折象：贵人、机缘将至，但须先稳住当下再承接。");
  }
  return lines;
}
