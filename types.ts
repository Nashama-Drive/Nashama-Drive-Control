export type AdminRole = "owner" | "admin";

export type AdminProfile = {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  phone: string;
  avatar_url: string | null;
  profile_id: string;
  session_token?: string;
};

export type AdminAccount = {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  phone: string;
  avatar_url: string | null;
  is_active: boolean;
  profile_id: string;
};

export type Driver = {
  id: string;
  name: string;
  national_id: string;
  vehicle_plate: string;
  phone: string;
  avatar_url: string | null;
  is_active: boolean;
};

export type Agent = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  available_balance: number;
  daily_spend: number;
  monthly_spend: number;
  status: string;
  has_account?: boolean;
};

export type Complaint = {
  id: string;
  subject: string;
  description: string;
  complainant_type: "customer" | "captain";
  driver_id: string | null;
  priority: "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

export type ApplicationStatus = "new" | "reviewing" | "approved" | "rejected";

/** تقديم كابتن — مطابق لنموذج «طلب الانضمام ككابتن توصيل» */
export type CaptainApplication = {
  id: string;
  full_name: string; // الاسم الرباعي
  phone: string; // رقم الهاتف
  car_model: string; // نوع السيارة
  car_year: string; // تاريخ إصدار السيارة (الموديل)
  vehicle_plate: string; // رقم اللوحة
  car_images: string[]; // صور السيارة (أمامية، خلفية، جانبية)
  city: string;
  status: ApplicationStatus;
  created_at: string;
  review_note: string;
  source: string; // الموقع المُرسِل
};

/** تقديم وكيل شحن — مطابق لنموذج «الانضمام لوكلاء الشحن» */
export type AgentApplication = {
  id: string;
  company_name: string; // اسم الشركة / المشروع
  phone: string; // رقم الهاتف
  location: string; // عنوان الموقع
  latitude: number | null; // من GPS
  longitude: number | null; // من GPS
  status: ApplicationStatus;
  created_at: string;
  review_note: string;
  source: string;
};

/** تقديم استفسار أو شكوى — مطابق لنموذج «أرسل لنا استفسارك» */
export type InquiryApplication = {
  id: string;
  full_name: string; // الاسم
  phone: string; // رقم الهاتف
  kind: "inquiry" | "complaint";
  message: string; // نص الرسالة أو الاستفسار
  status: ApplicationStatus;
  created_at: string;
  review_note: string;
  source: string;
};

export type ApplicationRecords = {
  captains: CaptainApplication[];
  agents: AgentApplication[];
  inquiries: InquiryApplication[];
};

export type AdminDashboard = {
  driver_count: number;
  agent_count: number;
  open_complaints: number;
  open_issues: number;
  drivers: Driver[];
  agents: Agent[];
  complaints: Complaint[];
  issues: Issue[];
  applications: ApplicationRecords;
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export type Transaction = {
  id: string;
  agent_id: string;
  driver_id: string;
  driver_name: string;
  amount: number;
  commission: number;
  reference_number: string;
  balance_after: number;
  created_at: string;
};

export type AgentProfile = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  location: string;
  available_balance: number;
  daily_spend: number;
  monthly_spend: number;
  status: string;
};

export type AgentDashboard = {
  agent: AgentProfile;
  drivers: Driver[];
  transactions: Transaction[];
  today_count: number;
  today_total: number;
};
