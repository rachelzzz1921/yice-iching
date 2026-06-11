import { useEffect, useState } from "react";
import {
  detectDeviceMode,
  isCompactLayout,
  subscribeDeviceMode,
  type DeviceMode,
} from "@/lib/device";

export function useDevice() {
  const [mode, setMode] = useState<DeviceMode>(() =>
    typeof window !== "undefined" ? detectDeviceMode() : "desktop",
  );
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" ? isCompactLayout() : false,
  );

  useEffect(() => {
    const sync = () => {
      setMode(detectDeviceMode());
      setCompact(isCompactLayout());
    };
    sync();
    return subscribeDeviceMode(sync);
  }, []);

  return {
    mode,
    isMobile: mode === "mobile",
    isDesktop: mode === "desktop",
    isCompact: compact,
  };
}
