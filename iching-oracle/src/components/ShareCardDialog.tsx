import { useRef, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HexagramShareCard } from "@/components/HexagramShareCard";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  buildSharePlainText,
  exportElementAsPng,
  sharePngIfSupported,
  type ShareCardData,
} from "@/lib/share-card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData | null;
};

export function ShareCardDialog({ open, onOpenChange, data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"save" | "share" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const filename = data
    ? `易测-${data.benName}卦-${new Date().toISOString().slice(0, 10)}.png`
    : "易测-卦象.png";

  const handleSave = async () => {
    if (!cardRef.current || !data) return;
    setError("");
    setBusy("save");
    try {
      await exportElementAsPng(cardRef.current, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !data) return;
    setError("");
    setBusy("share");
    try {
      const text = buildSharePlainText(data);
      const ok = await sharePngIfSupported(
        cardRef.current,
        `易测 · ${data.benName}卦`,
        text,
      );
      if (!ok) {
        await handleSave();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "分享失败");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCopyText = async () => {
    if (!data) return;
    setError("");
    setBusy("copy");
    try {
      await copyTextToClipboard(buildSharePlainText(data));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="text-sm font-medium">卦象分享卡片</DialogTitle>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            生成一张可保存或分享的卦象图，含本卦、所问与断语摘要。
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-secondary/30 px-4 py-5">
          {data ? (
            <div className="mx-auto w-fit rounded-lg shadow-md">
              <HexagramShareCard ref={cardRef} data={data} />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">暂无卦象数据</p>
          )}
        </div>

        {error ? (
          <p className="border-t border-border px-4 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!data || busy !== null}
            className="flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            <Download size={14} aria-hidden />
            {busy === "save" ? "生成中…" : "保存图片"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!data || busy !== null}
            className="flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-xs text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Share2 size={14} aria-hidden />
            {busy === "share" ? "准备中…" : "分享"}
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            disabled={!data || busy !== null}
            className="btn-surface flex flex-1 min-w-[100px] items-center justify-center gap-1.5 px-3 py-2.5 text-xs"
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? "已复制" : "复制文字"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 打开分享卡片的入口按钮 */
export function ShareCardTriggerButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-surface btn-surface-gold flex flex-1 min-w-[100px] items-center justify-center gap-1 px-3 py-2.5 text-xs"
    >
      <Share2 size={13} className="text-[var(--gold)]" aria-hidden />
      分享卡片
    </button>
  );
}
