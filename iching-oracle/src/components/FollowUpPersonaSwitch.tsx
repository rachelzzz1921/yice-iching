import { Brain } from "lucide-react";
import { AI_PROVIDER_LABEL } from "@/lib/ai-branding";
import { FOLLOWUP_PERSONA_ORDER, type FollowUpPersona } from "@/lib/follow-up-persona";

export const FOLLOWUP_PERSONA_META: Record<
  FollowUpPersona,
  { label: string; hint: string }
> = {
  master: {
    label: "大师解惑",
    hint: "古风、留白，此卦与时运",
  },
  analyst: {
    label: "知己细语",
    hint: "现代、直接，像冷静的职场顾问",
  },
};

type Props = {
  value: FollowUpPersona;
  onChange: (persona: FollowUpPersona) => void;
  /** 是否显示说明文案 */
  showHint?: boolean;
  /** 紧凑模式（结果页底栏） */
  compact?: boolean;
  className?: string;
};

export function FollowUpPersonaSwitch({
  value,
  onChange,
  showHint = true,
  compact = false,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-lg border border-border/80 bg-secondary/25 px-3 py-2.5 ${className}`}
    >
      {showHint ? (
        <p
          className={`leading-relaxed text-muted-foreground ${
            compact ? "mb-2 text-[10px]" : "mb-2.5 text-[11px]"
          }`}
        >
          <span className="text-foreground/80">深入追问</span>
          由{AI_PROVIDER_LABEL}作答，可随时切换语气
          <span className="text-foreground/60">（从下一句话起生效，上文保留）</span>
        </p>
      ) : null}

      <div className="persona-switch" role="tablist" aria-label="追问语气">
        {FOLLOWUP_PERSONA_ORDER.map((key) => {
          const meta = FOLLOWUP_PERSONA_META[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              title={meta.hint}
              onClick={() => onChange(key)}
              className={`persona-switch-item${active ? " is-active" : ""}${compact ? " persona-switch-item--compact" : ""}`}
            >
              <span className="flex items-center gap-1 text-[11px] font-medium">
                {key === "analyst" ? (
                  <Brain size={12} aria-hidden className="shrink-0" />
                ) : (
                  <span
                    className="font-serif-cjk text-[12px] leading-none"
                    aria-hidden
                  >
                    卦
                  </span>
                )}
                {meta.label}
              </span>
              {!compact ? (
                <span
                  className={`max-w-full truncate text-center text-[9px] font-normal leading-tight ${
                    active ? "text-background/70" : "text-muted-foreground/90"
                  }`}
                >
                  {meta.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function followUpPersonaShortLabel(persona: FollowUpPersona): string {
  return FOLLOWUP_PERSONA_META[persona].label;
}
