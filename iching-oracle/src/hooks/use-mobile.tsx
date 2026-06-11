import { useDevice } from "@/hooks/use-device";

/** @deprecated 优先使用 useDevice()；保留以兼容 shadcn sidebar 等 */
export function useIsMobile() {
  const { isMobile } = useDevice();
  return isMobile;
}
