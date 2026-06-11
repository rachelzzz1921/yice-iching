import { useEffect } from "react";
import { initPwaInstallListener, registerServiceWorker } from "@/lib/install-app";

/** 注册 PWA Service Worker 并监听 Android 安装提示 */
export function PwaBootstrap() {
  useEffect(() => {
    registerServiceWorker();
    return initPwaInstallListener();
  }, []);
  return null;
}
