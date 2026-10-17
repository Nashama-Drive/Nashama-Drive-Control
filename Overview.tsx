import {
  ArrowDownLeft,
  Car,
  ChartColumn,
  ChevronLeft,
  ClipboardList,
  Download,
  FileWarning,
  Headphones,
  MapPin,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  UserCog,
  WalletCards,
  Zap,
} from "lucide-react";
import { PageIntro, PanelHeading } from "@/components/ui";
import { downloadCsv } from "@/lib/download";
import type { AdminDashboard } from "@/lib/types";

export default function Overview({
  dashboard,
  onNavigate,
  onRefresh,
}: {
  dashboard: AdminDashboard;
  onNavigate: (page: string) => void;
  onRefresh: () => void;
}) {
  const metrics = [
    {
      label: "إجمالي السائقين",
      value: dashboard.driver_count,
      detail: "سائق مسجل",
      icon: <Car />,
      tone: "red",
      page: "drivers",
    },
    {
      label: "وكلاء الشحن",
      value: dashboard.agent_count,
      detail: "وكيل نشط",
      icon: <WalletCards />,
      tone: "gold",
      page: "agents",
    },
    {
      label: "شكاوى مفتوحة",
      value: dashboard.open_complaints,
      detail: "تحتاج متابعة",
      icon: <FileWarning />,
      tone: "orange",
      page: "complaints",
    },
    {
      label: "مشاكل النظام",
      value: dashboard.open_issues,
      detail: "بلاغ مفتوح",
      icon: <ShieldAlert />,
      tone: "slate",
      page: "issues",
    },
    {
      label: "تقديمات جديدة",
      value:
        dashboard.applications.captains.filter((item) => item.status === "new")
          .length +
        dashboard.applications.agents.filter((item) => item.status === "new")
          .length +
        dashboard.applications.inquiries.filter((item) => item.status === "new")
          .length,
      detail: "بانتظار المراجعة",
      icon: <ClipboardList />,
      tone: "gold",
      page: "applications",
    },
  ];

  const latestComplaint = dashboard.complaints
    .filter((item) => item.status !== "resolved")
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  const latestIssue = dashboard.issues
    .filter((item) => item.status !== "resolved")
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  const applications = [
    ...dashboard.applications.captains,
    ...dashboard.applications.agents,
    ...dashboard.applications.inquiries,
  ];
  const pending =
    applications.filter((item) => item.status === "new").length +
    dashboard.complaints.filter((item) => item.status === "open").length +
    dashboard.issues.filter((item) => item.status === "open").length;
  const reviewing =
    applications.filter((item) => item.status === "reviewing").length +
    dashboard.complaints.filter((item) => item.status === "in_progress").length +
    dashboard.issues.filter((item) => item.status === "in_progress").length;
  const closed =
    applications.filter((item) =>
      ["approved", "rejected"].includes(item.status),
    ).length +
    dashboard.complaints.filter((item) => item.status === "resolved").length +
    dashboard.issues.filter((item) => item.status === "resolved").length;
  const total = pending + reviewing + closed;
  const pendingAngle = total ? (pending / total) * 360 : 0;
  const reviewingAngle = total ? ((pending + reviewing) / total) * 360 : 0;
  const exportOperations = () =>
    downloadCsv("nashama-operations.csv", ["الحالة", "العدد"], [
      ["بانتظار المراجعة", pending],
      ["قيد المتابعة", reviewing],
      ["مغلقة", closed],
      ["الإجمالي", total],
    ]);

  return (
    <>
      <PageIntro
        eyebrow="صباح الخير"
        title="مرحباً بك في مركز القيادة"
        description="تابع حركة منظومة نشامة درايف وأدر كل تفاصيل التشغيل من مكان واحد."
        action={
          <button className="outline-action" onClick={() => onNavigate("admins")}>
            <UserCog size={16} /> إدارة الصلاحيات
          </button>
        }
      />

      <div className="metric-grid">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            className={`metric-card ${metric.tone}`}
            onClick={() => onNavigate(metric.page)}
          >
            <span className="metric-icon">{metric.icon}</span>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>
                {metric.detail} <ChevronLeft size={12} />
              </small>
            </div>
          </button>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel chart-panel">
          <PanelHeading
            title="حالة الطلبات والبلاغات"
            subtitle="ملخص التقديمات والشكاوى ومشاكل النظام المسجلة"
            icon={<ChartColumn size={18} />}
            options={[
              {
                label: "تحديث بيانات اللوحة",
                icon: <RefreshCw size={15} />,
                onClick: onRefresh,
              },
              {
                label: "تنزيل ملخص التشغيل",
                icon: <Download size={15} />,
                onClick: exportOperations,
              },
            ]}
          />
          <div className="operation-visual">
            <div
              className="donut"
              style={{
                background: `radial-gradient(circle at center,#15191a 55%,transparent 56%), conic-gradient(${total ? `#c3262e 0deg ${pendingAngle}deg,#c09b34 ${pendingAngle}deg ${reviewingAngle}deg,#4a5650 ${reviewingAngle}deg 360deg` : "#303a34 0deg 360deg"})`,
              }}
            >
              <strong>{total}</strong>
              <small>إجمالي السجلات</small>
            </div>
            <div className="legend">
              <div className="legend-row">
                <i className="red" />
                <span>بانتظار المراجعة</span>
                <b>{pending}</b>
              </div>
              <div className="legend-row">
                <i className="gold" />
                <span>قيد المتابعة</span>
                <b>{reviewing}</b>
              </div>
              <div className="legend-row">
                <i className="slate" />
                <span>مغلقة</span>
                <b>{closed}</b>
              </div>
            </div>
          </div>
        </section>

        <section className="panel activity-panel">
          <PanelHeading
            title="آخر التنبيهات"
            subtitle="تحديثات تحتاج انتباهك"
            icon={<TriangleAlert size={18} />}
            action={
              <button
                className="dots"
                type="button"
                onClick={() => onNavigate("complaints")}
                aria-label="عرض الشكاوى"
              >
                عرض الكل
              </button>
            }
          />
          <div className="activity-list">
            <button
              className="activity-row activity-row-button"
              type="button"
              onClick={() => onNavigate("complaints")}
            >
              <span className="activity-icon red">
                <FileWarning />
              </span>
              <div>
                <strong>{latestComplaint?.subject ?? "لا توجد شكاوى جديدة"}</strong>
                <small>
                  {latestComplaint
                    ? "شكوى بانتظار المراجعة"
                    : "النظام يعمل دون تنبيهات"}
                </small>
              </div>
              <ChevronLeft size={15} />
            </button>
            <button
              className="activity-row activity-row-button"
              type="button"
              onClick={() => onNavigate("issues")}
            >
              <span className="activity-icon gold">
                <ShieldAlert />
              </span>
              <div>
                <strong>{latestIssue?.title ?? "كل الأنظمة مستقرة"}</strong>
                <small>
                  {latestIssue?.description ?? "لا توجد مشاكل مسجلة حالياً"}
                </small>
              </div>
              <ChevronLeft size={15} />
            </button>
          </div>
        </section>
      </div>

      <section className="panel quick-panel">
        <PanelHeading
          title="الوصول السريع"
          subtitle="إجراءات الإدارة الأكثر استخداماً"
          icon={<Zap size={18} />}
        />
        <div className="quick-actions">
          <button onClick={() => onNavigate("drivers")}>
            <Car size={19} />
            <span>سجل السائقين</span>
          </button>
          <button onClick={() => onNavigate("agents")}>
            <MapPin size={19} />
            <span>مواقع الوكلاء</span>
          </button>
          <button onClick={() => onNavigate("complaints")}>
            <Headphones size={19} />
            <span>مركز الشكاوى</span>
          </button>
          <button onClick={() => onNavigate("issues")}>
            <ArrowDownLeft size={19} />
            <span>مشاكل التطبيق</span>
          </button>
        </div>
      </section>
    </>
  );
}

