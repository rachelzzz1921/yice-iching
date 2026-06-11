import type { ReactNode } from "react";

type TableProps = {
  children: ReactNode;
  minWidth?: number;
  className?: string;
};

/** 运营后台统一数据表容器：横向滚动、紧凑字号 */
export function AdminDataTable({ children, minWidth = 720, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
      <table className="w-full text-left text-xs" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] border-b border-border bg-secondary/90 text-muted-foreground backdrop-blur-sm">
      {children}
    </thead>
  );
}

export function AdminTableHeadCell({
  children,
  className = "",
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`whitespace-nowrap px-3 py-2 font-medium ${alignClass} ${className}`}>
      {children}
    </th>
  );
}

export function AdminTableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
