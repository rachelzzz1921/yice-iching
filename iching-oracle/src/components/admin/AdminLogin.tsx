import { useState } from "react";
import { ApiError } from "@/lib/api";
import { adminLogin, setAdminToken } from "@/lib/admin-api";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const { token } = await adminLogin(password);
      setAdminToken(token);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h2 className="font-serif-cjk text-xl font-medium text-foreground">管理员登录</h2>
      <p className="mt-2 text-sm text-muted-foreground">请输入后台密码进入管理面板。</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-xs text-muted-foreground">
            密码
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
          />
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-gold w-full py-2.5 text-sm">
          {pending ? "验证中…" : "进入后台"}
        </button>
      </form>
    </div>
  );
}
