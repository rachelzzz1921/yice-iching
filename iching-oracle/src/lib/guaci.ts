/**
 * 卦辞库访问层
 * 完整 64 卦数据见 guaci-db.generated.ts（由 scripts/build-guaci-db.mjs 生成）
 */

export type { GuaciEntry } from "@/lib/guaci-db.generated";
export { GUACI_DB, HEX_NAME_TO_ID } from "@/lib/guaci-db.generated";
import { GUACI_DB, HEX_NAME_TO_ID, type GuaciEntry } from "@/lib/guaci-db.generated";

export function getGuaciById(id: number): GuaciEntry | null {
  return GUACI_DB[id] ?? null;
}

/** 本卦表用简称，open-iching 用全称时的别名 */
const NAME_ALIASES: Record<string, string> = {
  坎: "习坎",
};

export function getGuaciByName(name: string): GuaciEntry | null {
  const resolved = NAME_ALIASES[name] ?? name;
  const id = HEX_NAME_TO_ID[resolved];
  if (id != null) return GUACI_DB[id] ?? null;
  return null;
}

export function getYaociByName(name: string, line: number) {
  const gua = getGuaciByName(name);
  if (!gua || line < 1 || line > 6) return null;
  return gua.yaoci[line - 1] ?? null;
}

export function hasGuaciData(name: string): boolean {
  return name in HEX_NAME_TO_ID;
}
