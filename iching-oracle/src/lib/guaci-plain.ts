import type { CategoryId } from "@/lib/iching";
import { getEssence, getSignal } from "@/lib/hexagramEssence";
import { getGuaciByName, getYaociByName } from "@/lib/guaci";
import { HEX_NAME_TO_ID } from "@/lib/guaci-db.generated";
import { getYaoWeight } from "@/lib/yaoWeights";

/** 卦辞 / 象辞白话（供结果页「卦象原文」区展示） */
export function getGuaciPlainSummary(hexName: string, category: CategoryId): string | null {
  const id = HEX_NAME_TO_ID[hexName];
  if (!id) return null;
  const essence = getEssence(id);
  if (!essence) return null;
  const signal = getSignal(id, category);
  if (signal) return signal;
  return essence.essence;
}

/** 动爻爻辞白话 */
export function getYaoPlainSummary(hexName: string, line: number, category: CategoryId): string | null {
  const y = getYaociByName(hexName, line);
  if (!y) return null;
  const id = HEX_NAME_TO_ID[hexName];
  const signal = id ? getSignal(id, category) : null;
  const text = y.text.replace(/[。；]$/, "");
  if (signal) {
    return `「${text}」大意：${signal.split("，")[0]}。`;
  }
  return `「${text}」：此爻为当下最该正面处理的一层，先落实这一层再议其它。`;
}

/** 象曰白话（由卦性 essence 兜底） */
export function getXiangPlainSummary(hexName: string): string | null {
  const gua = getGuaciByName(hexName);
  if (!gua) return null;
  const id = HEX_NAME_TO_ID[hexName];
  const essence = id ? getEssence(id) : null;
  if (essence) return essence.essence;
  return null;
}

/** 动爻小象白话（动爻权重语料） */
export function getYaoXiangPlainSummary(
  line: number,
  yinyang: "阳" | "阴" | null,
  category: CategoryId,
): string | null {
  if (!yinyang) return null;
  const yaoNature = yinyang === "阳" ? 1 : 0;
  const data = getYaoWeight(line, yaoNature, category);
  return data?.signal?.trim() || null;
}
