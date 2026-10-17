import {
  Car,
  Receipt,
  Smartphone,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { EmptyState, PageIntro } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { AgentDashboard } from "@/lib/types";

export default function Home({
  dashboard,
  onNavigate,
}: {
  dashboard: AgentDashboard;
  onNavigate: (page: string) => void;
}) {
  const agent = dashboard.agent;
  const recent = dashboard.transactions.slice(0, 5);
  const activeDriverCount = dashboard.drivers.filter(
    (driver) => driver.is_active,
  ).length;

  return (
    <>
      <PageIntro
        eyebrow="مرحباً بك"
        title={agent.name}
        description={`${agent.location} · ${agent.owner_name}`}
      />

      <div className="metric-grid">
        <div className="metric-card gold">
          <span className="metric-icon">
            <Wallet size={28} />
          </span>
          <div>
            <span>الرصيد المتاح</span>
            <strong>
              {formatMoney(agent.available_balance)} <small>د.أ</small>
            </strong>
            <small>رصيد قابل للشحن</small>
          </div>
        </div>
        <div className="metric-card red">
          <span className="metric-icon">
            <TrendingUp size={28} />
          </span>
          <div>
            <span>عمليات اليوم</span>
            <strong>{dashboard.today_count}</strong>
            <small>{formatMoney(dashboard.today_total)} د.أ اليوم</small>
          </div>
        </div>
        <div className="metric-card slate">
          <span className="metric-icon">
            <Receipt size={28} />
          </span>
          <div>
            <span>إنفاق الشهر</span>
            <strong>
              {formatMoney(agent.monthly_spend)} <small>د.أ</small>
            </strong>
            <small>إجمالي هذا الشهر</small>
          </div>
        </div>
        <div className="metric-card orange">
          <span className="metric-icon">
            <Car size={28} />
          </span>
          <div>
            <span>السائقون</span>
            <strong>{activeDriverCount}</strong>
            <small>سائق متاح للشحن</small>
          </div>
        </div>
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <span className="panel-heading-icon">
              <TrendingUp size={18} />
            </span>
            <div>
              <h3>آخر العمليات</h3>
              <p>معاملات الشحن الأخيرة</p>
            </div>
            <button className="dots" onClick={() => onNavigate("history")}>
              عرض الكل
            </button>
          </div>
          <div className="activity-list">
            {recent.length ? (
              recent.map((transaction) => (
                <div className="activity-row" key={transaction.id}>
                  <span className="activity-icon gold">
                    <TrendingUp size={18} />
                  </span>
                  <div>
                    <strong>{transaction.driver_name}</strong>
                    <small>
                      {formatMoney(transaction.amount)} د.أ ·{" "}
                      {transaction.reference_number}
                    </small>
                  </div>
                  <span className="tx-time">
                    {formatDateTime(transaction.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="لا توجد عمليات بعد. ابدأ بشحن سائق." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span className="panel-heading-icon">
              <Zap size={18} />
            </span>
            <div>
              <h3>إجراءات سريعة</h3>
              <p>ابدأ عملية شحن الآن</p>
            </div>
          </div>
          <div className="quick-actions">
            <button onClick={() => onNavigate("topup")}>
              <TrendingUp size={19} />
              <span>شحن سائق جديد</span>
            </button>
            <button onClick={() => onNavigate("history")}>
              <Receipt size={19} />
              <span>سجل المعاملات</span>
            </button>
            <button onClick={() => onNavigate("profile")}>
              <Smartphone size={19} />
              <span>إعدادات الحساب</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
