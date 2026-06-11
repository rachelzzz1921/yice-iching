/** 首页专用全屏分页容器 */
export function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="home-shell min-h-[100dvh] bg-background pb-[env(safe-area-inset-bottom)]">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col home-shell-frame lg:max-w-4xl xl:max-w-[52rem]">
        <div id="main-content" className="paper-card flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
