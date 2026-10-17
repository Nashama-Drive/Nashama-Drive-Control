import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Car,
  ChevronLeft,
  CircleUserRound,
  ClipboardList,
  Link2,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  UserCog,
  WalletCards,
  X,
} from "lucide-react";
import { initials } from "@/lib/format";
import type { AdminProfile } from "@/lib/types";

const NAV_ITEMS = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "admins", label: "المستخدمون الإداريون", icon: UserCog },
  { id: "drivers", label: "السائقون", icon: Car },
  { id: "agents", label: "وكلاء الشحن", icon: WalletCards },
  { id: "complaints", label: "الشكاوى", icon: FileWarning },
  { id: "issues", label: "مشاكل النظام", icon: ShieldAlert },
  { id: "applications", label: "سجلات التقديم", icon: ClipboardList },
  { id: "integration", label: "ربط الموقعين", icon: Link2 },
];

export const PAGE_TITLES: Record<string, string> = {
  overview: "نظرة عامة",
  admins: "المستخدمون الإداريون",
  drivers: "سجل السائقين",
  agents: "وكلاء الشحن",
  complaints: "إدارة الشكاوى",
  issues: "مشاكل النظام",
  applications: "سجلات التقديم",
  integration: "ربط الموقعين",
  profile: "الملف الشخصي",
};

export function AdminSidebar({
  page,
  profile,
  onNavigate,
  onLogout,
  newApplications,
}: {
  page: string;
  profile: AdminProfile;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  newApplications: number;
}) {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="logo-mark">
          <Car size={22} />
        </div>
        <div>
          <strong>
            <span>نشامة</span> درايف
          </strong>
          <small>لوحة الإدارة</small>
        </div>
        <button
          className="side-close"
          onClick={() => document.body.classList.remove("sidebar-open")}
        >
          <X size={18} />
        </button>
      </div>

      <div className="side-profile">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            initials(profile.full_name)
          )}
        </div>
        <div>
          <strong>{profile.full_name}</strong>
          <span>{profile.role === "owner" ? "صاحب البرنامج" : "إداري"}</span>
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
              {item.id === "applications" && newApplications > 0 && (
                <b>{newApplications}</b>
              )}
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

export function AdminTopbar({
  page,
  profile,
  onMenu,
  onNavigate,
  notifications,
}: {
  page: string;
  profile: AdminProfile;
  onMenu: () => void;
  onNavigate: (page: string) => void;
  notifications: {
    id: string;
    title: string;
    detail: string;
    date: string;
    target: string;
    tone: "red" | "gold";
  }[];
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifications) return;
    const closeOutside = (event: PointerEvent) => {
      if (!notificationRoot.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNotifications(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showNotifications]);

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div>
        <span className="breadcrumb">
          لوحة الإدارة <ChevronLeft size={12} /> {PAGE_TITLES[page]}
        </span>
        <h1>{PAGE_TITLES[page]}</h1>
      </div>
      <div className="topbar-actions">
        <div className="notification-wrap" ref={notificationRoot}>
          <button
            className="notification-button"
            aria-label="التنبيهات"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((value) => !value)}
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="notification-count">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="notification-popover">
              <div className="notification-heading">
                <div>
                  <strong>آخر التنبيهات</strong>
                  <small>{notifications.length} بلاغات تحتاج متابعة</small>
                </div>
                <button
                  className="notification-close"
                  aria-label="إغلاق التنبيهات"
                  onClick={() => setShowNotifications(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="notification-list">
                {notifications.length ? (
                  notifications.slice(0, 6).map((notification) => (
                    <button
                      className="notification-item"
                      key={notification.id}
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate(notification.target);
                      }}
                    >
                      <span className={`notification-icon ${notification.tone}`}>
                        {notification.tone === "red" ? (
                          <FileWarning size={16} />
                        ) : (
                          <ShieldAlert size={16} />
                        )}
                      </span>
                      <span className="notification-copy">
                        <strong>{notification.title}</strong>
                        <small>{notification.detail}</small>
                        <small className="notification-date">{notification.date}</small>
                      </span>
                      <ChevronLeft size={14} />
                    </button>
                  ))
                ) : (
                  <div className="notification-empty">
                    لا توجد تنبيهات جديدة
                  </div>
                )}
              </div>
              <button
                className="notification-view-all"
                onClick={() => {
                  setShowNotifications(false);
                  onNavigate("complaints");
                }}
              >
                عرض الشكاوى والمشاكل
              </button>
            </div>
          )}
        </div>
        <div className="topbar-user">
          <div className="small-avatar">{initials(profile.full_name)}</div>
          <span>{profile.full_name}</span>
        </div>
      </div>
    </header>
  );
}
