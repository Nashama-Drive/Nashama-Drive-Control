import { useState, type FormEvent } from "react";
import { Download, MapPin, Plus, RefreshCw, WalletCards } from "lucide-react";
import {
  EmptyState,
  Modal,
  ModalActions,
  ModalTitle,
  PageIntro,
  PanelHeading,
  TableToolbar,
} from "@/components/ui";
import { isDemoMode, rpc } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { formatMoney } from "@/lib/format";
import type { Agent } from "@/lib/types";

export default function Agents({
  agents,
  token,
  onRefresh,
  onMessage,
}: {
  agents: Agent[];
  token: string;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    owner: "",
    phone: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [balance, setBalance] = useState("");

  const createAgent = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await rpc("create_nashama_agent", {
      p_session_token: token,
      p_name: form.name,
      p_owner_name: form.owner,
      p_phone: form.phone,
      p_location: form.location,
      p_latitude: form.latitude ? Number(form.latitude) : null,
      p_longitude: form.longitude ? Number(form.longitude) : null,
    });
    setSaving(false);
    if (error) {
      onMessage("تعذر إضافة مركز الشحن. تأكد من إكمال البيانات.");
      return;
    }
    setForm({
      name: "",
      owner: "",
      phone: "",
      location: "",
      latitude: "",
      longitude: "",
    });
    setOpen(false);
    onMessage(
      isDemoMode()
        ? `تمت الإضافة. تسجيل دخول الوكيل: ${form.phone} / agent123`
        : "تمت إضافة مركز الشحن برصيد صفر.",
    );
    await onRefresh();
  };

  const openBalance = (agent: Agent) => {
    setSelected(agent);
    setBalance(String(agent.available_balance));
  };

  const updateBalance = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { error } = await rpc("set_nashama_agent_balance", {
      p_session_token: token,
      p_agent_id: selected.id,
      p_balance: Number(balance),
    });
    setSaving(false);
    if (error) {
      onMessage("تعذر تحديث الرصيد.");
      return;
    }
    setSelected(null);
    onMessage("تم تحديث رصيد المركز بنجاح.");
    await onRefresh();
  };

  const visibleAgents = agents.filter((agent) =>
    [agent.name, agent.owner_name, agent.phone, agent.location]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const exportAgents = () =>
    downloadCsv(
      "nashama-agents.csv",
      ["اسم المركز", "صاحب المكان", "رقم الهاتف", "الموقع", "الرصيد", "استخدام اليوم", "استخدام الشهر"],
      visibleAgents.map((agent) => [
        agent.name,
        agent.owner_name,
        agent.phone,
        agent.location,
        agent.available_balance,
        agent.daily_spend,
        agent.monthly_spend,
      ]),
    );

  return (
    <>
      <PageIntro
        eyebrow="الشبكة المالية"
        title="وكلاء الشحن"
        description="أضف مراكز الشحن وحدد موقعها وصاحبها ورصيدها من مكان واحد."
        action={
          <button className="red-button compact" onClick={() => setOpen(true)}>
            <Plus size={17} /> إضافة مركز شحن
          </button>
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="مراكز الشحن"
          subtitle={`${visibleAgents.length} من ${agents.length} مركز مسجل · الأرصدة تبدأ من صفر`}
          icon={<WalletCards size={18} />}
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportAgents,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث باسم المركز أو الموقع أو الهاتف..."
        />
        <div className="admin-table">
          <div className="table-head agent-head">
            <span>المركز وصاحبه</span>
            <span>الموقع</span>
            <span>الرصيد</span>
            <span>استخدام اليوم</span>
            <span>استخدام الشهر</span>
          </div>
          {visibleAgents.map((agent) => (
            <div className="table-row" key={agent.id}>
              <div className="person-cell">
                <div className="table-avatar agent">
                  <WalletCards size={16} />
                </div>
                <div>
                  <strong>{agent.name}</strong>
                  <small>
                    {agent.owner_name} · {agent.phone}
                  </small>
                </div>
              </div>
              <a
                className="location-link"
                href={
                  agent.latitude != null && agent.longitude != null
                    ? `https://www.google.com/maps?q=${agent.latitude},${agent.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agent.location)}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={14} />
                {agent.location}
              </a>
              <button className="money-button" onClick={() => openBalance(agent)}>
                {formatMoney(agent.available_balance)} د.أ <Plus size={13} />
              </button>
              <span>{formatMoney(agent.daily_spend)} د.أ</span>
              <span>{formatMoney(agent.monthly_spend)} د.أ</span>
            </div>
          ))}
          {!visibleAgents.length && (
            <EmptyState
              text={
                agents.length
                  ? "لا توجد مراكز تطابق البحث."
                  : "لا توجد مراكز شحن بعد. أضف أول مركز من الزر أعلاه."
              }
            />
          )}
        </div>
      </section>

      {open && (
        <Modal>
          <ModalTitle
            eyebrow="شبكة الوكلاء"
            title="إضافة مركز شحن"
            onClose={() => setOpen(false)}
          />
          <form onSubmit={createAgent}>
            <div className="form-grid">
              <label>
                اسم المركز
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                اسم صاحب المكان
                <input
                  required
                  value={form.owner}
                  onChange={(event) => setForm({ ...form, owner: event.target.value })}
                />
              </label>
              <label>
                رقم الهاتف
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <label className="wide">
                عنوان الموقع
                <input
                  required
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  placeholder="المدينة، الشارع، وصف الموقع"
                />
              </label>
              <label>
                خط العرض
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(event) =>
                    setForm({ ...form, latitude: event.target.value })
                  }
                  placeholder="اختياري"
                />
              </label>
              <label>
                خط الطول
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(event) =>
                    setForm({ ...form, longitude: event.target.value })
                  }
                  placeholder="اختياري"
                />
              </label>
            </div>
            <div className="location-note">
              <MapPin size={16} /> سيُفتح موقع المركز في خرائط Google بعد الحفظ
            </div>
            <ModalActions
              saving={saving}
              label="حفظ المركز"
              onCancel={() => setOpen(false)}
            />
          </form>
        </Modal>
      )}

      {selected && (
        <Modal>
          <ModalTitle
            eyebrow="المحفظة"
            title={`إضافة رصيد إلى ${selected.name}`}
            onClose={() => setSelected(null)}
          />
          <form onSubmit={updateBalance}>
            <label>
              الرصيد الجديد بالدينار الأردني
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
              />
            </label>
            <div className="balance-preview">
              الرصيد الحالي <strong>{formatMoney(selected.available_balance)} د.أ</strong>
            </div>
            <ModalActions
              saving={saving}
              label="تحديث الرصيد"
              onCancel={() => setSelected(null)}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
