import { Link, useRouterState } from "@tanstack/react-router";
import { DivineEntryLink, GuardedDivineLink } from "@/components/home/DivineEntryLink";
import {
  SiteMenu,
  SiteMenuButton,
  SiteMenuItem,
} from "@/components/SiteMenu";
import {
  SITE_MENU_ITEMS,
  siteMenuTriggerLabel,
  siteNavActive,
  type SiteMenuItemConfig,
} from "@/lib/site-nav-config";
import { useAuth } from "@/lib/auth";
import { isGuestUser } from "@/lib/api";

function loginSearchFlags(searchStr: string) {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const upgrade = params.get("upgrade");
  const register = params.get("register");
  const signin = params.get("signin");
  return {
    upgrade: upgrade === "true" || upgrade === "1",
    register: register === "true" || register === "1",
    signin: signin === "true" || signin === "1",
  };
}

type Props = {
  divineEntry?: boolean;
};

function MenuNavItem({ item, active }: { item: SiteMenuItemConfig; active: boolean }) {
  const spanClass = item.span === 2 ? " site-menu-item-span-2" : "";
  return (
    <Link
      to={item.to}
      className={`site-menu-item site-menu-item-compact${spanClass}${active ? " is-active" : ""}`}
      data-active={active || undefined}
    >
      <span className="site-menu-item-title">{item.label}</span>
    </Link>
  );
}

export function SiteUtilityNav({ divineEntry = false }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const { user, logout, loading } = useAuth();
  const returnPath = path || "/divine";

  const { upgrade, register, signin } = loginSearchFlags(searchStr);
  const loginActive = path === "/login" && (signin || (!upgrade && !register));
  const guestFlowActive = path === "/login" && upgrade;

  const menuPanel = (
    <>
      <div className="site-menu-grid">
        {SITE_MENU_ITEMS.map((item) => (
          <MenuNavItem key={item.id} item={item} active={siteNavActive(path, item.to)} />
        ))}
      </div>

      {!loading ? (
        <div className="site-menu-foot">
          {user && !isGuestUser(user) ? (
            <div className="site-menu-account-row">
              <span className="site-menu-account-name truncate">
                {user.nickname || user.email}
              </span>
              <SiteMenuButton onClick={logout} className="site-menu-item-compact site-menu-item-inline">
                退出
              </SiteMenuButton>
            </div>
          ) : (
            <div className="site-menu-grid">
              <SiteMenuItem
                to="/login"
                search={
                  user && isGuestUser(user)
                    ? { signin: true, return: returnPath, mode: "account" }
                    : { return: returnPath, mode: "account" }
                }
                active={loginActive}
                className="site-menu-item-compact"
              >
                登录
              </SiteMenuItem>
              {user && isGuestUser(user) ? (
                <SiteMenuItem
                  to="/login"
                  search={{ upgrade: true, return: returnPath }}
                  active={guestFlowActive}
                  className="site-menu-item-compact"
                >
                  升级
                </SiteMenuItem>
              ) : (
                <SiteMenuItem
                  to="/login"
                  search={{ return: returnPath, mode: "guest" }}
                  className="site-menu-item-compact"
                >
                  游客试用
                </SiteMenuItem>
              )}
            </div>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="site-utility-nav">
      <SiteMenu triggerLabel={siteMenuTriggerLabel(path)}>{menuPanel}</SiteMenu>
      {divineEntry ? (
        <DivineEntryLink search={{ skipEntry: true }} className="btn-gold btn-gold-nav shrink-0">
          <span className="relative z-[1]">起卦</span>
        </DivineEntryLink>
      ) : (
        <GuardedDivineLink returnPath={returnPath} className="btn-gold btn-gold-nav shrink-0">
          <span className="relative z-[1]">起卦</span>
        </GuardedDivineLink>
      )}
    </div>
  );
}
