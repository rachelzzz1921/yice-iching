import { useEffect } from "react";
import { bindRitualAudioUnlock } from "@/lib/ritual-sounds";

/** 全局挂载：首次用户交互解锁 Web Audio */
export function RitualAudioProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => bindRitualAudioUnlock(), []);
  return children;
}
