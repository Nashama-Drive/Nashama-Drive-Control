import { useCallback, useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import AgentLogin from "./AgentLogin";
import { AgentSidebar, AgentTopbar } from "./AgentShell";
import Home from "./pages/Home";
import Topup from "./pages/Topup";
import History from "./pages/History";
import Profile from "./pages/Profile";
import {
  authenticateAgent,
  getBackendMode,
  rpc,
  subscribeBackendMode,
} from "@/lib/api";
import type { AgentDashboard, AgentProfile } from "@/lib/types";

export default function AgentPortal({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [page, setPage] = useState("home");
  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoMode, setDemoMode] = useState(getBackendMode() === "local");

  useEffect(
    () => subscribeBackendMode((next) => setDemoMode(next === "local")),
    [],
  );

  const load = useCallback(async (sessionToken: string) => {
    const { data, error } = await rpc<AgentDashboard>(
      "get_nashama_agent_dashboard",
      { p_session_token: sessionToken },
    );
    if (error || !data) {
      setMessage("تعذر تحميل بيانات الوكيل. حاول تسجيل الدخول مرة أخرى.");
      return;
    }
    setDashboard(data);
    setProfile(data.agent);
  }, []);

  const login = async (phone: string, password: string) => {
    setLoading(true);
    setMessage("");
    const { data, error } = await authenticateAgent(phone, password);
    if (error || !data?.[0]) {
      setMessage("بيانات الدخول غير صحيحة أو الحساب موقوف.");
      setLoading(false);
      return;
    }
    const session = data[0] as unknown as {
      session_token: string;
      agent_id: string;
      agent_name: string;
      owner_name: string;
      phone: string;
      location: string;
      available_balance: number;
      daily_spend: number;
      monthly_spend: number;
      status: string;
    };
    setToken(session.session_token);
    setProfile({
      id: session.agent_id,
      name: session.agent_name,
      owner_name: session.owner_name,
      phone: session.phone,
      location: session.location,
      available_balance: session.available_balance,
      daily_spend: session.daily_spend,
      monthly_spend: session.monthly_spend,
      status: session.status,
    });
    await load(session.session_token);
    setLoading(false);
  };

  const logout = async () => {
    if (token) {
      await rpc("sign_out_nashama_agent", { p_session_token: token });
    }
    setToken("");
    setProfile(null);
    setDashboard(null);
    setPage("home");
    setMessage("");
  };

  if (!profile || !token) {
    return (
      <AgentLogin
        loading={loading}
        message={message}
        onLogin={(phone, password) => void login(phone, password)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div dir="rtl" className="admin-app agent-app">
      <AgentSidebar
        page={page}
        profile={profile}
        onNavigate={setPage}
        onLogout={() => void logout()}
      />
      <main className="admin-main">
        <AgentTopbar
          page={page}
          profile={profile}
          onMenu={() => document.body.classList.toggle("sidebar-open")}
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
          {page === "home" && dashboard && (
            <Home dashboard={dashboard} onNavigate={setPage} />
          )}
          {page === "topup" && dashboard && (
            <Topup
              dashboard={dashboard}
              token={token}
              onRefresh={() => void load(token)}
              onMessage={setMessage}
            />
          )}
          {page === "history" && dashboard && (
            <History
              transactions={dashboard.transactions}
              onRefresh={() => void load(token)}
            />
          )}
          {page === "profile" && (
            <Profile
              profile={profile}
              token={token}
              onProfileUpdate={(patch) => setProfile({ ...profile, ...patch })}
              onMessage={setMessage}
            />
          )}
        </div>
      </main>
    </div>
  );
}
