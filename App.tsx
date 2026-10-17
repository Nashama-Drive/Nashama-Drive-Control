import { useEffect, useState } from "react";
import AdminPortal from "@/admin/AdminPortal";
import AgentPortal from "@/agent/AgentPortal";
import ApplyPortal from "@/apply/ApplyPortal";

const navigate = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const usePathname = () => {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const handle = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);
  return path;
};

export default function App() {
  const pathname = usePathname();
  if (pathname.startsWith("/apply")) {
    return <ApplyPortal onNavigate={navigate} />;
  }
  return pathname.startsWith("/agent") ? (
    <AgentPortal onNavigate={navigate} />
  ) : (
    <AdminPortal onNavigate={navigate} />
  );
}
