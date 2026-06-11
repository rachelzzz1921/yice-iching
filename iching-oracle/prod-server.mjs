/**
 * 生产环境 Node 入口：静态资源 + TanStack Start SSR
 */
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serverMod from "./dist/server/server.js";

const app = serverMod.default ?? serverMod;
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
/** 与 nginx `location /api/` 一致：剥掉 /api 前缀后转发到 Express */
const API_UPSTREAM = (process.env.API_UPSTREAM || "http://127.0.0.1:3001").replace(/\/$/, "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, "dist/client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function resolveStaticFile(pathname) {
  const rel = pathname.split("?")[0];
  if (!rel || rel.includes("..")) return null;

  const filePath = path.resolve(CLIENT_ROOT, `.${rel}`);
  if (filePath !== CLIENT_ROOT && !filePath.startsWith(`${CLIENT_ROOT}${path.sep}`)) {
    return null;
  }

  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

async function proxyApiToBackend(req, res, pathname, search) {
  const backendPath = pathname.replace(/^\/api/, "") || "/";
  const target = `${API_UPSTREAM}${backendPath}${search}`;
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val === undefined) continue;
    if (key.toLowerCase() === "host") continue;
    headers.set(key, Array.isArray(val) ? val.join(", ") : val);
  }
  /** @type {RequestInit} */
  const init = { method: req.method, headers };
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    init.body = req;
    // @ts-expect-error Node fetch duplex
    init.duplex = "half";
  }
  const upstream = await fetch(target, init);
  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") res.appendHeader(key, value);
    else res.setHeader(key, value);
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.end(buf);
}

function sendStaticFile(req, res, filePath) {
  const ext = path.extname(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  try {
    const hostHeader = req.headers.host ?? "localhost";
    const url = `http://${hostHeader}${req.url}`;
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (pathname.startsWith("/api/") || pathname === "/api") {
      await proxyApiToBackend(req, res, pathname, parsed.search);
      return;
    }

    const staticFile = resolveStaticFile(pathname);
    if (staticFile && req.method && ["GET", "HEAD"].includes(req.method)) {
      sendStaticFile(req, res, staticFile);
      return;
    }

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val !== undefined) headers.set(key, Array.isArray(val) ? val.join(", ") : val);
    }
    /** @type {RequestInit} */
    const init = { method: req.method, headers };
    if (req.method && !["GET", "HEAD"].includes(req.method)) {
      init.body = req;
      // @ts-expect-error Node fetch duplex
      init.duplex = "half";
    }
    const response = await app.fetch(new Request(url, init));
    res.statusCode = response.status;
    for (const [key, val] of response.headers.entries()) {
      if (key.toLowerCase() === "set-cookie") res.appendHeader(key, val);
      else res.setHeader(key, val);
    }
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("[frontend]", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}).listen(port, host, () => {
  console.log(`[frontend] listening on http://${host}:${port}`);
  console.log(`[frontend] static root: ${CLIENT_ROOT}`);
  console.log(`[frontend] API proxy /api → ${API_UPSTREAM}`);
});
