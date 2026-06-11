import * as XLSX from "xlsx";
import type { AdminRedemptionCode } from "@/lib/admin-api";
import { formatTime } from "./admin-utils";

/** 导入表列（与模板、说明一致） */
export const REDEMPTION_IMPORT_COLUMNS = [
  { key: "code", header: "兑换码", hint: "留空则按前缀自动生成" },
  { key: "kind", header: "类型", hint: "lifetime / member / credits 或 永久会员/会员/额外次数" },
  { key: "maxRedemptions", header: "可用次数", hint: "可被多少人兑换，正整数" },
  { key: "creditAmount", header: "每人增加次数", hint: "仅「额外次数」类型必填" },
  { key: "note", header: "备注", hint: "运营备注，可选" },
  { key: "expiresAt", header: "过期时间", hint: "如 2026-12-31，留空=永不过期" },
  { key: "enabled", header: "启用", hint: "是 / 否，默认 是" },
  { key: "prefix", header: "自动生成前缀", hint: "兑换码留空时生效，默认 YICE" },
] as const;

/** 导出表列（含统计，导入时忽略只读列） */
export const REDEMPTION_EXPORT_COLUMNS = [
  { key: "code", header: "兑换码" },
  { key: "kind", header: "类型代码" },
  { key: "kindLabel", header: "类型" },
  { key: "maxRedemptions", header: "可用次数" },
  { key: "redemptionCount", header: "已兑换次数" },
  { key: "remaining", header: "剩余次数" },
  { key: "statusLabel", header: "状态" },
  { key: "enabled", header: "启用" },
  { key: "creditAmount", header: "每人增加次数" },
  { key: "note", header: "备注" },
  { key: "expiresAt", header: "过期时间" },
  { key: "createdAt", header: "创建时间" },
] as const;

const HEADER_ALIASES: Record<string, string> = {
  兑换码: "code",
  类型: "kind",
  类型代码: "kind",
  "可用次数": "maxRedemptions",
  "每人增加次数": "creditAmount",
  备注: "note",
  "过期时间": "expiresAt",
  启用: "enabled",
  "自动生成前缀": "prefix",
  prefix: "prefix",
};

const TEMPLATE_EXAMPLE = [
  "YICE-DEMO-2026",
  "lifetime",
  "100",
  "",
  "Excel 导入示例",
  "2026-12-31",
  "是",
  "YICE",
];

const INSTRUCTION_ROWS = [
  ["易测 · 兑换码批量导入说明"],
  [""],
  ["1. 请使用工作表「导入数据」填写，勿改表头列名"],
  ["2. 类型可填英文 lifetime/member/credits，或中文：永久会员、会员、额外次数"],
  ["3. 兑换码留空时将按「自动生成前缀」生成随机码"],
  ["4. 单次导入上限 500 行；已存在的兑换码会自动跳过"],
  ["5. 导出文件中的「已兑换次数」等列仅作查看，重新导入时会被忽略"],
  [""],
  ["列名", "是否必填", "说明"],
  ...REDEMPTION_IMPORT_COLUMNS.map((c) => [
    c.header,
    c.key === "kind" || c.key === "maxRedemptions" ? "是" : c.key === "creditAmount" ? "条件必填" : "否",
    c.hint,
  ]),
];

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function headerRow() {
  return REDEMPTION_IMPORT_COLUMNS.map((c) => c.header);
}

export function downloadRedemptionImportTemplate() {
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([headerRow(), TEMPLATE_EXAMPLE]);
  XLSX.utils.book_append_sheet(wb, dataSheet, "导入数据");
  const helpSheet = XLSX.utils.aoa_to_sheet(INSTRUCTION_ROWS);
  XLSX.utils.book_append_sheet(wb, helpSheet, "填写说明");
  downloadWorkbook(wb, "易测-兑换码导入模板.xlsx");
}

export function downloadRedemptionExportExcel(codes: AdminRedemptionCode[], filename?: string) {
  const headers = REDEMPTION_EXPORT_COLUMNS.map((c) => c.header);
  const rows = codes.map((c) =>
    REDEMPTION_EXPORT_COLUMNS.map((col) => {
      switch (col.key) {
        case "enabled":
          return c.enabled ? "是" : "否";
        case "expiresAt":
          return c.expiresAt ? formatTime(c.expiresAt) : "";
        case "createdAt":
          return formatTime(c.createdAt);
        default:
          return (c as Record<string, unknown>)[col.key] ?? "";
      }
    }),
  );
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, sheet, "兑换码列表");
  downloadWorkbook(wb, filename ?? `易测-兑换码导出-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export type RedemptionImportRow = {
  code?: string;
  kind: string;
  maxRedemptions: number;
  creditAmount?: number;
  note?: string;
  expiresAt?: string | null;
  enabled?: string | boolean;
  prefix?: string;
  __line: number;
};

export type ParseImportResult = {
  rows: RedemptionImportRow[];
  errors: string[];
};

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .replace(/\*/g, "");
}

function cellValue(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function mapRow(raw: Record<string, unknown>, line: number): { row?: RedemptionImportRow; error?: string } {
  const mapped: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_ALIASES[normalizeHeader(header)] ?? normalizeHeader(header);
    if (REDEMPTION_IMPORT_COLUMNS.some((c) => c.key === key)) {
      mapped[key] = cellValue(value);
    }
  }
  if (!mapped.kind?.trim()) {
    return { error: `第 ${line} 行：缺少「类型」` };
  }
  const max = Number(mapped.maxRedemptions);
  if (!mapped.maxRedemptions?.trim() || !Number.isFinite(max) || max < 1) {
    return { error: `第 ${line} 行：「可用次数」须为 ≥1 的数字` };
  }
  return {
    row: {
      code: mapped.code || undefined,
      kind: mapped.kind,
      maxRedemptions: max,
      creditAmount: mapped.creditAmount ? Number(mapped.creditAmount) : undefined,
      note: mapped.note || undefined,
      expiresAt: mapped.expiresAt || null,
      enabled: mapped.enabled || undefined,
      prefix: mapped.prefix || undefined,
      __line: line,
    },
  };
}

function isInstructionRow(raw: Record<string, unknown>): boolean {
  const first = cellValue(Object.values(raw)[0]);
  const code = cellValue(raw["兑换码"] ?? raw.code);
  if (code.startsWith("YICE-DEMO")) return true;
  return !first || first.includes("说明") || first.includes("易测") || first === "列名";
}

export async function parseRedemptionImportFile(file: File): Promise<ParseImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => n.includes("导入")) ?? wb.SheetNames.find((n) => n !== "填写说明") ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { rows: [], errors: ["文件中没有可用的工作表"] };

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: RedemptionImportRow[] = [];
  const errors: string[] = [];

  json.forEach((raw, idx) => {
    const line = idx + 2;
    if (isInstructionRow(raw)) return;
    const code = cellValue(raw["兑换码"] ?? raw.code);
    const kind = cellValue(raw["类型"] ?? raw.kind);
    if (!code && !kind) return;

    const { row, error } = mapRow(raw, line);
    if (error) errors.push(error);
    else if (row) rows.push(row);
  });

  if (!rows.length && !errors.length) {
    errors.push("未解析到有效数据行，请使用官方模板并填写「导入数据」表");
  }
  if (rows.length > 500) {
    errors.push(`共 ${rows.length} 行，超过单次上限 500 行，请拆分文件`);
  }

  return { rows: rows.slice(0, 500), errors };
}
