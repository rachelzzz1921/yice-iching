/**
 * 从 open-iching 开源数据生成 guaci-db.generated.ts
 * 数据源：https://github.com/john-walks-slow/open-iching (MIT)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const iching = JSON.parse(readFileSync(join(root, "source-iching.json"), "utf8"));
const xiang = JSON.parse(readFileSync(join(root, "source-xiang.json"), "utf8"));
const tuan = JSON.parse(readFileSync(join(root, "source-tuan.json"), "utf8"));
/** 手工校对 10 卦，来源：files/guaci.js */
const overrides = JSON.parse(readFileSync(join(root, "guaci-overrides.json"), "utf8"));

/** @typedef {{ id: number; name: string; char: string; guaci: string; tuanci: string; xiangci: string; yaoci: { position: string; text: string; xiang: string }[] }} GuaciEntry */

/** @type {Record<number, GuaciEntry>} */
const db = {};

for (const g of iching) {
  const hexKey = `iching__${g.id}`;
  const yaoci = g.lines
    .filter((l) => l.id >= 1 && l.id <= 6)
    .map((l) => {
      const lineKey = `iching__${g.id}_${l.id}`;
      return {
        position: l.name,
        text: l.scripture,
        xiang: xiang[lineKey] ?? "",
      };
    });

  db[g.id] = {
    id: g.id,
    name: g.name,
    char: g.symbol,
    guaci: g.scripture,
    tuanci: tuan[hexKey] ?? "",
    xiangci: xiang[hexKey] ?? "",
    yaoci,
  };
}

let overrideCount = 0;
for (const [idStr, patch] of Object.entries(overrides)) {
  const id = Number(idStr);
  if (!db[id]) continue;
  db[id] = {
    ...db[id],
    ...patch,
    id: db[id].id,
    char: db[id].char,
    yaoci: patch.yaoci ?? db[id].yaoci,
  };
  overrideCount += 1;
}

const out = `/**
 * 六十四卦卦辞库（自动生成，勿手改）
 * 数据源：open-iching · iching.json + tuan.json + xiang.json
 * 覆盖：scripts/guaci-overrides.json（${overrideCount} 卦，校对自 files/guaci.js）
 * 生成：node scripts/build-guaci-db.mjs
 */

export type GuaciEntry = {
  id: number;
  name: string;
  char: string;
  guaci: string;
  tuanci: string;
  xiangci: string;
  yaoci: { position: string; text: string; xiang: string }[];
};

export const GUACI_DB: Record<number, GuaciEntry> = ${JSON.stringify(db, null, 2)};

export const HEX_NAME_TO_ID: Record<string, number> = {
  ...Object.fromEntries(Object.values(GUACI_DB).map((g) => [g.name, g.id])),
  坎: 29,
};
`;

writeFileSync(join(root, "../src/lib/guaci-db.generated.ts"), out, "utf8");

const backendJsonPath = join(root, "../../backend/src/data/guaci-db.json");
writeFileSync(backendJsonPath, JSON.stringify(db, null, 2), "utf8");

console.log(
  `Generated ${Object.keys(db).length} hexagrams (${overrideCount} curated overrides) → src/lib/guaci-db.generated.ts, backend/src/data/guaci-db.json`,
);
