import { useEffect, useState } from "react";
import { adminFetchHealth, adminRunDatabaseMigrate, type AdminHealth } from "@/lib/admin-api";
import {
  AdminDataTable,
  AdminTableHead,
  AdminTableHeadCell,
} from "./AdminDataTable";
import { formatAdminError, isAdminAuthError } from "./admin-utils";

export function AdminSystemTab({
  refreshKey,
  databaseOk,
  onAuthError,
  onMigrated,
}: {
  refreshKey: number;
  databaseOk: boolean | null;
  onAuthError: () => void;
  onMigrated?: () => void;
}) {
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [error, setError] = useState("");
  const [migrateMsg, setMigrateMsg] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await adminFetchHealth();
        if (!cancelled) {
          setHealth(h);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          if (isAdminAuthError(err)) {
            onAuthError();
            return;
          }
          setError(formatAdminError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onAuthError]);

  const runMigrate = async () => {
    if (databaseOk === false) return;
    if (!confirm("同步会员/订单表结构与起卦计数触发器？此操作可重复执行，不会删除已有数据。")) return;
    setMigrating(true);
    setMigrateMsg("");
    setError("");
    try {
      const res = await adminRunDatabaseMigrate();
      setMigrateMsg(res.message);
      onMigrated?.();
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(formatAdminError(err));
    } finally {
      setMigrating(false);
    }
  };

  if (!health && !error) {
    return <p className="text-sm text-muted-foreground">检查系统状态…</p>;
  }

  const uptimeMin = health ? Math.floor(health.uptimeSec / 60) : 0;

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {health && (
        <AdminDataTable minWidth={480}>
          <AdminTableHead>
            <tr>
              <AdminTableHeadCell>检查项</AdminTableHeadCell>
              <AdminTableHeadCell>状态</AdminTableHeadCell>
              <AdminTableHeadCell>说明</AdminTableHeadCell>
            </tr>
          </AdminTableHead>
          <tbody>
            {[
              {
                label: "数据库",
                ok: health.database,
                hint: health.database ? "已连接" : health.databaseError || "未连接",
              },
              {
                label: "会员表结构",
                ok: !!health.membershipReady,
                hint: health.membershipReady ? "就绪" : "需同步结构",
              },
              {
                label: "Redis 缓存",
                ok: health.redisEnabled ? !!health.redis : true,
                hint: health.redisEnabled ? (health.redis ? "已连接" : "异常") : "未启用",
              },
              {
                label: "管理密码",
                ok: health.adminPasswordConfigured,
                hint: health.adminPasswordConfigured ? "已配置" : "未配置",
              },
              {
                label: "云端 AI",
                ok: health.zhipuConfigured,
                hint: health.zhipuConfigured ? "已接入" : "纯本地解读",
              },
              {
                label: "微信支付",
                ok: !!health.wechatPayEnabled,
                hint: health.wechatPayEnabled
                  ? "已配置"
                  : health.allowMockPay
                    ? "未配置 · 可用模拟支付"
                    : "未配置",
              },
              { label: "进程运行", ok: true, hint: `${uptimeMin} 分钟` },
              ...(health.corsOrigin
                ? [{ label: "CORS", ok: true, hint: health.corsOrigin }]
                : []),
            ].map((row) => (
              <tr key={row.label} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.label}</td>
                <td className={`whitespace-nowrap px-3 py-2 ${row.ok ? "text-foreground" : "text-destructive"}`}>
                  {row.ok ? "正常" : "异常"}
                </td>
                <td className="max-w-[280px] break-all px-3 py-2 text-muted-foreground">{row.hint}</td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
      )}

      {databaseOk && (
        <section className="mt-5 rounded-lg border border-border bg-card/60 p-4">
          <h3 className="text-sm font-medium text-foreground">数据库维护</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            创建或补齐会员、兑换码、订单表，并同步用户起卦计数触发器。可安全重复执行，不会清空用户或起卦记录。
          </p>
          <button
            type="button"
            onClick={runMigrate}
            disabled={migrating}
            className="mt-3 rounded-lg border border-[var(--gold)]/35 px-4 py-2 text-xs text-[var(--gold)] disabled:opacity-50"
          >
            {migrating ? "同步中…" : "同步数据库结构"}
          </button>
          {migrateMsg && (
            <p className="mt-2 text-xs text-[var(--success)]" role="status">
              {migrateMsg}
            </p>
          )}
        </section>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        删除起卦、调整用户套餐等写操作请在对应标签页进行。兑换码与兑换记录不可删除，仅可修改备注与过期时间。
      </p>
    </div>
  );
}
