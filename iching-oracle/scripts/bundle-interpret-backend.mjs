/**
 * 将本地解读引擎打包到 backend（CommonJS）
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const entry = join(root, "../src/lib/interpret.entry.ts");
const outfile = join(root, "../../backend/src/services/interpret.bundle.cjs");

await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  packages: "bundle",
  sourcemap: false,
  logLevel: "info",
});

console.log(`Bundled interpret engine → ${outfile}`);
