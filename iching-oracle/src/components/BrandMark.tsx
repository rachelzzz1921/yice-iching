import { SITE_NAME, SITE_TAGLINE, SLOGAN } from "@/lib/brand";

type Props = {
  /** hero 首页主视觉 · nav 顶栏 · banner 内页条幅 · footer 页脚 · compact 单行 */
  variant?: "hero" | "nav" | "banner" | "footer" | "compact";
  showTagline?: boolean;
  /** nav 顶栏隐藏 slogan（首页顶栏与主文案去重） */
  hideSlogan?: boolean;
  className?: string;
};

/** 全站品牌锁标：易测 + Slogan */
export function BrandMark({
  variant = "compact",
  showTagline,
  hideSlogan = false,
  className = "",
}: Props) {
  const withTagline = showTagline ?? (variant === "hero" || variant === "banner");

  if (variant === "hero") {
    return (
      <div className={`brand-lockup brand-lockup--hero ${className}`.trim()} aria-label={`${SITE_NAME}，${SLOGAN}`}>
        <p className="brand-name brand-name--hero" translate="no">
          {SITE_NAME}
        </p>
        <div className="brand-slogan-rule" aria-hidden />
        <p className="brand-slogan brand-slogan--hero">
          <span className="brand-slogan-em">{SLOGAN}</span>
        </p>
        {withTagline ? (
          <span className="brand-tagline">{SITE_TAGLINE}</span>
        ) : null}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`brand-lockup brand-lockup--banner ${className}`.trim()}>
        <p className="brand-name brand-name--banner" translate="no">
          {SITE_NAME}
        </p>
        <p className="brand-slogan brand-slogan--banner">{SLOGAN}</p>
        {withTagline ? <p className="brand-tagline brand-tagline--inline">{SITE_TAGLINE}</p> : null}
      </div>
    );
  }

  if (variant === "nav") {
    return (
      <span className={`brand-lockup brand-lockup--nav ${className}`.trim()}>
        <span className="brand-name brand-name--nav" translate="no">
          {SITE_NAME}
        </span>
        {!hideSlogan ? <span className="brand-slogan brand-slogan--nav">{SLOGAN}</span> : null}
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <div className={`brand-lockup brand-lockup--footer ${className}`.trim()}>
        <p className="brand-name brand-name--footer" translate="no">
          {SITE_NAME}
        </p>
        <p className="brand-slogan brand-slogan--footer">{SLOGAN}</p>
      </div>
    );
  }

  return (
    <p className={`brand-slogan brand-slogan--compact ${className}`.trim()}>{SLOGAN}</p>
  );
}
