import { AGENT_COMMISSION } from "./format";
import { compareSync, hashSync } from "bcryptjs";
import { validCoordinates } from "./maps";
import {
  createSeedDb,
  type LocalAgentApplication,
  type LocalCaptainApplication,
  type LocalDB,
  type LocalInquiryApplication,
} from "./seed";
import type {
  AdminDashboard,
  AgentDashboard,
  Driver,
  Transaction,
} from "./types";

const STORAGE_KEY = "nashama_drive_local_db_v2";
const OLD_STORAGE_KEY = "nashama_drive_local_db_v1";

let cache: LocalDB | null = null;
let storageWriteFailed = false;

const safeList = <T,>(value: T[] | undefined): T[] =>
  Array.isArray(value) ? value : [];

const restoreDb = (value: unknown): LocalDB => {
  const stored = value && typeof value === "object"
    ? (value as Partial<LocalDB>)
    : {};
  const initial = createSeedDb();
  const owner = safeList(stored.admins).find(
    (account) => account?.username?.toLowerCase() === "abusarah",
  );
  const canonicalOwner = initial.admins[0];

  return {
    admins: [{
      ...canonicalOwner,
      ...owner,
      id: canonicalOwner.id,
      username: canonicalOwner.username,
      password: canonicalOwner.password,
      full_name: owner?.full_name || canonicalOwner.full_name,
      role: "owner",
      is_active: true,
    }, ...safeList(stored.admins).filter(
      (account) => account?.username?.toLowerCase() !== "abusarah",
    )],
    drivers: safeList(stored.drivers),
    agents: safeList(stored.agents).map((agent) => ({
      ...agent,
      // Old demo centers had a shared public password; require provisioning
      // a new account explicitly instead of retaining that login.
      password: agent.password === "agent123" ? null : agent.password ?? null,
    })),
    transactions: safeList(stored.transactions),
    complaints: safeList(stored.complaints),
    issues: safeList(stored.issues),
    applications: {
      captains: safeList(stored.applications?.captains),
      agents: safeList(stored.applications?.agents),
      inquiries: safeList(stored.applications?.inquiries),
    },
    sessions: safeList(stored.sessions),
  };
};

export const readDb = (): LocalDB => {
  if (storageWriteFailed && cache) return cache;
  try {
    // Discard the previous demo dataset once, without importing its fake records.
    localStorage.removeItem(OLD_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Re-read storage so account changes in another tab take effect here.
      cache = restoreDb(JSON.parse(raw));
      return cache;
    }
    // Another tab may have cleared the local dataset.
    cache = createSeedDb();
    writeDb(cache);
    return cache;
  } catch {
    /* ignore corrupted storage */
  }
  if (cache) return cache;
  cache = createSeedDb();
  writeDb(cache);
  return cache;
};

export const writeDb = (db: LocalDB) => {
  cache = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    storageWriteFailed = false;
  } catch {
    storageWriteFailed = true;
  }
};

export const resetLocalDb = () => {
  cache = null;
  storageWriteFailed = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return readDb();
};

export const isLocalAgentPhone = (phone: string) =>
  readDb().agents.some((item) => item.phone === phone.trim());

