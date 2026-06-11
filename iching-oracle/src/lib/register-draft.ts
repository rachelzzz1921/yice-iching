const DRAFT_KEY = "iching:registerDraft";

export type RegisterDraft = {
  email: string;
  password: string;
  nickname: string;
  hint?: string;
};

export function saveRegisterDraft(draft: RegisterDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadRegisterDraft(): RegisterDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as RegisterDraft;
    if (!data.email && !data.password) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearRegisterDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DRAFT_KEY);
}
