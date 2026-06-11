/**
 * 卦象客观事实（语料库提取，供展示与 AI 约束，禁止编造）
 */

import { GUA_TABLE, TRIGRAMS } from "@/lib/iching";
import { getGuaciByName, getYaociByName } from "@/lib/guaci";
import type { InterpretInput } from "@/lib/interpret.local";
import { buildInterpretContext, type InterpretContextPayload } from "@/lib/interpret-context";

const TRIGRAM_ATTR: Record<string, { nature: string; wuxing: string }> = {
  乾: { nature: "天", wuxing: "金" },
  坤: { nature: "地", wuxing: "土" },
  震: { nature: "雷", wuxing: "木" },
  巽: { nature: "风", wuxing: "木" },
  坎: { nature: "水", wuxing: "水" },
  离: { nature: "火", wuxing: "火" },
  艮: { nature: "山", wuxing: "土" },
  兑: { nature: "泽", wuxing: "金" },
};

export type TrigramFact = {
  name: string;
  nature: string;
  wuxing: string;
};

export type InterpretFacts = {
  benGua: {
    id: number;
    name: string;
    char: string;
    lower: string;
    upper: string;
    lowerWuxing: string;
    upperWuxing: string;
    guaci: string | null;
    xiangci: string | null;
  };
  changingLine: {
    position: number;
    yinyang: "阳" | "阴" | null;
    yaoci: string | null;
    yaoxiang: string | null;
  } | null;
  bianGua: {
    id: number;
    name: string;
    char: string;
    lower: string;
    upper: string;
    guaci: string | null;
  } | null;
  meihua: InterpretContextPayload["meihua"];
};

function trigramAttr(name: string): TrigramFact {
  const a = TRIGRAM_ATTR[name] ?? { nature: name, wuxing: "—" };
  return { name, nature: a.nature, wuxing: a.wuxing };
}

function findTrigramsByHexName(hexName: string): { lower: TrigramFact; upper: TrigramFact } | null {
  for (let li = 0; li < GUA_TABLE.length; li++) {
    for (let ui = 0; ui < GUA_TABLE[li].length; ui++) {
      if (GUA_TABLE[li][ui][0] === hexName) {
        return {
          lower: trigramAttr(TRIGRAMS[li].name),
          upper: trigramAttr(TRIGRAMS[ui].name),
        };
      }
    }
  }
  return null;
}

function findTrigramsFromYao(yao: { yang: 0 | 1 }[]): { lower: TrigramFact; upper: TrigramFact } | null {
  if (yao.length !== 6) return null;
  const lowerBits: [number, number, number] = [yao[0].yang, yao[1].yang, yao[2].yang];
  const upperBits: [number, number, number] = [yao[3].yang, yao[4].yang, yao[5].yang];
  const li = TRIGRAMS.findIndex((t) => t.bits.join("") === lowerBits.join(""));
  const ui = TRIGRAMS.findIndex((t) => t.bits.join("") === upperBits.join(""));
  if (li < 0 || ui < 0) return null;
  return { lower: trigramAttr(TRIGRAMS[li].name), upper: trigramAttr(TRIGRAMS[ui].name) };
}

function yinyangFromYaoci(position: string | undefined, yang?: 0 | 1): "阳" | "阴" | null {
  if (yang === 1) return "阳";
  if (yang === 0) return "阴";
  if (!position) return null;
  if (/九|初九|九二|九三|九四|九五|上九/.test(position)) return "阳";
  if (/六|初六|六二|六三|六四|六五|上六/.test(position)) return "阴";
  return null;
}

/** 从起卦输入抽取客观卦象事实 */
export function extractInterpretFacts(input: InterpretInput): InterpretFacts | null {
  const gua = getGuaciByName(input.benName);
  if (!gua) return null;

  const bian = input.bianName ? getGuaciByName(input.bianName) : null;
  const yaoci = input.changingLine ? getYaociByName(input.benName, input.changingLine) : null;
  const benTri =
    findTrigramsFromYao(input.yao ?? []) ?? findTrigramsByHexName(input.benName);
  const bianTri = bian ? (findTrigramsByHexName(bian.name) ?? null) : null;

  const changingYang =
    input.changingLine >= 1 && input.changingLine <= 6
      ? input.yao?.[input.changingLine - 1]?.yang
      : undefined;

  const ctx = buildInterpretContext(input);

  return {
    benGua: {
      id: gua.id,
      name: gua.name,
      char: gua.char,
      lower: benTri?.lower.nature ?? "—",
      upper: benTri?.upper.nature ?? "—",
      lowerWuxing: benTri?.lower.wuxing ?? "—",
      upperWuxing: benTri?.upper.wuxing ?? "—",
      guaci: gua.guaci,
      xiangci: gua.xiangci,
    },
    changingLine: input.changingLine
      ? {
          position: input.changingLine,
          yinyang: yinyangFromYaoci(yaoci?.position, changingYang),
          yaoci: yaoci?.text ?? null,
          yaoxiang: yaoci?.xiang ?? null,
        }
      : null,
    bianGua: bian
      ? {
          id: bian.id,
          name: bian.name,
          char: bian.char,
          lower: bianTri?.lower.nature ?? "—",
          upper: bianTri?.upper.nature ?? "—",
          guaci: bian.guaci,
        }
      : null,
    meihua: ctx?.meihua ?? null,
  };
}

/** 事实 JSON 摘要（追问 API 可选携带） */
export function factsToPromptJson(facts: InterpretFacts): string {
  return JSON.stringify(facts, null, 2);
}
