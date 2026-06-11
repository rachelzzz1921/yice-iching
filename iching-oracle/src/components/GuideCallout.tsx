import { cn } from "@/lib/utils";

export function GuideAside({
  children,
  reverse,
  className,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--gold)]/20 bg-secondary/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground",
        reverse && "text-right",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GuideStage({
  title,
  hint,
  className,
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-4 text-center", className)}>
      <div>
        <p className="font-serif-cjk text-sm font-medium text-foreground">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
