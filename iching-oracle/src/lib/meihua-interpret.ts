/**
 * 梅花易数 · 体用 / 互卦 / 变卦 时间层（近期·中期·远期）
 */

import { hexFromYao, TRIGRAMS, type CoinYao } from "@/lib/iching";
import type { InterpretLine } from "@/lib/interpret-format";
import type { GuaciEntry } from "@/lib/guaci";
import { getGuaciByName } from "@/lib/guaci";

const TRIGRAM_WUXING: Record<string, string> = {
  乾: "金",
  兑: "金",
  离: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土",
};

type TiYongRelation = "用生体" | "体生用" | "体克用" | "用克体" | "比和";

function trigramFromYao(bits: [number, number, number]): (typeof TRIGRAMS)[number] | null {
  const key = bits.join("");
  return TRIGRAMS.find((t) => t.bits.join("") === key) ?? null;
}

function wuxingRelation(ti: string, yong: string): TiYongRelation {
  const a = TRIGRAM_WUXING[ti];
  const b = TRIGRAM_WUXING[yong];
  if (!a || !b) return "比和";
  if (a === b) return "比和";
  const sheng: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const ke: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (sheng[b] === a) return "用生体";
  if (sheng[a] === b) return "体生用";
  if (ke[a] === b) return "体克用";
  if (ke[b] === a) return "用克体";
  return "比和";
}

function relationHint(r: TiYongRelation): string {
  const map: Record<TiYongRelation, string> = {
    用生体: "用生体，外力助我，近期多有援手或资源流入，宜顺势承接。",
    体生用: "体生用，我在付出，短期会累，但可能在投资未来——问是否值得，要看回报周期。",
    体克用: "体克用，我能掌控局面，宜主动推进，但忌用力过猛。",
    用克体: "用克体，压力大、被动，先保底再图变，忌硬扛。",
    比和: "比和，节奏平稳，重在耐心与执行，非一夜翻盘之象。",
  };
  return map[r];
}

export function yaoBitsFromList(yaoList: CoinYao[]): number[] {
  return yaoList.map((y) => y.yang);
}

/** 互卦六爻：2-3-4 为下，3-4-5 为上 */
export function mutualYaoFromBen(yao: number[]): number[] {
  if (yao.length !== 6) return yao;
  return [yao[1], yao[2], yao[3], yao[2], yao[3], yao[4]];
}

export type MeihuaLayers = {
  tiName: string;
  yongName: string;
  relation: TiYongRelation;
  mutual: { name: string; char: string };
  lines: InterpretLine[];
  paragraphs: string[];
};

export function buildMeihuaLayers(
  yaoList: CoinYao[],
  changingLine: number,
  ben: GuaciEntry,
  bian: GuaciEntry | null,
): MeihuaLayers | null {
  if (yaoList.length !== 6 || changingLine < 1 || changingLine > 6) return null;

  const yao = yaoBitsFromList(yaoList);
  const lower: [number, number, number] = [yao[0], yao[1], yao[2]];
  const upper: [number, number, number] = [yao[3], yao[4], yao[5]];

  const onLower = changingLine <= 3;
  const tiBits = onLower ? upper : lower;
  const yongBits = onLower ? lower : upper;
  const tiTri = trigramFromYao(tiBits);
  const yongTri = trigramFromYao(yongBits);
  if (!tiTri || !yongTri) return null;

  const relation = wuxingRelation(tiTri.name, yongTri.name);
  const mutual = hexFromYao(mutualYaoFromBen(yao));
  const mutualGua = getGuaciByName(mutual.name);

  const lines: InterpretLine[] = [
    {
      label: "体用",
      text: `体卦${tiTri.name}（${TRIGRAM_WUXING[tiTri.name]}）为你，用卦${yongTri.name}（${TRIGRAM_WUXING[yongTri.name]}）为所问之事。${relationHint(relation)}`,
    },
    {
      label: "近期",
      text: `用卦${yongTri.name}主事——事情如何起手、当下体感与直接阻力，多体现在这一层。`,
    },
    {
      label: "中期",
      text: `互卦${mutual.name}主过程与隐性变量。${mutualGua ? `互卦象「${mutualGua.guaci.replace(/[。；]$/, "")}」` : ""}，宜观察 4–8 周内是否出现转机或反复。`,
    },
    {
      label: "远期",
      text: bian
        ? `变卦${bian.name}为收束方向。卦辞「${bian.guaci.replace(/[。；]$/, "")}」——惯性会趋此象；你在 6 周内主动调整，结局仍可改写。`
        : `无变卦则大势以本卦${ben.name}为主，靠持续小幅修正积累结果。`,
    },
  ];

  const paragraphs = lines.map((l) => (l.label ? `${l.label}：${l.text}` : l.text));

  return {
    tiName: tiTri.name,
    yongName: yongTri.name,
    relation,
    mutual,
    lines,
    paragraphs,
  };
}
