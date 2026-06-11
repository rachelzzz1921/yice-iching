/** 卦象打赏档位 · 古币名对应人民币金额（元） */
export type TipTier = {
  id: string;
  amountYuan: number;
  /** 贝（壳）币、刀币、铜钱、白银、黄金等 */
  currencyLabel: string;
  currencyGlyph: string;
  /** 引导文案 */
  hint: string;
};

export const TIP_TIERS: TipTier[] = [
  {
    id: "shell",
    amountYuan: 0.88,
    currencyLabel: "贝币",
    currencyGlyph: "贝",
    hint: "一点心意，谢卦象指路",
  },
  {
    id: "knife",
    amountYuan: 1.88,
    currencyLabel: "刀币",
    currencyGlyph: "刀",
    hint: "解读有用，略表寸心",
  },
  {
    id: "coin",
    amountYuan: 2.88,
    currencyLabel: "铜钱",
    currencyGlyph: "钱",
    hint: "卦象贴切，愿以铜钱酬象",
  },
  {
    id: "silver",
    amountYuan: 3.88,
    currencyLabel: "白银一锭",
    currencyGlyph: "银",
    hint: "受益良多，敬献白银",
  },
  {
    id: "gold",
    amountYuan: 6.88,
    currencyLabel: "黄金一锭",
    currencyGlyph: "金",
    hint: "大事得明，重金谢卦",
  },
  {
    id: "gold-plus",
    amountYuan: 8.88,
    currencyLabel: "赤金一锭",
    currencyGlyph: "赤",
    hint: "指引珍贵，赤金为谢",
  },
];

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

export function formatYuan(yuan: number): string {
  return yuan.toFixed(2);
}

export function tierForCustomYuan(yuan: number): Pick<TipTier, "currencyLabel" | "currencyGlyph" | "hint"> {
  if (yuan >= 88) {
    return { currencyGlyph: "御", currencyLabel: "镇库黄金", hint: "厚礼谢卦，上不封顶" };
  }
  if (yuan >= 28) {
    return { currencyGlyph: "金", currencyLabel: "黄金数锭", hint: "大事问卦，重金为谢" };
  }
  if (yuan >= 10) {
    return { currencyGlyph: "银", currencyLabel: "白银数锭", hint: "深谢指引" };
  }
  if (yuan >= 5) {
    return { currencyGlyph: "钱", currencyLabel: "铜钱数串", hint: "随心酬谢" };
  }
  return { currencyGlyph: "贝", currencyLabel: "贝币", hint: "随心一念" };
}
