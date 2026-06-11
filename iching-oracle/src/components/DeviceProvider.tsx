import { useEffect, type ReactNode } from "react";
import { applyDeviceModeToDocument, detectDeviceMode, subscribeDeviceMode } from "@/lib/device";

/** 同步 html[data-device]，供 CSS 与首屏 inline script 对齐 */
export function DeviceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sync = () => applyDeviceModeToDocument(detectDeviceMode());
    sync();
    return subscribeDeviceMode(sync);
  }, []);

  return children;
}
