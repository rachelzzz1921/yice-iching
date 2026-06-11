import { apiSyncLocalHistory, isOfflineGuestToken } from "@/lib/api";
import { isRecoverableApiFailure } from "@/lib/api-errors";
import { loadHistory } from "@/lib/iching";

let syncing = false;

/** 将本机 localStorage 卦象历史上传到服务器（在线游客/会员） */
export async function syncLocalHistoryToServer(): Promise<void> {
  if (typeof window === "undefined") return;
  if (isOfflineGuestToken()) return;
  if (syncing) return;

  const records = loadHistory();
  if (!records.length) return;

  syncing = true;
  try {
    await apiSyncLocalHistory(records);
  } catch (e) {
    if (!isRecoverableApiFailure(e)) throw e;
  } finally {
    syncing = false;
  }
}
