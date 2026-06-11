import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FlaskConical, Loader2 } from "lucide-react";
import { InterpretationView } from "@/components/InterpretationView";
import { formatInterpretValidationError } from "@/lib/interpret-input-schema";
import { zhipuTestGenerate } from "@/lib/interpret.functions";
import type { InterpretInput } from "@/lib/interpret.local";
import { AI_PROVIDER_LABEL, sanitizeAiUserError } from "@/lib/ai-branding";
import type { ZhipuTestBlock } from "@/lib/zhipu-generate";

const CLIENT_TIMEOUT_MS = 60_000;

type Props = {
  input: InterpretInput;
  aiEnabled?: boolean;
};

function buildServerInput(input: InterpretInput): InterpretInput {
  return {
    ...input,
    yao: input.yao?.length === 6 ? input.yao : undefined,
  };
}

function withClientTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** 全 AI 解读（按需加载，不阻塞上方本地解读） */
export function ZhipuTestPanel({ input, aiEnabled = false }: Props) {
  const enabled = aiEnabled;
  const [elapsedSec, setElapsedSec] = useState(0);

  const mut = useMutation({
    retry: 0,
    mutationFn: () =>
      withClientTimeout(
        zhipuTestGenerate({ data: buildServerInput(input) }),
        CLIENT_TIMEOUT_MS,
        "全AI解读请求超时（60 秒），请检查网络或稍后重试",
      ),
  });

  const zhipuTest: ZhipuTestBlock | undefined = mut.data;
  const loading = mut.isPending;
  const rpcError = mut.error ? formatInterpretValidationError(mut.error) : null;
  const resultError = zhipuTest?.status === "error" ? zhipuTest.message : null;
  const errorMessage = sanitizeAiUserError(rpcError ?? resultError ?? "");

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [loading]);

  if (!enabled) {
    return (
      <section
        aria-label="云端大模型解读"
        className="mt-2 rounded-xl border border-dashed border-[var(--gold)]/40 bg-[var(--bagua-active-bg)]/30 px-1 py-1"
      >
        <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-3 sm:px-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {import.meta.env.DEV
              ? `开发环境：配置云端 AI 密钥并重启 dev server 后，可对比${AI_PROVIDER_LABEL}解读。`
              : `${AI_PROVIDER_LABEL}解读暂未接入，请稍后再试。`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="全AI解读"
      className="mt-2 rounded-xl border border-dashed border-[var(--gold)]/40 bg-[var(--bagua-active-bg)]/30 px-1 py-1"
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <FlaskConical size={14} className="shrink-0 text-[var(--gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">{AI_PROVIDER_LABEL}解读</p>
          <p className="text-[10px] text-muted-foreground">
            {loading
              ? `生成中… 已等待 ${elapsedSec}s（通常 8–20 秒）`
              : zhipuTest?.status === "ok"
                ? `${AI_PROVIDER_LABEL}${zhipuTest.fromCache ? " · 缓存命中" : ""} · 与上方本地解读对比`
                : errorMessage
                  ? "生成失败"
                  : `可选：生成${AI_PROVIDER_LABEL}版解读`}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--gold)]/30 px-2 py-0.5 text-[9px] tracking-wider text-[var(--gold)]">
          AI
        </span>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-3 sm:px-4">
        {!zhipuTest && !loading && !errorMessage && (
          <button
            type="button"
            onClick={() => mut.mutate()}
            className="w-full rounded-md border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)] py-2.5 text-xs text-[var(--gold)] transition hover:border-[var(--gold)]/55"
          >
            {`生成${AI_PROVIDER_LABEL}解读`}
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              全AI解读生成中…
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              若超过 60 秒将自动停止，可点重试；同卦同问 1 小时内再次生成会走缓存
            </p>
          </div>
        )}

        {errorMessage && !loading && (
          <div className="space-y-2">
            <p className="text-[13px] leading-relaxed text-destructive" role="alert">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => mut.mutate()}
              className="text-xs text-[var(--gold)] underline-offset-2 hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {zhipuTest?.status === "ok" && zhipuTest.result && (
          <InterpretationView
            text={zhipuTest.result.text}
            sections={zhipuTest.result.sections}
            animate={false}
          />
        )}
      </div>
    </section>
  );
}
