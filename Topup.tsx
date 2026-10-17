import { useState, type FormEvent } from "react";
import { Car, CircleCheck, Search, ShieldAlert, TrendingUp, X } from "lucide-react";
import { EmptyState, PanelHeading } from "@/components/ui";
import { rpc } from "@/lib/api";
import { formatMoney, initials } from "@/lib/format";
import type { AgentDashboard } from "@/lib/types";

const AMOUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

type Receipt = {
  ref: string;
  driverName: string;
  amount: number;
  newBalance: number;
};

export default function Topup({
  dashboard,
  token,
  onRefresh,
  onMessage,
}: {
  dashboard: AgentDashboard;
  token: string;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const matches = dashboard.drivers.filter(
    (driver) =>
      driver.is_active &&
      [driver.name, driver.id, driver.phone]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const selectedDriver = dashboard.drivers.find(
    (driver) => driver.id === driverId.toUpperCase() && driver.is_active,
  );
  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const total = validAmount ? Number(amount) + 1 : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDriver || !validAmount) {
      onMessage("اختر سائقاً متاحاً من القائمة أو أدخل معرفاً صحيحاً.");
      return;
    }
    setSaving(true);
    const { data, error } = await rpc<
      {
        reference_number: string;
        driver_name: string;
        amount: number;
        new_balance: number;
      }[]
    >("agent_topup_driver", {
      p_session_token: token,
      p_driver_id: selectedDriver.id,
      p_amount: Number(amount),
    });
    setSaving(false);
    if (error || !data?.[0]) {
      onMessage("تعذر إتمام الشحن. تأكد من الرصيد ومعرف السائق.");
      return;
    }
    setReceipt({
      ref: data[0].reference_number,
      driverName: data[0].driver_name,
      amount: data[0].amount,
      newBalance: data[0].new_balance,
    });
    setDriverId("");
    setAmount("");
    setQuery("");
    onMessage("تمت عملية الشحن بنجاح.");
    await onRefresh();
  };

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">عملية جديدة</span>
          <h2>شحن سائق</h2>
          <p>اختر السائق والمبلغ لإتمام عملية الشحن. عمولة الوكيل 1.000 د.أ لكل عملية.</p>
        </div>
      </div>

      {receipt && (
        <div className="receipt-banner">
          <CircleCheck size={24} />
          <div>
            <strong>تمت عملية الشحن بنجاح</strong>
            <span>
              تم شحن {receipt.driverName} بمبلغ {formatMoney(receipt.amount)} د.أ
            </span>
            <small>
              رقم المرجع: <b dir="ltr">{receipt.ref}</b> · الرصيد المتبقي:{" "}
              {formatMoney(receipt.newBalance)} د.أ
            </small>
          </div>
          <button onClick={() => setReceipt(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      <div className="agent-topup-grid">
        <section className="panel">
          <PanelHeading
            title="اختر السائق"
            subtitle="ابحث عن السائق بالاسم أو المعرف"
            icon={<Car size={18} />}
          />
          <div className="driver-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو المعرف..."
            />
          </div>
          <div className="driver-pick-list">
            {matches.map((driver) => (
              <button
                key={driver.id}
                className={driverId === driver.id ? "driver-pick selected" : "driver-pick"}
                onClick={() => {
                  setDriverId(driver.id);
                  setQuery("");
                }}
              >
                <div className="table-avatar driver">
                  {driver.avatar_url ? (
                    <img src={driver.avatar_url} alt="" />
                  ) : (
                    initials(driver.name)
                  )}
                </div>
                <div>
                  <strong>{driver.name}</strong>
                  <small>
                    {driver.id} · {driver.phone}
                  </small>
                </div>
                {driverId === driver.id && <CircleCheck size={18} />}
              </button>
            ))}
            {!matches.length && <EmptyState text="لا يوجد سائقون مطابقون" />}
          </div>
        </section>

        <section className="panel">
          <PanelHeading
            title="تفاصيل الشحن"
            subtitle="حدد المبلغ وأكد العملية"
            icon={<TrendingUp size={18} />}
          />
          <form onSubmit={submit} className="topup-form">
            {selectedDriver && (
              <div className="selected-driver-box">
                <div className="table-avatar driver">
                  {selectedDriver.avatar_url ? (
                    <img src={selectedDriver.avatar_url} alt="" />
                  ) : (
                    initials(selectedDriver.name)
                  )}
                </div>
                <div>
                  <strong>{selectedDriver.name}</strong>
                  <small>{selectedDriver.id}</small>
                </div>
                <button type="button" onClick={() => setDriverId("")}>
                  <X size={16} />
                </button>
              </div>
            )}

            <label>
              معرف السائق
              <input
                required
                value={driverId}
                onChange={(event) => setDriverId(event.target.value.toUpperCase())}
                placeholder="مثال: ND-1045"
                className="mono-text"
                dir="ltr"
              />
            </label>

            <div>
              <label className="amount-label">مبلغ الشحن (د.أ)</label>
              <div className="amount-grid">
                {AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      amount === String(value) ? "amount-chip selected" : "amount-chip"
                    }
                    onClick={() => setAmount(String(value))}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label className="custom-amount-label">
                أو أدخل مبلغاً آخر
                <input
                  type="number"
                  min="1"
                  step="0.25"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="مثال: 12.50"
                />
              </label>
            </div>

            <div className="charge-summary">
              <div>
                <span>مبلغ الشحن</span>
                <strong>{amount ? formatMoney(Number(amount)) : "—"} د.أ</strong>
              </div>
              <div>
                <span>عمولة الوكيل</span>
                <strong>1.000 د.أ</strong>
              </div>
              <div className="total-row">
                <span>الإجمالي المخصوم</span>
                <strong>{total ? formatMoney(total) : "—"} د.أ</strong>
              </div>
              <div className="balance-row">
                <span>رصيدك الحالي</span>
                <strong>
                  {formatMoney(dashboard.agent.available_balance)} د.أ
                </strong>
              </div>
              {total > dashboard.agent.available_balance && (
                <div className="insufficient-warning">
                  <ShieldAlert size={15} /> الرصيد غير كافٍ لإتمام العملية
                </div>
              )}
            </div>

            <button
              type="submit"
              className="gold-button"
              disabled={
                saving ||
                !selectedDriver ||
                !validAmount ||
                total > dashboard.agent.available_balance
              }
            >
              {saving ? "جاري المعالجة..." : "تأكيد الشحن"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
