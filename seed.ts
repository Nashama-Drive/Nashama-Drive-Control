import type {
  AgentApplication,
  CaptainApplication,
  Complaint,
  Driver,
  InquiryApplication,
  Issue,
  Transaction,
} from "./types";

export type LocalAdmin = {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: "owner" | "admin";
  phone: string;
  avatar_url: string | null;
  is_active: boolean;
  profile_id: string;
};

export type LocalAgent = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  password: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  available_balance: number;
  daily_spend: number;
  monthly_spend: number;
  status: string;
};

export type LocalCaptainApplication = Omit<CaptainApplication, never>;
export type LocalAgentApplication = AgentApplication;
export type LocalInquiryApplication = InquiryApplication;

export type LocalDB = {
  admins: LocalAdmin[];
  drivers: Driver[];
  agents: LocalAgent[];
  transactions: Transaction[];
  complaints: Complaint[];
  issues: Issue[];
  applications: {
    captains: LocalCaptainApplication[];
    agents: LocalAgentApplication[];
    inquiries: LocalInquiryApplication[];
  };
  sessions: { token: string; kind: "admin" | "agent"; ref: string }[];
};

// Start with no sample operational records. New entries come from real actions.
export const createSeedDb = (): LocalDB => ({
  admins: [
    {
      id: "OWNER-1",
      username: "AbuSarah",
      password: "Faisl511",
      full_name: "AbuSarah",
      role: "owner",
      phone: "",
      avatar_url: null,
      is_active: true,
      profile_id: "1001",
    },
  ],
  drivers: [],
  agents: [],
  transactions: [],
  complaints: [],
  issues: [],
  applications: { captains: [], agents: [], inquiries: [] },
  sessions: [],
});