const token = () =>
  `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const fail = (message: string) => ({
  data: null,
  error: { message, code: "P0001" },
});

const ok = (data: unknown) => ({ data, error: null });

const agentSession = (db: LocalDB, sessionToken: string) => {
  const session = db.sessions.find(
    (session) => session.token === sessionToken && session.kind === "agent",
  );
  const agent = db.agents.find((item) => item.id === session?.ref);
  return agent?.password && agent.status === "active" ? session : undefined;
};

const adminSession = (db: LocalDB, sessionToken: string) =>
  db.sessions.find(
    (session) => session.token === sessionToken && session.kind === "admin",
  );

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const startOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const buildAdminDashboard = (db: LocalDB): AdminDashboard => {
  const drivers: Driver[] = db.drivers.map((driver) => ({ ...driver }));
  const agents = db.agents.map(({ password: _password, ...agent }) => ({
    ...agent,
    latitude: agent.latitude ?? null,
    longitude: agent.longitude ?? null,
    has_account: Boolean(_password),
  }));
  return {
    driver_count: drivers.length,
    agent_count: agents.length,
    open_complaints: db.complaints.filter((item) => item.status !== "resolved")
      .length,
    open_issues: db.issues.filter((item) => item.status !== "resolved").length,
    drivers,
    agents,
    complaints: db.complaints,
    issues: db.issues,
    applications: {
      captains: db.applications.captains,
      agents: db.applications.agents,
      inquiries: db.applications.inquiries,
    },
  };
};

export const buildAgentDashboard = (
  db: LocalDB,
  agentId: string,
): AgentDashboard | null => {
  const agent = db.agents.find((item) => item.id === agentId);
  if (!agent) return null;
  const { password: _password, ...profile } = agent;
  const transactions: Transaction[] = db.transactions
    .filter((item) => item.agent_id === agentId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const today = startOfToday();
  const todayRows = transactions.filter(
    (item) => new Date(item.created_at).getTime() >= today,
  );
  return {
    agent: {
      id: profile.id,
      name: profile.name,
      owner_name: profile.owner_name,
      phone: profile.phone,
      location: profile.location,
      available_balance: profile.available_balance,
      daily_spend: profile.daily_spend,
      monthly_spend: profile.monthly_spend,
      status: profile.status,
    },
    drivers: db.drivers.map((driver) => ({ ...driver })),
    transactions,
    today_count: todayRows.length,
    today_total: todayRows.reduce((sum, item) => sum + item.amount, 0),
  };
};

type RpcResult = { data: unknown; error: { message: string; code: string } | null };

export const localRpc = (name: string, args: Record<string, unknown>): RpcResult => {
  const db = readDb();
  const p = args as Record<string, string | number | boolean | string[] | null | undefined>;

  switch (name) {
    case "authenticate_nashama_admin": {
      const username = String(p.p_username ?? "").trim().toLowerCase();
      const password = String(p.p_password ?? "");
      const account = db.admins.find(
        (item) => item.username.toLowerCase() === username,
      );
      if (!account || account.password !== password || !account.is_active) {
        return fail("Invalid credentials");
      }
      const sessionToken = token();
      db.sessions.push({
        token: sessionToken,
        kind: "admin",
        ref: account.id,
      });
      writeDb(db);
      return ok([
        {
          session_token: sessionToken,
          id: account.id,
          username: account.username,
          full_name: account.full_name,
          role: account.role,
          phone: account.phone,
          avatar_url: account.avatar_url,
          profile_id: account.profile_id,
        },
      ]);
    }
    case "get_nashama_admin_dashboard": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      return ok(buildAdminDashboard(db));
    }
    case "list_nashama_admin_accounts": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      return ok(
        db.admins.map(({ password: _password, ...account }) => ({ ...account })),
      );
    }
    case "create_nashama_admin_account": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const username = String(p.p_username ?? "").trim().toLowerCase();
      if (username.length < 3) return fail("Username too short");
      if (String(p.p_password ?? "").length < 8) return fail("Password too short");
      if (db.admins.some((item) => item.username === username)) {
        return fail("Username already used");
      }
      const account = {
        id: `ADM-${Date.now()}`,
        username,
        password: String(p.p_password),
        full_name: String(p.p_full_name),
        role: "admin" as const,
        phone: String(p.p_phone ?? ""),
        avatar_url: (p.p_avatar_url as string | null) ?? null,
        is_active: true,
        profile_id: String(2000 + db.admins.length),
      };
      db.admins.push(account);
      writeDb(db);
      return ok([]);
    }
    case "deactivate_nashama_admin": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const target = db.admins.find((item) => item.id === String(p.p_account_id));
      if (!target || target.role === "owner") return fail("Not allowed");
      target.is_active = false;
      db.sessions = db.sessions.filter(
        (item) => !(item.kind === "admin" && item.ref === target.id),
      );
      writeDb(db);
      return ok([]);
    }
    case "activate_nashama_admin": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const target = db.admins.find((item) => item.id === String(p.p_account_id));
      if (!target || target.role === "owner") return fail("Not allowed");
      target.is_active = true;
      writeDb(db);
      return ok([]);
    }
    case "delete_nashama_admin": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const target = db.admins.find((item) => item.id === String(p.p_account_id));
      if (!target || target.role === "owner") return fail("Not allowed");
      db.admins = db.admins.filter((item) => item.id !== target.id);
      db.sessions = db.sessions.filter(
        (item) => !(item.kind === "admin" && item.ref === target.id),
      );
      writeDb(db);
      return ok([]);
    }
    case "create_nashama_driver": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const driverId = String(p.p_driver_id ?? "").trim();
      if (!driverId) return fail("Driver id required");
      if (db.drivers.some((item) => item.id === driverId)) {
        return fail("Driver already exists");
      }
      db.drivers.push({
        id: driverId,
        name: String(p.p_name),
        national_id: String(p.p_national_id ?? ""),
        vehicle_plate: String(p.p_vehicle_plate ?? ""),
        phone: String(p.p_phone ?? ""),
        avatar_url: (p.p_avatar_url as string | null) ?? null,
        is_active: true,
      });
      writeDb(db);
      return ok([]);
    }
    case "update_nashama_driver": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const driver = db.drivers.find((item) => item.id === p.p_driver_id);
      if (!driver) return fail("Driver not found");
      const name = String(p.p_name ?? "").trim();
      const phone = String(p.p_phone ?? "").trim();
      if (!name || !phone) return fail("Name and phone are required");
      driver.name = name;
      driver.phone = phone;
      driver.national_id = String(p.p_national_id ?? "").trim();
      driver.vehicle_plate = String(p.p_vehicle_plate ?? "").trim();
      driver.avatar_url = (p.p_avatar_url as string | null) || null;
      writeDb(db);
      return ok([]);
    }
    case "set_nashama_driver_status": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const driver = db.drivers.find((item) => item.id === p.p_driver_id);
      if (!driver || typeof p.p_is_active !== "boolean") return fail("Invalid driver or status");
      driver.is_active = p.p_is_active;
      writeDb(db);
      return ok([]);
    }
    case "delete_nashama_driver": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      if (!db.drivers.some((item) => item.id === p.p_driver_id)) return fail("Driver not found");
      db.drivers = db.drivers.filter((item) => item.id !== p.p_driver_id);
      writeDb(db);
      return ok([]);
    }
    case "create_nashama_agent": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const phone = String(p.p_phone ?? "").trim();
      const name = String(p.p_name ?? "").trim();
      const ownerName = String(p.p_owner_name ?? "").trim();
      const location = String(p.p_location ?? "").trim();
      if (!name || !ownerName || !phone || !location) return fail("Missing center details");
      if (db.agents.some((item) => item.phone === phone)) {
        return fail("Agent phone already used");
      }
      const latitude = p.p_latitude == null ? null : Number(p.p_latitude);
      const longitude = p.p_longitude == null ? null : Number(p.p_longitude);
      if (
        (latitude == null) !== (longitude == null) ||
        (latitude != null && longitude != null && !validCoordinates(latitude, longitude))
      ) return fail("Invalid coordinates");
      const id = `AG-${Date.now()}`;
      db.agents.push({
        id,
        name,
        owner_name: ownerName,
        phone,
        password: null,
        location,
        latitude,
        longitude,
        available_balance: 0,
        daily_spend: 0,
        monthly_spend: 0,
        status: "active",
      });
      writeDb(db);
      return ok([{ id }]);
    }
    case "update_nashama_agent": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === p.p_agent_id);
      if (!agent) return fail("Agent not found");
      const name = String(p.p_name ?? "").trim();
      const ownerName = String(p.p_owner_name ?? "").trim();
      const phone = String(p.p_phone ?? "").trim();
      const location = String(p.p_location ?? "").trim();
      if (!name || !ownerName || !phone || !location) return fail("Missing center details");
      if (db.agents.some((item) => item.id !== agent.id && item.phone === phone)) {
        return fail("Agent phone already used");
      }
      const latitude = p.p_latitude == null ? null : Number(p.p_latitude);
      const longitude = p.p_longitude == null ? null : Number(p.p_longitude);
      if (
        (latitude == null) !== (longitude == null) ||
        (latitude != null && longitude != null && !validCoordinates(latitude, longitude))
      ) return fail("Invalid coordinates");
      if (agent.phone !== phone) {
        db.sessions = db.sessions.filter((item) => !(item.kind === "agent" && item.ref === agent.id));
      }
      Object.assign(agent, { name, owner_name: ownerName, phone, location, latitude, longitude });
      writeDb(db);
      return ok([]);
    }
    case "create_nashama_agent_account":
    case "reset_nashama_agent_password": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === p.p_agent_id);
      if (!agent) return fail("Agent not found");
      if (name === "create_nashama_agent_account" && agent.password) return fail("Account already exists");
      if (name === "reset_nashama_agent_password" && !agent.password) return fail("No account exists");
      const password = String(p.p_password ?? "");
      if (password.length < 8) return fail("Password must contain at least 8 characters");
      agent.password = hashSync(password, 10);
      agent.status = "active";
      db.sessions = db.sessions.filter((item) => !(item.kind === "agent" && item.ref === agent.id));
      writeDb(db);
      return ok([]);
    }
    case "set_nashama_agent_account_status": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === p.p_agent_id);
      if (!agent?.password || typeof p.p_is_active !== "boolean") return fail("Account not found");
      agent.status = p.p_is_active ? "active" : "blocked";
      if (!p.p_is_active) {
        db.sessions = db.sessions.filter((item) => !(item.kind === "agent" && item.ref === agent.id));
      }
      writeDb(db);
      return ok([]);
    }
    case "delete_nashama_agent_account": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === p.p_agent_id);
      if (!agent?.password) return fail("Account not found");
      agent.password = null;
      agent.status = "active";
      db.sessions = db.sessions.filter((item) => !(item.kind === "agent" && item.ref === agent.id));
      writeDb(db);
      return ok([]);
    }
    case "delete_nashama_agent": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      if (!db.agents.some((item) => item.id === p.p_agent_id)) return fail("Agent not found");
      db.agents = db.agents.filter((item) => item.id !== p.p_agent_id);
      db.sessions = db.sessions.filter((item) => !(item.kind === "agent" && item.ref === p.p_agent_id));
      // Transaction history is retained for accounting after a center is removed.
      writeDb(db);
      return ok([]);
    }
    case "set_nashama_agent_balance": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === String(p.p_agent_id));
      if (!agent) return fail("Agent not found");
      const balance = Number(p.p_balance);
      if (!Number.isFinite(balance) || balance < 0) return fail("Invalid balance");
      agent.available_balance = balance;
      writeDb(db);
      return ok([]);
    }
    /** استقبال تقديم جديد من موقع نشاما درايف العام */
    case "submit_nashama_application": {
      const group = String(p.p_group ?? "");
      const now = new Date().toISOString();
      const source = String(p.p_source ?? "موقع نشاما درايف");
      if (group === "captain") {
        const record: LocalCaptainApplication = {
          id: `APP-C-${Date.now().toString().slice(-6)}`,
          full_name: String(p.p_full_name ?? "").trim(),
          phone: String(p.p_phone ?? "").trim(),
          car_model: String(p.p_car_model ?? "").trim(),
          car_year: String(p.p_car_year ?? "").trim(),
          vehicle_plate: String(p.p_vehicle_plate ?? "").trim(),
          car_images: Array.isArray(p.p_car_images)
            ? (p.p_car_images as string[])
            : [],
          city: String(p.p_city ?? "").trim(),
          status: "new",
          created_at: now,
          review_note: "",
          source,
        };
        if (!record.full_name || !record.phone) return fail("Missing fields");
        db.applications.captains.unshift(record);
        writeDb(db);
        return ok([{ id: record.id, group }]);
      }
      if (group === "agent") {
        const record: LocalAgentApplication = {
          id: `APP-A-${Date.now().toString().slice(-6)}`,
          company_name: String(p.p_company_name ?? "").trim(),
          phone: String(p.p_phone ?? "").trim(),
          location: String(p.p_location ?? "").trim(),
          latitude: p.p_latitude == null ? null : Number(p.p_latitude),
          longitude: p.p_longitude == null ? null : Number(p.p_longitude),
          status: "new",
          created_at: now,
          review_note: "",
          source,
        };
        if (!record.company_name || !record.phone) return fail("Missing fields");
        db.applications.agents.unshift(record);
        writeDb(db);
        return ok([{ id: record.id, group }]);
      }
      if (group === "inquiry") {
        const record: LocalInquiryApplication = {
          id: `APP-Q-${Date.now().toString().slice(-6)}`,
          full_name: String(p.p_full_name ?? "").trim(),
          phone: String(p.p_phone ?? "").trim(),
          kind: p.p_kind === "complaint" ? "complaint" : "inquiry",
          message: String(p.p_message ?? "").trim(),
          status: "new",
          created_at: now,
          review_note: "",
          source,
        };
        if (!record.full_name || !record.message) return fail("Missing fields");
        db.applications.inquiries.unshift(record);
        writeDb(db);
        return ok([{ id: record.id, group }]);
      }
      return fail("Unknown application group");
    }
    case "set_nashama_application_status": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const group = String(p.p_group ?? "");
      const status = String(p.p_status ?? "");
      const allowed = ["new", "reviewing", "approved", "rejected"];
      if (!allowed.includes(status)) return fail("Invalid status");
      const collection =
        group === "captain"
          ? db.applications.captains
          : group === "agent"
            ? db.applications.agents
            : group === "inquiry"
              ? db.applications.inquiries
              : null;
      if (!collection) return fail("Unknown application group");
      const record = collection.find(
        (item) => item.id === String(p.p_application_id ?? ""),
      );
      if (!record) return fail("Application not found");
      record.status = status as typeof record.status;
      record.review_note = String(p.p_review_note ?? record.review_note ?? "");
      writeDb(db);
      return ok([{ id: record.id, status: record.status }]);
    }
    /** الموافقة على تقديم كابتن تُنشئ سائقاً في الأسطول */
    case "approve_nashama_captain_application": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const record = db.applications.captains.find(
        (item) => item.id === String(p.p_application_id ?? ""),
      );
      if (!record) return fail("Application not found");
      const driverId =
        String(p.p_driver_id ?? "").trim() || `ND-${2500 + db.drivers.length}`;
      if (db.drivers.some((item) => item.id === driverId)) {
        return fail("Driver id already used");
      }
      db.drivers.push({
        id: driverId,
        name: record.full_name,
        national_id: "",
        vehicle_plate: record.vehicle_plate,
        phone: record.phone,
        avatar_url: record.car_images[0] ?? null,
        is_active: true,
      });
      record.status = "approved";
      record.review_note = String(
        p.p_review_note ?? `تمت الموافقة وإضافته بالمعرف ${driverId}`,
      );
      writeDb(db);
      return ok([{ driver_id: driverId }]);
    }
    /** الموافقة على تقديم وكيل تُنشئ مركز شحن برصيد صفر */
    case "approve_nashama_agent_application": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const record = db.applications.agents.find(
        (item) => item.id === String(p.p_application_id ?? ""),
      );
      if (!record) return fail("Application not found");
      if (db.agents.some((item) => item.phone === record.phone)) {
        return fail("Agent phone already used");
      }
      const agentId = `AG-${200 + db.agents.length}`;
      db.agents.push({
        id: agentId,
        name: record.company_name,
        owner_name: record.company_name,
        phone: record.phone,
        password: null,
        location: record.location,
        latitude: record.latitude,
        longitude: record.longitude,
        available_balance: 0,
        daily_spend: 0,
        monthly_spend: 0,
        status: "active",
      });
      record.status = "approved";
      record.review_note = String(
        p.p_review_note ?? "تمت الموافقة وإنشاء مركز الشحن برصيد صفر.",
      );
      writeDb(db);
      return ok([{ agent_id: agentId }]);
    }
    case "update_nashama_admin_profile": {
      const session = adminSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const account = db.admins.find((item) => item.id === session.ref);
      if (!account) return fail("Account not found");
      account.phone = String(p.p_phone ?? "");
      account.avatar_url = (p.p_avatar_url as string | null) ?? null;
      writeDb(db);
      return ok([{ phone: account.phone, avatar_url: account.avatar_url }]);
    }
    case "sign_out_nashama_admin":
    case "sign_out_nashama_agent": {
      db.sessions = db.sessions.filter(
        (item) => item.token !== String(p.p_session_token ?? ""),
      );
      writeDb(db);
      return ok([]);
    }
    case "authenticate_nashama_agent": {
      const phone = String(p.p_phone ?? "").trim();
      const password = String(p.p_password ?? "");
      const agent = db.agents.find((item) => item.phone === phone);
      const passwordMatches = agent?.password && (
        agent.password.startsWith("$2")
          ? compareSync(password, agent.password)
          : agent.password === password
      );
      if (!agent || !passwordMatches || agent.status !== "active") {
        return fail("Invalid credentials");
      }
      if (!agent.password?.startsWith("$2")) agent.password = hashSync(password, 10);
      const sessionToken = token();
      db.sessions.push({ token: sessionToken, kind: "agent", ref: agent.id });
      writeDb(db);
      return ok([
        {
          session_token: sessionToken,
          agent_id: agent.id,
          agent_name: agent.name,
          owner_name: agent.owner_name,
          phone: agent.phone,
          location: agent.location,
          available_balance: agent.available_balance,
          daily_spend: agent.daily_spend,
          monthly_spend: agent.monthly_spend,
          status: agent.status,
        },
      ]);
    }
    case "get_nashama_agent_dashboard": {
      const session = agentSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const dashboard = buildAgentDashboard(db, session.ref);
      if (!dashboard) return fail("Agent not found");
      return ok(dashboard);
    }
    case "agent_topup_driver": {
      const session = agentSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === session.ref);
      const driver = db.drivers.find(
        (item) => item.id === String(p.p_driver_id ?? ""),
      );
      if (!agent?.password || agent.status !== "active" || !driver?.is_active) {
        return fail("Invalid request");
      }
      const amount = Number(p.p_amount ?? 0);
      const total = amount + AGENT_COMMISSION;
      if (!Number.isFinite(amount) || amount <= 0) return fail("Invalid amount");
      if (total > agent.available_balance) return fail("Insufficient balance");
      agent.available_balance = Number((agent.available_balance - total).toFixed(2));
      const now = new Date();
      agent.daily_spend = Number((agent.daily_spend + amount).toFixed(2));
      if (new Date(now).getTime() >= startOfMonth()) {
        agent.monthly_spend = Number((agent.monthly_spend + amount).toFixed(2));
      }
      const reference = `NSD-${now.getFullYear()}${String(
        db.transactions.length + 1,
      ).padStart(4, "0")}`;
      db.transactions.push({
        id: `TX-${Date.now()}`,
        agent_id: agent.id,
        driver_id: driver.id,
        driver_name: driver.name,
        amount,
        commission: AGENT_COMMISSION,
        reference_number: reference,
        balance_after: agent.available_balance,
        created_at: now.toISOString(),
      });
      writeDb(db);
      return ok([
        {
          reference_number: reference,
          driver_name: driver.name,
          amount,
          new_balance: agent.available_balance,
        },
      ]);
    }
    case "update_nashama_agent_profile": {
      const session = agentSession(db, String(p.p_session_token ?? ""));
      if (!session) return fail("Invalid session");
      const agent = db.agents.find((item) => item.id === session.ref);
      if (!agent) return fail("Agent not found");
      if (p.p_phone) {
        const phone = String(p.p_phone).trim();
        if (db.agents.some((item) => item.id !== agent.id && item.phone === phone)) {
          return fail("Agent phone already used");
        }
        agent.phone = phone;
      }
      if (p.p_password) {
        const password = String(p.p_password);
        if (password.length < 8) return fail("Password must contain at least 8 characters");
        agent.password = hashSync(password, 10);
        db.sessions = db.sessions.filter((item) =>
          item.kind !== "agent" || item.ref !== agent.id || item.token === session.token,
        );
      }
      writeDb(db);
      return ok([{ phone: agent.phone }]);
    }
    default:
      return fail(`Unknown function ${name}`);
  }
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
