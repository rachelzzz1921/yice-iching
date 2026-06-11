/** 复制到剪贴板（HTTP 等非安全上下文下回退到 execCommand） */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through */
    }
  }

  if (typeof document === "undefined") {
    throw new Error("当前环境不支持复制");
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);

  const ok = document.execCommand("copy");
  document.body.removeChild(ta);

  if (!ok) {
    throw new Error("复制失败，请长按手动选择文字复制");
  }
}
