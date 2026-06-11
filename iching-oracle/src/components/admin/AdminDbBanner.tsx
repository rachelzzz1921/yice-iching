import { useState } from "react";
import { adminStartDatabase } from "@/lib/admin-api";
import { formatAdminError } from "./admin-utils";

type Props = {
  databaseOk: boolean | null;
  databaseError?: string | null;
  onStarted?: () => void;
};

export function AdminDbBanner({ databaseOk, databaseError, onStarted }: Props) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (databaseOk !== false) return null;

  const startDb = async () => {
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const res = await adminStartDatabase();
      setStatus(res.message);
      onStarted?.();
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="mb-4 rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      <p className="font-medium">数据库未连接，运营数据无法加载</p>
      <p className="mt-1 text-xs leading-relaxed opacity-90">
        {databaseError ||
          "请确认 Postgres 已启动，且 backend/.env 中 DATABASE_URL 正确。"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startDb}
          disabled={pending}
          className="btn-gold px-4 py-2 text-xs disabled:opacity-50"
        >
          {pending ? "正在启动…" : "启动数据库（Docker）"}
        </button>
        <button
          type="button"
          onClick={() => onStarted?.()}
          disabled={pending}
          className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          检查连接
        </button>
      </div>
      {status && (
        <p className="mt-2 text-xs text-foreground" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
