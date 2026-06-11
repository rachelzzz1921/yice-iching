/** 站点级设备模式：决定交互策略（触控翻页 vs 键鼠滚轮），而非纯布局断点 */
export type DeviceMode = "mobile" | "desktop";

const MOBILE_UA =
  /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i;

/** 可在 SSR 前 inline script 与客户端 hook 中共用的检测逻辑 */
export function detectDeviceMode(): DeviceMode {
  if (typeof window === "undefined") return "desktop";

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hoverCapable = window.matchMedia("(hover: hover)").matches;
  if (finePointer && hoverCapable) return "desktop";

  const touchPrimary = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (touchPrimary) return "mobile";

  const maxTouch = navigator.maxTouchPoints ?? 0;
  if (maxTouch > 0 && window.innerWidth < 768) return "mobile";

  if (maxTouch > 0 && MOBILE_UA.test(navigator.userAgent)) return "mobile";

  return "desktop";
}

export function isCompactLayout(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function applyDeviceModeToDocument(mode: DeviceMode = detectDeviceMode()) {
  document.documentElement.dataset.device = mode;
}

const DEVICE_QUERIES = [
  "(pointer: fine)",
  "(hover: hover)",
  "(hover: none)",
  "(pointer: coarse)",
  "(max-width: 767px)",
] as const;

export function subscribeDeviceMode(onChange: (mode: DeviceMode) => void): () => void {
  const notify = () => onChange(detectDeviceMode());
  const mqls = DEVICE_QUERIES.map((q) => window.matchMedia(q));
  mqls.forEach((mq) => mq.addEventListener("change", notify));
  window.addEventListener("resize", notify, { passive: true });
  window.addEventListener("orientationchange", notify);
  return () => {
    mqls.forEach((mq) => mq.removeEventListener("change", notify));
    window.removeEventListener("resize", notify);
    window.removeEventListener("orientationchange", notify);
  };
}

/** 首屏 inline script：hydration 前写入 data-device，避免样式闪烁 */
export const DEVICE_BOOTSTRAP_SCRIPT = `(function(){try{var m="desktop";if(window.matchMedia("(hover: none) and (pointer: coarse)").matches)m="mobile";else if((navigator.maxTouchPoints||0)>0&&window.innerWidth<768)m="mobile";else if((navigator.maxTouchPoints||0)>0&&/iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent))m="mobile";document.documentElement.dataset.device=m}catch(e){}})();`;
