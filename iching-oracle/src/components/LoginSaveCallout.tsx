import { Cloud, HardDrive } from "lucide-react";

type Props = {
  variant?: "default" | "compact";
  className?: string;
};

/** 登录页 / 问卜前：说明为何要登录保存 */
export function LoginSaveCallout({ variant = "default", className = "" }: Props) {
  if (variant === "compact") {
    return (
      <p
        className={`rounded-md border border-[var(--gold)]/35 bg-[var(--bagua-active-bg)]/50 px-3 py-2 text-xs leading-relaxed text-foreground ${className}`}
      >
        <strong className="font-medium">建议登录或注册</strong>：卦象与解读会保存到云端，换手机也能继续查看。
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--gold)]/35 bg-gradient-to-br from-[var(--bagua-active-bg)]/90 to-card/40 px-4 py-3.5 ${className}`}
    >
      <p className="text-sm font-medium text-foreground">登录后，卦象才真正「存得住」</p>
      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <Cloud size={14} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
          <span>
            <strong className="font-medium text-foreground">注册 / 登录</strong>
            ：解读记录自动云端保存，换设备登录即可同步。
          </span>
        </li>
        <li className="flex gap-2">
          <HardDrive size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <strong className="font-medium text-foreground">游客试用</strong>
            ：仅保存在本浏览器；清缓存或换机可能丢失。
          </span>
        </li>
      </ul>
    </div>
  );
}
