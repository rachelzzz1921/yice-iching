import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { FollowUpPersonaSwitch } from "@/components/FollowUpPersonaSwitch";
import { useDevice } from "@/hooks/use-device";
import { AI_PROVIDER_LABEL, aiFollowUpDisabledHint, sanitizeAiUserError } from "@/lib/ai-branding";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { followUpChat } from "@/lib/interpret.functions";
import type { InterpretFollowUpHints } from "@/lib/common-questions";
import type { InterpretFacts } from "@/lib/interpret-facts";
import { CATEGORIES, type CategoryId } from "@/lib/iching";
import type { CastMethod } from "@/lib/profile";
import {
  loadFollowUpPersona,
  saveFollowUpPersona,
  type FollowUpPersona,
} from "@/lib/follow-up-persona";

export type FollowUpContext = {
  category: CategoryId;
  question: string;
  benName: string;
  bianName: string | null;
  changingLine: number;
  interpretation: string;
  castMethod?: CastMethod;
  yao?: { yang: 0 | 1; changing: boolean; label?: string }[];
  facts?: InterpretFacts | null;
};

type ChatMessage = { role: "user" | "assistant"; content: string; isError?: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: FollowUpContext;
  /** 未配置 Key 时为 false，禁用发送 */
  aiEnabled?: boolean;
  /** 常见问题库匹配的问候与推荐追问 */
  followUpHints?: InterpretFollowUpHints | null;
  /** 从结果页 chip 带入的首条追问 */
  initialMessage?: string | null;
  /** 打开对话框时自动发送 initialMessage */
  autoSubmitInitial?: boolean;
  /** 受控人格（与结果页切换同步） */
  persona?: FollowUpPersona;
  onPersonaChange?: (persona: FollowUpPersona) => void;
};

const SUGGESTIONS: Record<CategoryId, string[]> = {
  career: ["下一步具体怎么做？", "现在适合动吗？", "我该往哪个方向找？", "最坏会怎样？"],
  family: ["家里谁先松口比较有利？", "这是暂时还是结构性问题？", "7天内我该做哪一步？", "这段时间最忌什么？"],
  relationship: ["对方到底是什么态度？", "我该不该主动？", "还要等多久？", "最大的障碍是什么？"],
  health: ["大概多久能好转？", "我现在最该先做什么？", "有什么需要特别注意？", "要不要去看医生？"],
  fate: ["两个选项怎么选？", "最大的风险在哪？", "能不能先小步试？", "什么时候做决定？"],
};

