import { getGuaciByName } from "@/lib/guaci";
import {
  hexFromYao,
  rekeyHistoryRecord,
  type HistoryRecord,
} from "@/lib/iching";

function isMissingHex(name?: string, char?: string) {
  return !name || name === "?" || !char || char === "?";
}

/** 由 6 爻重算本卦 / 变卦（与 ResultStep 一致） */
export function hexFromYaoPayload(
  yao: NonNullable<HistoryRecord["yao"]>,
): { benName: string; benChar: string; bianName?: string; bianChar?: string } | null {
  if (yao.length !== 6) return null;
  const bits = yao.map((y) => y.yang);
  const ben = hexFromYao(bits);
  if (ben.name === "?" || ben.char === "?") return null;
  const hasChange = yao.some((y) => y.changing);
  if (!hasChange) {
    return { benName: ben.name, benChar: ben.char };
  }
  const changed = bits.map((b, i) => (yao[i].changing ? (b === 1 ? 0 : 1) : b));
  const bian = hexFromYao(changed);
  if (bian.name === "?" || bian.char === "?") {
    return { benName: ben.name, benChar: ben.char };
  }
  return { benName: ben.name, benChar: ben.char, bianName: bian.name, bianChar: bian.char };
}

function resolveHexFromName(rec: HistoryRecord) {
  if (!rec.benName || rec.benName === "?") return null;
  const ben = getGuaciByName(rec.benName);
  if (!ben) return null;
  const bian = rec.bianName && rec.bianName !== "?" ? getGuaciByName(rec.bianName) : null;
  return {
    benName: ben.name,
    benChar: ben.char,
    bianName: bian?.name ?? rec.bianName,
    bianChar: bian?.char ?? rec.bianChar,
  };
}

function resolveHexFromFacts(rec: HistoryRecord) {
  const ben = rec.facts?.benGua;
  if (!ben?.name || !ben?.char) return null;
  const bian = rec.facts?.bianGua;
  return {
    benName: ben.name,
    benChar: ben.char,
    bianName: bian?.name ?? rec.bianName,
    bianChar: bian?.char ?? rec.bianChar,
  };
}

/** 列表 / 详情展示前补全缺失卦名（云端旧数据或跳步导致） */
export function normalizeHistoryRecord(rec: HistoryRecord): HistoryRecord {
  if (isMissingHex(rec.benName, rec.benChar)) {
    const fromFacts = resolveHexFromFacts(rec);
    const fromYao = rec.yao?.length === 6 ? hexFromYaoPayload(rec.yao) : null;
    const fromName = fromYao || fromFacts ? null : resolveHexFromName(rec);
    const resolved = fromFacts ?? fromYao ?? fromName;
    if (!resolved) return rec;
    return {
      ...rec,
      benName: resolved.benName,
      benChar: resolved.benChar,
      bianName: resolved.bianName ?? rec.bianName,
      bianChar: resolved.bianChar ?? rec.bianChar,
    };
  }
  if ((!rec.benChar || rec.benChar === "?") && rec.benName) {
    const fromName = resolveHexFromName(rec);
    if (fromName) {
      return {
        ...rec,
        benChar: fromName.benChar,
        bianChar: fromName.bianChar ?? rec.bianChar,
      };
    }
  }
  return rec;
}

/** 云端列表与本地档案合并：同题相近时间优先保留有卦象的一条 */
export function mergeHistoryRecords(
  remote: HistoryRecord[],
  local: HistoryRecord[],
): HistoryRecord[] {
  const byId = new Map<string, HistoryRecord>();
  const pickBetter = (a: HistoryRecord, b: HistoryRecord) => {
    const aOk = !isMissingHex(a.benName, a.benChar);
    const bOk = !isMissingHex(b.benName, b.benChar);
    if (aOk && !bOk) return a;
    if (bOk && !aOk) return b;
    return a.createdAt >= b.createdAt ? a : b;
  };

  for (const r of remote.map(normalizeHistoryRecord)) {
    byId.set(r.id, r);
  }

  for (const raw of local) {
    const l = normalizeHistoryRecord(raw);
    const existing = byId.get(l.id);
    if (existing) {
      byId.set(l.id, pickBetter(existing, l));
      continue;
    }
    const near = [...byId.values()].find(
      (r) =>
        r.question === l.question &&
        Math.abs(r.createdAt - l.createdAt) < 5 * 60 * 1000,
    );
    if (near) {
      const picked = pickBetter(near, l);
      byId.set(near.id, { ...picked, id: near.id });
      if (l.id !== near.id && !isMissingHex(picked.benName, picked.benChar)) {
        rekeyHistoryRecord(l.id, near.id);
      }
    } else {
      byId.set(l.id, l);
    }
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

function historyDayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * 同日同题多次重试：列表只保留最新一条完整卦象，隐藏无效重复项。
 */
export function compressHistoryList(items: HistoryRecord[]): HistoryRecord[] {
  const sorted = [...items]
    .map(normalizeHistoryRecord)
    .sort((a, b) => b.createdAt - a.createdAt);
  const groups = new Map<string, HistoryRecord[]>();

  for (const r of sorted) {
    const key = `${r.category}|${r.question.trim()}|${historyDayKey(r.createdAt)}`;
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }

  const out: HistoryRecord[] = [];
  for (const group of groups.values()) {
    const good = group.filter((r) => !isMissingHex(r.benName, r.benChar));
    out.push(good[0] ?? group[0]);
  }

  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export function isHistoryRecordComplete(rec: HistoryRecord) {
  const n = normalizeHistoryRecord(rec);
  return !isMissingHex(n.benName, n.benChar);
}
