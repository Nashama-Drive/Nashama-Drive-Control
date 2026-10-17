import type { AdminDashboard } from "./types";

// The existing dashboard RPC predates application records. Keep its response
// renderable until the two sites are connected to the same schema.
export const normalizeAdminDashboard = (value: unknown): AdminDashboard => {
  const data = value && typeof value === "object"
    ? (value as Partial<AdminDashboard>)
    : {};
  const list = <T,>(items: T[] | undefined): T[] =>
    Array.isArray(items) ? items : [];

  return {
    driver_count: Number(data.driver_count) || 0,
    agent_count: Number(data.agent_count) || 0,
    open_complaints: Number(data.open_complaints) || 0,
    open_issues: Number(data.open_issues) || 0,
    drivers: list(data.drivers),
    agents: list(data.agents),
    complaints: list(data.complaints),
    issues: list(data.issues),
    applications: {
      captains: list(data.applications?.captains),
      agents: list(data.applications?.agents),
      inquiries: list(data.applications?.inquiries),
    },
  };
};