export function FollowUpChatDialog({
  open,
  onOpenChange,
  ctx,
  aiEnabled = true,
  followUpHints,
  initialMessage,
  autoSubmitInitial = false,
  persona: personaProp,
  onPersonaChange,
}: Props) {
  const { isMobile } = useDevice();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [internalPersona, setInternalPersona] = useState<FollowUpPersona>(() => loadFollowUpPersona());
  const autoSentRef = useRef<string | null>(null);

  const persona = personaProp ?? internalPersona;

  const selectPersona = (next: FollowUpPersona) => {
    onPersonaChange?.(next);
    if (personaProp === undefined) {
      setInternalPersona(next);
      saveFollowUpPersona(next);
    } else {
      saveFollowUpPersona(next);
    }
  };

  const catLabel = CATEGORIES.find((c) => c.id === ctx.category)?.label ?? ctx.category;
  const chips = useMemo(() => {
    if (followUpHints?.suggestions?.length) return followUpHints.suggestions;
    return SUGGESTIONS[ctx.category];
  }, [followUpHints, ctx.category]);

  const emptyIntro =
    followUpHints?.greeting ??
    "继续问具体的事——我会结合这次卦象、上面的解读和对话历史，直接回答你。";

  const mut = useMutation({
    mutationFn: (payload: {
      userMessage: string;
      history: ChatMessage[];
      persona: FollowUpPersona;
    }) =>
      followUpChat({
        data: {
          ...ctx,
          history: payload.history
            .filter((m) => !m.isError)
            .map(({ role, content }) => ({ role, content })),
          userMessage: payload.userMessage,
          facts: ctx.facts ?? undefined,
          persona: payload.persona,
        },
      }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    },
    onError: (err) => {
      const raw = err instanceof Error ? err.message : "发送失败，请稍后再试";
      const msg = sanitizeAiUserError(raw);
      setMessages((prev) => [...prev, { role: "assistant", content: msg, isError: true }]);
    },
  });

  const canSend = aiEnabled && !mut.isPending;

  const submit = (text: string) => {
    const v = text.trim();
    if (!v || mut.isPending || !aiEnabled) return;

    const historyForApi = messages.filter((m) => !m.isError);
    setMessages((prev) => [...prev, { role: "user", content: v }]);
    setInput("");
    mut.mutate({ userMessage: v, history: historyForApi, persona });
  };

  const send = () => submit(input);

  useEffect(() => {
    if (!open) {
      autoSentRef.current = null;
      return;
    }
    const seed = initialMessage?.trim();
    if (!seed || !autoSubmitInitial || !aiEnabled) return;
    if (autoSentRef.current === seed) return;
    autoSentRef.current = seed;
    submit(seed);
  }, [open, initialMessage, autoSubmitInitial, aiEnabled, persona]);

  useEffect(() => {
    if (!open) return;
    const seed = initialMessage?.trim();
    if (seed && !autoSubmitInitial) setInput(seed);
  }, [open, initialMessage, autoSubmitInitial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex h-[min(80vh,640px)] max-h-[80vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg${isMobile ? " mobile-sheet-dialog" : ""}`}
      >
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            深入追问
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bagua-active-bg)] px-1.5 py-0.5 text-[9px] font-normal tracking-wider text-[var(--gold)]">
              <Sparkles size={9} aria-hidden />
              {AI_PROVIDER_LABEL}
            </span>
          </DialogTitle>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {ctx.benName}卦{ctx.bianName ? ` → ${ctx.bianName}` : ""} · {catLabel} · {ctx.question}
          </p>
          <FollowUpPersonaSwitch
            className="mt-2.5 border-0 bg-transparent px-0 py-0"
            value={persona}
            onChange={selectPersona}
            showHint={false}
            compact
          />
        </DialogHeader>

        <div
          className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          aria-live="polite"
          aria-busy={mut.isPending}
        >
          {!aiEnabled && (
            <p className="rounded-lg border border-[var(--gold)]/25 bg-[var(--bagua-active-bg)]/40 px-3 py-2.5 text-[12px] leading-relaxed text-foreground/85">
              {aiFollowUpDisabledHint()}
            </p>
          )}

          {messages.length === 0 && aiEnabled && !mut.isPending && (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-foreground/85">{emptyIntro}</p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => submit(chip)}
                    disabled={!canSend}
                    className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-foreground/80 transition hover:bg-secondary disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}-${m.content.slice(0, 12)}`}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] break-words whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-foreground text-background"
                    : m.isError
                      ? "rounded-bl-md border border-destructive/30 bg-destructive/10 text-destructive"
                      : "rounded-bl-md border border-border/60 bg-secondary/40 text-foreground/90"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {mut.isPending && (
            <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
              <Loader2 className="animate-spin" size={14} aria-hidden />
              正在结合卦象想怎么答…
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          {messages.length > 0 && aiEnabled && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {chips.slice(0, 3).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => submit(chip)}
                  disabled={!canSend}
                  className="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="follow-up-input" className="sr-only">
              追问内容
            </label>
            <input
              id="follow-up-input"
              name="followUp"
              autoComplete="off"
              spellCheck
              value={input}
              disabled={!aiEnabled}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
              }}
              placeholder={aiEnabled ? "继续问…" : "云端大模型接入后可追问"}
              className="input-field flex-1 py-2 text-[13px] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || !canSend}
              aria-label="发送追问"
              className="rounded-md bg-foreground px-3 py-2 text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} aria-hidden />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
