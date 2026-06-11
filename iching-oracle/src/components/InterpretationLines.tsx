import type { InterpretLine } from "@/lib/interpret-format";

type Props = {
  lines: InterpretLine[];
  /** overview 段在每条前显示小标题；dimension 段仅对带 label 的行显示 */
  variant?: "overview" | "dimension";
};

/** 按后端 lines 渲染，不用嵌套卡片 */
export function InterpretationLines({ lines, variant = "dimension" }: Props) {
  if (lines.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line, i) => (
        <li key={i}>
          {line.label && variant === "overview" ? (
            <p className="mb-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground">
              {line.label}
            </p>
          ) : line.label ? (
            <p className="text-[13px] leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground/75">{line.label}：</span>
              {line.text}
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-foreground/90">{line.text}</p>
          )}
          {line.label && variant === "overview" ? (
            <p className="text-[13px] leading-relaxed text-foreground/90">{line.text}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
