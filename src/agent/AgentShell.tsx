import {
  ChevronLeft,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { initials } from "@/lib/format";
import type { AgentProfile } from "@/lib/types";

const NAV_ITEMS = [
  { id: "home", label: "الرئيسية", icon: LayoutDashboard },
  { id: "topup", label: "شحن سائق", icon: TrendingUp },
  { id: "history", label: "سجل المعاملات", icon: Receipt },
];

export const AGENT_PAGE_TITLES: Record<string, string> = {
  home: "الرئيسية",
  topup: "شحن سائق",
  history: "سجل المعاملات",
  profile: "الملف الشخصي",
};

export function AgentSidebar({
  page,
  profile,
  onNavigate,
  onLogout,
}: {
  page: string;
  profile: AgentProfile;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="logo-mark gold-mark">
          <WalletCards size={22} />
        </div>
        <div>
          <strong>
            <span>نشامة</span> درايف
          </strong>
          <small>بوابة الوكيل</small>
        </div>
        <button
          className="side-close"
          onClick={() => document.body.classList.remove("sidebar-open")}
        >
          <X size={18} />
        </button>
      </div>

      <div className="side-profile">
        <div className="profile-avatar gold-avatar">{initials(profile.name)}</div>
        <div>
          <strong>{profile.name}</strong>
          <span>{profile.owner_name || "وكيل شحن"}</span>
        </div>
        <span className="active-dot" />
      </div>

      <nav>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={page === item.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                onNavigate(item.id);
                document.body.classList.remove("sidebar-open");
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="side-bottom">
        <button
          className={page === "profile" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("profile")}
        >
          <CircleUserRound size={18} />
          <span>الملف الشخصي</span>
        </button>
        <button className="logout-link" onClick={onLogout}>
          <LogOut size={17} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

export function AgentTopbar({
  page,
  profile,
  onMenu,
}: {
  page: string;
  profile: AgentProfile;
  onMenu: () => void;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu}>
        <span>☰</span>
      </button>
      <div>
        <span className="breadcrumb">
          بوابة الوكيل <ChevronLeft size={12} /> {AGENT_PAGE_TITLES[page]}
        </span>
        <h1>{AGENT_PAGE_TITLES[page]}</h1>
      </div>
      <div className="topbar-actions">
        <div className="topbar-user">
          <div className="small-avatar gold-avatar">{initials(profile.name)}</div>
          <span>{profile.name}</span>
        </div>
      </div>
    </header>
  );
}
