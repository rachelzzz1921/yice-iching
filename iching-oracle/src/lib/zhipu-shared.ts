import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STEP_DEFAULT_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
export const ZHIPU_API_URL =
  process.env.STEP_API_URL?.trim() || process.env.ZHIPU_API_URL?.trim() || STEP_DEFAULT_API_URL;
export const ZHIPU_DEFAULT_MODEL = "deepseek-ai/DeepSeek-V4-Flash";
export const ZHIPU_DEFAULT_FULL_AI_MODEL = "deepseek-ai/DeepSeek-V4-Pro";

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

/** 控制台查看当日云端 AI token 累计（进程内，重启 dev server 会清零） */
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

function readEnvFromFile(path: string, keys: string[]): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = readFileSync(path, "utf8");
    for (const key of keys) {
      const val = parseEnvValue(raw, key);
      if (val?.trim()) return val.trim();
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** 解析云端 AI Key：process.env → iching-oracle/.env → monorepo deploy/.env.prod（仅开发） */
export function getZhipuApiKey(): string | undefined {
  if (resolvedKey !== undefined) return resolvedKey || undefined;

  const fromEnv = process.env.STEP_API_KEY?.trim() || process.env.ZHIPU_API_KEY?.trim();
  if (fromEnv) {
    resolvedKey = fromEnv;
    return fromEnv;
  }
  if (process.env.STEP_API_KEY !== undefined && !process.env.STEP_API_KEY.trim()) {
    delete process.env.STEP_API_KEY;
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
      const local = readEnvFromFile(join(root, rel), ["STEP_API_KEY", "ZHIPU_API_KEY"]);
      if (local) {
        process.env.STEP_API_KEY = local;
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
  return process.env.STEP_MODEL?.trim() || process.env.ZHIPU_MODEL?.trim() || ZHIPU_DEFAULT_MODEL;
}

/** 全 AI 解读专用模型（默认 Pro；与通用 Flash 分离，避免长时间等待） */
export function getZhipuFullAiModel(): string {
  const full = process.env.STEP_FULL_AI_MODEL?.trim() || process.env.ZHIPU_FULL_AI_MODEL?.trim();
  if (full) return full;
  return ZHIPU_DEFAULT_FULL_AI_MODEL;
}

export type ZhipuChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
  /**
   * DeepSeek-V4 默认开思考链，追问会拖到 20s+ 触发超时。
   * 硅基流动用 enable_thinking；关闭后 Flash 通常数秒内返回。
   */
  enableThinking?: boolean;
  /** 瞬时失败重试次数（不含首次），默认 2 */
  retries?: number;
};

type ChatRole = "system" | "user" | "assistant";

type ZhipuApiError = Error & { status?: number; retryable?: boolean };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 529;
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as ZhipuApiError;
  if (e.retryable) return true;
  if (e.name === "AbortError") return true;
  const msg = e.message || "";
  return /超时|timeout|fetch failed|network|ECONNRESET|ETIMEDOUT|socket|暂时不可用|未返回有效内容/i.test(
    msg,
  );
}

async function callZhipuChatMessagesOnce(
  messages: { role: ChatRole; content: string }[],
  options?: ZhipuChatOptions,
): Promise<string> {
  const apiKey = getZhipuApiKey();
  if (!apiKey) throw new Error("未配置云端 AI 密钥");

  const timeoutMs = options?.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // 默认关闭思考链：否则 Flash 也会偶发 30s+，追问表现为「自己断掉」
  const enableThinking = options?.enableThinking === true;

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
        enable_thinking: enableThinking,
        thinking: { type: enableThinking ? "enabled" : "disabled" },
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      const err: ZhipuApiError = new Error(
        `AI 服务响应超时（${Math.round(timeoutMs / 1000)}s），请稍后重试`,
      );
      err.retryable = true;
      throw err;
    }
    const err: ZhipuApiError = e instanceof Error ? e : new Error(String(e));
    err.retryable = true;
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: ZhipuUsage;
    error?: { message?: string };
  };

  if (!res.ok) {
    const err: ZhipuApiError = new Error(
      data?.error?.message || res.statusText || "AI 服务暂时不可用，请稍后重试",
    );
    err.status = res.status;
    err.retryable = isRetryableStatus(res.status);
    throw err;
  }

  const model = options?.model ?? getZhipuModel();
  logZhipuUsage(data.usage, model);

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    const err: ZhipuApiError = new Error("AI 未返回有效内容");
    err.retryable = true;
    throw err;
  }
  return raw;
}

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

export async function callZhipuChatMessages(
  messages: { role: ChatRole; content: string }[],
  options?: ZhipuChatOptions,
): Promise<string> {
  const retries = Math.max(0, options?.retries ?? 2);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callZhipuChatMessagesOnce(messages, options);
    } catch (err) {
      lastError = err;
      const canRetry = attempt < retries && isRetryableError(err);
      if (!canRetry) throw err;
      const delayMs = 400 * 2 ** attempt + Math.floor(Math.random() * 200);
      console.warn(
        `[云端AI] 第 ${attempt + 1} 次失败，${delayMs}ms 后重试：`,
        err instanceof Error ? err.message : err,
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 服务暂时不可用，请稍后重试");
}
