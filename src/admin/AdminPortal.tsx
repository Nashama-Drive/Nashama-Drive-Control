import { useCallback, useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import AdminLogin from "./AdminLogin";
import { AdminSidebar, AdminTopbar } from "./AdminShell";
import Overview from "./pages/Overview";
import Admins from "./pages/Admins";
import Drivers from "./pages/Drivers";
import Agents from "./pages/Agents";
import Complaints from "./pages/Complaints";
import Issues from "./pages/Issues";
import Applications from "./pages/Applications";
import Integration from "./pages/Integration";
import Profile from "./pages/Profile";
import {
  authenticateAdmin,
  getBackendMode,
  rpc,
  subscribeBackendMode,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { normalizeAdminDashboard } from "@/lib/normalizeDashboard";
import type {
  AdminAccount,
  AdminDashboard,
  AdminProfile,
} from "@/lib/types";

const EMPTY_DASHBOARD: AdminDashboard = {
  driver_count: 0,
  agent_count: 0,
  open_complaints: 0,
  open_issues: 0,
  drivers: [],
  agents: [],
  complaints: [],
  issues: [],
  applications: { captains: [], agents: [], inquiries: [] },
};

export default function AdminPortal({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [page, setPage] = useState("overview");
  const [dashboard, setDashboard] = useState<AdminDashboard>(EMPTY_DASHBOARD);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoMode, setDemoMode] = useState(getBackendMode() === "local");

  const newApplications =
    dashboard.applications.captains.filter((item) => item.status === "new")
      .length +
    dashboard.applications.agents.filter((item) => item.status === "new").length +
    dashboard.applications.inquiries.filter((item) => item.status === "new")
      .length;

  const notifications = [
    ...dashboard.complaints
      .filter((item) => item.status !== "resolved")
      .map((item) => ({
        id: item.id,
        title: item.subject,
        detail: item.description,
        date: formatDate(item.created_at),
        target: "complaints",
        tone: "red" as const,
        createdAt: item.created_at,
      })),
    ...dashboard.issues
      .filter((item) => item.status !== "resolved")
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.description,
        date: formatDate(item.created_at),
        target: "issues",
        tone: "gold" as const,
        createdAt: item.created_at,
      })),
  ]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  useEffect(
    () => subscribeBackendMode((next) => setDemoMode(next === "local")),
    [],
  );

  const load = useCallback(async (sessionToken: string) => {
    const { data, error } = await rpc<AdminDashboard>(
      "get_nashama_admin_dashboard",
      { p_session_token: sessionToken },
    );
    if (error || !data) {
      setMessage("تعذر تحميل بيانات الإدارة حالياً. حاول تسجيل الدخول مرة أخرى.");
      return;
    }
    setDashboard(normalizeAdminDashboard(data));
    const { data: list } = await rpc<AdminAccount[]>(
      "list_nashama_admin_accounts",
      { p_session_token: sessionToken },
    );
    setAccounts(list ?? []);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setMessage("");
    const { data, error } = await authenticateAdmin(username, password);
    if (error || !data?.[0]) {
      setMessage("بيانات الدخول غير صحيحة أو الحساب موقوف.");
      setLoading(false);
      return;
    }
    const session = data[0] as unknown as AdminProfile & { session_token: string };
    setToken(session.session_token);
    setProfile(session);
    await load(session.session_token);
    setLoading(false);
  };

  const logout = async () => {
    if (token) {
      await rpc("sign_out_nashama_admin", { p_session_token: token });
    }
    setToken("");
    setProfile(null);
    setDashboard(EMPTY_DASHBOARD);
    setAccounts([]);
    setPage("overview");
    setMessage("");
  };

  if (!profile || !token) {
    return (
      <AdminLogin
        loading={loading}
        message={message}
        onLogin={(username, password) => void login(username, password)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div dir="rtl" className="admin-app">
      <AdminSidebar
        page={page}
        profile={profile}
        onNavigate={setPage}
        onLogout={() => void logout()}
        newApplications={newApplications}
      />
      <main className="admin-main">
        <AdminTopbar
          page={page}
          profile={profile}
          onMenu={() => document.body.classList.toggle("sidebar-open")}
          onNavigate={setPage}
          notifications={notifications}
        />
        {demoMode && (
          <div className="demo-chip">
            <CircleAlert size={13} /> وضع العرض التجريبي — بيانات محلية محفوظة على هذا
            الجهاز
          </div>
        )}
        {message && (
          <div className="admin-alert">
            <CircleAlert size={17} />
            {message}
            <button onClick={() => setMessage("")} aria-label="إغلاق">
              <X size={15} />
            </button>
          </div>
        )}
        <div className="admin-content">
          {page === "overview" && (
            <Overview
              dashboard={dashboard}
              onNavigate={setPage}
              onRefresh={() => void load(token)}
            />
          )}
          {page === "admins" && (
            <Admins
              accounts={accounts}
              profile={profile}
              token={token}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
            />
          )}
          {page === "drivers" && (
            <Drivers
              drivers={dashboard.drivers}
              token={token}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
            />
          )}
          {page === "agents" && (
            <Agents
              agents={dashboard.agents}
              token={token}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
            />
          )}
          {page === "complaints" && (
            <Complaints
              complaints={dashboard.complaints}
              onRefresh={() => void load(token)}
            />
          )}
          {page === "issues" && (
            <Issues issues={dashboard.issues} onRefresh={() => void load(token)} />
          )}
          {page === "applications" && (
            <Applications
              data={dashboard.applications}
              token={token}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
              onOpenIntegration={() => setPage("integration")}
            />
          )}
          {page === "integration" && <Integration />}
          {page === "profile" && (
            <Profile
              profile={profile}
              token={token}
              onProfileUpdate={(patch) => setProfile({ ...profile, ...patch })}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
            />
          )}
        </div>
      </main>
    </div>
  );
}
