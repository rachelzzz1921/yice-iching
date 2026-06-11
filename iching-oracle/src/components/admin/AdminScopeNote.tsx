type Props = {
  note?: string;
};

export function AdminScopeNote({ note }: Props) {
  const text =
    note ||
    "后台仅统计已写入服务器的用户与起卦。本机「离线游客」的数据在浏览器里，不会自动出现在此处。";

  return (
    <p className="mb-4 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}
