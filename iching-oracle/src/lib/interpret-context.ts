/**
 * 为 AI 解读组装的结构化上下文（事实层，禁止模型编造）
 */

import type { CategoryId, CoinYao } from "@/lib/iching";
import { CATEGORIES, INTERPRETATION_FRAMEWORKS } from "@/lib/iching";
import { buildMeihuaLayers } from "@/lib/meihua-interpret";
import { getGuaciByName, getYaociByName } from "@/lib/guaci";
import type { InterpretInput } from "@/lib/interpret.local";
import type { CastMethod } from "@/lib/profile";

const YAO_POS = ["初", "二", "三", "四", "五", "上"];

export type InterpretContextPayload = {
  question: string;
  category: CategoryId;
  categoryLabel: string;
  dimensions: string[];
  castMethod?: CastMethod;
  ben: {
    name: string;
    char: string;
    guaci: string;
    xiangci: string;
    tuanci: string;
  };
  bian: {
    name: string;
    char: string;
    guaci: string;
    xiangci: string;
  } | null;
  changingLine: number;
  changingYao: {
    position: string;
    text: string;
    xiang: string;
  } | null;
  meihua: {
    ti: string;
    yong: string;
    relation: string;
    mutual: string;
    layers: { label: string; text: string }[];
  } | null;
};

function toCoinYao(input: InterpretInput): CoinYao[] | null {
  if (!input.yao || input.yao.length !== 6) return null;
  return input.yao.map((y, i) => ({
    yang: y.yang,
    changing: y.changing,
    label: y.label ?? `第${YAO_POS[i]}爻`,
    coins: ["正", "正", "正"] as ("正" | "反")[],
    sum: y.yang ? 7 : 8,
  }));
}

/** 从起卦输入抽取 AI 可用的卦象事实 */
export function buildInterpretContext(input: InterpretInput): InterpretContextPayload | null {
  const gua = getGuaciByName(input.benName);
  if (!gua) return null;

  const bian = input.bianName ? getGuaciByName(input.bianName) : null;
  const yaoci = input.changingLine ? getYaociByName(input.benName, input.changingLine) : null;
  const cat = CATEGORIES.find((c) => c.id === input.category);

  const yaoList = toCoinYao(input);
  let meihua: InterpretContextPayload["meihua"] = null;
  if (input.castMethod === "meihua" && yaoList && input.changingLine >= 1) {
    const layers = buildMeihuaLayers(yaoList, input.changingLine, gua, bian);
    if (layers) {
      meihua = {
        ti: layers.tiName,
        yong: layers.yongName,
        relation: layers.relation,
        mutual: layers.mutual.name,
        layers: layers.lines.map((l) => ({ label: l.label ?? "", text: l.text })),
      };
    }
  }

  return {
    question: input.question,
    category: input.category,
    categoryLabel: cat?.label ?? input.category,
    dimensions: INTERPRETATION_FRAMEWORKS[input.category].dims,
    castMethod: input.castMethod,
    ben: {
      name: gua.name,
      char: gua.char,
      guaci: gua.guaci,
      xiangci: gua.xiangci,
      tuanci: gua.tuanci,
    },
    bian: bian
      ? {
          name: bian.name,
          char: bian.char,
          guaci: bian.guaci,
          xiangci: bian.xiangci,
        }
      : null,
    changingLine: input.changingLine,
    changingYao: yaoci
      ? {
          position: yaoci.position,
          text: yaoci.text,
          xiang: yaoci.xiang,
        }
      : null,
    meihua,
  };
}

export function contextToPromptJson(ctx: InterpretContextPayload): string {
  return JSON.stringify(ctx, null, 2);
}

/** 卦象事实的人类可读摘要（供 AI prompt 与展示） */
export function formatHexFactsBrief(ctx: InterpretContextPayload): string {
  const lines = [
    `本卦 ${ctx.ben.name}${ctx.ben.char} · 卦辞「${ctx.ben.guaci.replace(/[。；]$/, "")}」`,
    `象曰 ${ctx.ben.xiangci.replace(/[。；]$/, "")}`,
  ];
  if (ctx.changingYao) {
    lines.push(
      `动爻 ${ctx.changingYao.position}：「${ctx.changingYao.text.replace(/[。；]$/, "")}」`,
    );
    if (ctx.changingYao.xiang) {
      lines.push(`动爻象 ${ctx.changingYao.xiang.replace(/[。；]$/, "")}`);
    }
  } else {
    lines.push("无动爻（静卦）");
  }
  if (ctx.bian) {
    lines.push(
      `变卦 ${ctx.bian.name}${ctx.bian.char} · 「${ctx.bian.guaci.replace(/[。；]$/, "")}」`,
    );
  }
  if (ctx.meihua) {
    lines.push(
      `梅花体用：体${ctx.meihua.ti} 用${ctx.meihua.yong}（${ctx.meihua.relation}）· 互卦${ctx.meihua.mutual}`,
    );
  }
  return lines.join("\n");
}
