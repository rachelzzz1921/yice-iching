import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDevice } from "@/hooks/use-device";

type Props = {
  triggerLabel: string;
  children: ReactNode;
};

function SiteMenuPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <nav
      className="site-menu-panel-body flex flex-col gap-2 p-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      {children}
    </nav>
  );
}

export function SiteMenu({ triggerLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const { isDesktop } = useDevice();

  const close = () => setOpen(false);

  const trigger = (
    <button
      type="button"
      className="site-menu-trigger"
      aria-label={triggerLabel}
      aria-expanded={open}
      onClick={isDesktop ? undefined : () => setOpen(true)}
    >
      <Menu size={18} strokeWidth={1.75} className="shrink-0 opacity-65" aria-hidden />
      <span className="site-menu-trigger-text truncate">{triggerLabel}</span>
    </button>
  );

  const panel = (
    <>
      <div className="site-menu-popover-head border-b border-border px-3 py-2">
        <p className="font-serif-cjk text-sm font-medium text-foreground">导航</p>
      </div>
      <SiteMenuPanel onClose={close}>{children}</SiteMenuPanel>
    </>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="site-menu-popover gap-0 p-0">
          {panel}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="site-menu-sheet gap-0 p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border px-4 py-2.5 text-left">
            <DialogTitle className="font-serif-cjk text-base font-medium">导航</DialogTitle>
          </DialogHeader>
          <SiteMenuPanel onClose={close}>{children}</SiteMenuPanel>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SiteMenuSection({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="site-menu-section">
      <div className="site-menu-section-head">
        <h3 className="site-menu-section-label">{label}</h3>
        {desc ? <p className="site-menu-section-desc">{desc}</p> : null}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

export function SiteMenuItem({
  to,
  search,
  active,
  hint,
  icon,
  className,
  children,
}: {
  to: string;
  search?: Record<string, unknown>;
  active?: boolean;
  hint?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={`site-menu-item${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      data-active={active || undefined}
    >
      {icon ? <span className="site-menu-item-icon">{icon}</span> : null}
      {hint ? (
        <span className="site-menu-item-body">
          <span className="site-menu-item-title">{children}</span>
          <span className="site-menu-item-hint">{hint}</span>
        </span>
      ) : (
        <span className="site-menu-item-title">{children}</span>
      )}
    </Link>
  );
}

export function SiteMenuButton({
  onClick,
  children,
  className,
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`site-menu-item${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <span className="site-menu-item-title">{children}</span>
    </button>
  );
}

export function SiteMenuCta({
  to,
  search,
  children,
  className,
}: {
  to: string;
  search?: Record<string, unknown>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} search={search} className={className ?? "site-menu-cta"}>
      {children}
    </Link>
  );
}
