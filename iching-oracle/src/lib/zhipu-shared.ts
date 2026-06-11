import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
export const ZHIPU_DEFAULT_MODEL = "glm-4.5-air";

type ZhipuUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type DailyUsageStats = {
  date: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

let dailyStats: DailyUsageStats = createEmptyDailyStats();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyDailyStats(): DailyUsageStats {
  return {
    date: todayKey(),
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

function resetDailyStatsIfNeeded() {
  if (dailyStats.date !== todayKey()) {
    dailyStats = createEmptyDailyStats();
  }
}

/** 控制台查看当日智谱 token 累计（进程内，重启 dev server 会清零） */
export function getZhipuDailyUsage(): Readonly<DailyUsageStats> {
  resetDailyStatsIfNeeded();
  return dailyStats;
}

function logZhipuUsage(usage: ZhipuUsage | undefined, model: string, purpose = "chat") {
  resetDailyStatsIfNeeded();
  dailyStats.calls += 1;

  const prompt = usage?.prompt_tokens ?? 0;
  const completion = usage?.completion_tokens ?? 0;
  const total = usage?.total_tokens ?? prompt + completion;

  if (usage) {
    dailyStats.promptTokens += prompt;
    dailyStats.completionTokens += completion;
    dailyStats.totalTokens += total;
  }

  const callLine =
    usage != null
      ? `本次 ${total} tokens（输入 ${prompt} + 输出 ${completion}）`
      : "本次 tokens 未返回";

  console.log(
    `[云端AI消耗] ${purpose} · ${callLine} · 今日累计 ${dailyStats.calls} 次 / ${dailyStats.totalTokens} tokens`,
  );
}

let resolvedKey: string | null | undefined;

function parseEnvValue(raw: string, key: string): string | undefined {
  const re = new RegExp(`^${key}=(.*)$`, "m");
  const m = raw.match(re);
  if (!m) return undefined;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function readKeyFromFile(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const val = parseEnvValue(readFileSync(path, "utf8"), "ZHIPU_API_KEY");
    return val?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** 解析智谱 Key：process.env → iching-oracle/.env →  monorepo deploy/.env.prod（仅开发） */
export function getZhipuApiKey(): string | undefined {
  if (resolvedKey !== undefined) return resolvedKey || undefined;

  const fromEnv = process.env.ZHIPU_API_KEY?.trim();
  if (fromEnv) {
    resolvedKey = fromEnv;
    return fromEnv;
  }
  if (process.env.ZHIPU_API_KEY !== undefined && !fromEnv) {
    delete process.env.ZHIPU_API_KEY;
  }

  const roots = new Set<string>([process.cwd()]);
  try {
    roots.add(dirname(fileURLToPath(import.meta.url)));
  } catch {
    /* ignore */
  }

  const envRelPaths = [
    ".env",
    "iching-oracle/.env",
    "../iching-oracle/.env",
    "../../iching-oracle/.env",
    "../deploy/.env.prod",
    "deploy/.env.prod",
  ];

  for (const root of roots) {
    for (const rel of envRelPaths) {
      const local = readKeyFromFile(join(root, rel));
      if (local) {
        process.env.ZHIPU_API_KEY = local;
        resolvedKey = local;
        return local;
      }
    }
  }

  resolvedKey = null;
  return undefined;
}

export function isZhipuEnabled(): boolean {
  return Boolean(getZhipuApiKey());
}

export function getZhipuModel(): string {
  return process.env.ZHIPU_MODEL?.trim() || ZHIPU_DEFAULT_MODEL;
}

/** 全 AI 解读专用模型（默认 flash；与 ZHIPU_MODEL 分离，避免误用 4.5-air 导致长时间等待） */
export function getZhipuFullAiModel(): string {
  const full = process.env.ZHIPU_FULL_AI_MODEL?.trim();
  if (full) return full;
  return "glm-4-flash";
}

export type ZhipuChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
};

export async function callZhipuChat(
  system: string,
  user: string,
  options?: ZhipuChatOptions,
): Promise<string> {
  return callZhipuChatMessages(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    options,
  );
}

type ChatRole = "system" | "user" | "assistant";

export async function callZhipuChatMessages(
  messages: { role: ChatRole; content: string }[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    model?: string;
  },
): Promise<string> {
  const apiKey = getZhipuApiKey();
  if (!apiKey) throw new Error("未配置云端 AI 密钥");

  const timeoutMs = options?.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(ZHIPU_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model ?? getZhipuModel(),
        max_tokens: options?.maxTokens ?? 3200,
        temperature: options?.temperature ?? 0.65,
        messages,
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`AI 服务响应超时（${Math.round(timeoutMs / 1000)}s），请稍后重试`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: ZhipuUsage;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data?.error?.message || res.statusText || "AI 服务暂时不可用，请稍后重试");
  }

  const model = options?.model ?? getZhipuModel();
  logZhipuUsage(data.usage, model);

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI 未返回有效内容");
  return raw;
}
