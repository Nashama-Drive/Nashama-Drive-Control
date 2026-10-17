import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Download,
  ExternalLink,
  KeyRound,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldOff,
  Trash2,
  WalletCards,
} from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
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
import { googleMapsUrl, type Coordinates } from "@/lib/maps";
import type { Agent } from "@/lib/types";

type CenterForm = {
  name: string;
  owner: string;
  phone: string;
  location: string;
  latitude: string;
  longitude: string;
};

const emptyForm = (): CenterForm => ({
  name: "",
  owner: "",
  phone: "",
  location: "",
  latitude: "",
  longitude: "",
});

const coordinatesOf = (form: CenterForm) => ({
  latitude: form.latitude === "" ? null : Number(form.latitude),
  longitude: form.longitude === "" ? null : Number(form.longitude),
});

const formFromAgent = (agent: Agent): CenterForm => ({
  name: agent.name,
  owner: agent.owner_name,
  phone: agent.phone,
  location: agent.location,
  latitude: agent.latitude == null ? "" : String(agent.latitude),
  longitude: agent.longitude == null ? "" : String(agent.longitude),
});

const phoneLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "962")}`;

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
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "account">("view");
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const [mapFor, setMapFor] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<CenterForm>(emptyForm);
  const [editForm, setEditForm] = useState<CenterForm>(emptyForm);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [balance, setBalance] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = agents.find((item) => item.id === selectedId) ?? null;
  const balanceAgent = agents.find((item) => item.id === balanceId) ?? null;
  const mapForm = mapFor === "create" ? form : editForm;
  const visibleAgents = agents.filter((agent) =>
    [agent.id, agent.name, agent.owner_name, agent.phone, agent.location]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const openDetails = (id: string) => {
    setSelectedId(id);
    setMode("view");
    setError("");
  };

  const rowKey = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openDetails(id);
    }
  };

  const act = async (name: string, params: Record<string, unknown>, success: string) => {
    setSaving(true);
    setError("");
    try {
      const { error: requestError } = await rpc(name, { p_session_token: token, ...params });
      if (requestError) {
        setError(`تعذر تنفيذ الطلب: ${requestError.message}`);
        return false;
      }
      onMessage(success);
      await onRefresh();
      return true;
    } catch {
      setError("تعذر الاتصال. حاول مرة أخرى.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createAgent = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data, error: requestError } = await rpc<{ id: string }[]>(
        "create_nashama_agent",
        {
          p_session_token: token,
          p_name: form.name.trim(),
          p_owner_name: form.owner.trim(),
          p_phone: form.phone.trim(),
          p_location: form.location.trim(),
          p_latitude: coordinatesOf(form).latitude,
          p_longitude: coordinatesOf(form).longitude,
        },
      );
      if (requestError) {
        setError(`تعذر إنشاء المركز: ${requestError.message}`);
        return;
      }
      setCreating(false);
      setForm(emptyForm());
      setSelectedId(data?.[0]?.id ?? null);
      setMode("view");
      onMessage("تم إنشاء المركز. افتح تفاصيله لإنشاء حساب دخول للوكيل.");
      await onRefresh();
    } catch {
      setError("تعذر الاتصال. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const updateAgent = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (
      await act(
        "update_nashama_agent",
        {
          p_agent_id: selected.id,
          p_name: editForm.name.trim(),
          p_owner_name: editForm.owner.trim(),
          p_phone: editForm.phone.trim(),
          p_location: editForm.location.trim(),
          p_latitude: coordinatesOf(editForm).latitude,
          p_longitude: coordinatesOf(editForm).longitude,
        },
        "تم تعديل بيانات مركز الشحن.",
      )
    ) setMode("view");
  };

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (password.length < 8 || password !== confirmation) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل ومتطابقة في الحقلين.");
      return;
    }
    const exists = Boolean(selected.has_account);
    if (
      await act(
        exists ? "reset_nashama_agent_password" : "create_nashama_agent_account",
        { p_agent_id: selected.id, p_password: password },
        exists
          ? "تم تغيير كلمة مرور حساب الوكيل. عليه تسجيل الدخول مجدداً."
          : isDemoMode()
            ? "تم إنشاء حساب الوكيل. يعمل تسجيل الدخول حالياً على هذا الجهاز فقط حتى ربط قاعدة بيانات مشتركة."
            : "تم إنشاء حساب الوكيل. يمكنه الدخول برقم هاتف المركز وكلمة المرور المحددة.",
      )
    ) {
      setPassword("");
      setConfirmation("");
      setMode("view");
    }
  };

  const toggleAccount = async () => {
    if (!selected?.has_account) return;
    await act(
      "set_nashama_agent_account_status",
      { p_agent_id: selected.id, p_is_active: selected.status !== "active" },
      selected.status === "active" ? "تم تعطيل حساب الوكيل ومنع دخوله." : "تم تفعيل حساب الوكيل.",
    );
  };

  const removeAccount = async () => {
    if (!selected || !window.confirm("حذف حساب دخول الوكيل؟ سيبقى المركز ورصيده وسجل عملياته محفوظاً.")) return;
    await act("delete_nashama_agent_account", { p_agent_id: selected.id }, "تم حذف حساب الدخول مع الإبقاء على المركز.");
  };

  const removeAgent = async () => {
    if (!selected || !window.confirm("حذف مركز الشحن نهائياً؟ سيُلغى حساب دخوله، مع الإبقاء على المعاملات السابقة لأغراض المحاسبة.")) return;
    if (await act("delete_nashama_agent", { p_agent_id: selected.id }, "تم حذف مركز الشحن.")) {
      setSelectedId(null);
    }
  };

  const updateBalance = async (event: FormEvent) => {
    event.preventDefault();
    if (!balanceAgent) return;
    if (
      await act(
        "set_nashama_agent_balance",
        { p_agent_id: balanceAgent.id, p_balance: Number(balance) },
        "تم تحديث رصيد المركز.",
      )
    ) setBalanceId(null);
  };

  const exportAgents = () =>
    downloadCsv(
      "nashama-agents.csv",
      ["المعرف", "المركز", "صاحب المكان", "الهاتف", "العنوان", "خط العرض", "خط الطول", "الرصيد", "الحساب"],
      visibleAgents.map((agent) => [
        agent.id,
        agent.name,
        agent.owner_name,
        agent.phone,
        agent.location,
        agent.latitude ?? "",
        agent.longitude ?? "",
        agent.available_balance,
        agent.has_account ? (agent.status === "active" ? "نشط" : "معطل") : "غير منشأ",
      ]),
    );

  const coordinatesInput = (value: CenterForm, setValue: (next: CenterForm) => void) => (
    <>
      <label>
        خط العرض
        <input
          type="number"
          step="any"
          min="-90"
          max="90"
          value={value.latitude}
          onChange={(event) => setValue({ ...value, latitude: event.target.value })}
          placeholder="يُحدد من الخريطة"
          dir="ltr"
        />
      </label>
      <label>
        خط الطول
        <input
          type="number"
          step="any"
          min="-180"
          max="180"
          value={value.longitude}
          onChange={(event) => setValue({ ...value, longitude: event.target.value })}
          placeholder="يُحدد من الخريطة"
          dir="ltr"
        />
      </label>
    </>
  );

  const centerFields = (
    value: CenterForm,
    setValue: (next: CenterForm) => void,
    purpose: "create" | "edit",
  ) => (
    <>
      <div className="form-grid">
        <label>
          اسم المركز
          <input required value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} />
        </label>
        <label>
          اسم صاحب المكان
          <input required value={value.owner} onChange={(event) => setValue({ ...value, owner: event.target.value })} />
        </label>
        <label>
          رقم هاتف الوكيل (رقم الدخول)
          <input required type="tel" dir="ltr" value={value.phone} onChange={(event) => setValue({ ...value, phone: event.target.value })} />
        </label>
        <label className="wide">
          عنوان الموقع
          <input required value={value.location} onChange={(event) => setValue({ ...value, location: event.target.value })} placeholder="المدينة، الحي، الشارع أو حدده على الخريطة" />
        </label>
        {coordinatesInput(value, setValue)}
      </div>
      <div className="map-form-action">
        <button type="button" onClick={() => setMapFor(purpose)}>
          <MapPin size={17} />
          {value.latitude && value.longitude ? "تغيير الموقع على الخريطة" : "تحديد الموقع على الخريطة"}
        </button>
        {value.latitude && value.longitude && (
          <a
            href={googleMapsUrl(Number(value.latitude), Number(value.longitude))}
            target="_blank"
            rel="noopener noreferrer"
          >
            فتح في خرائط Google <ExternalLink size={14} />
          </a>
        )}
      </div>
    </>
  );

  return (
    <>
      <PageIntro
        eyebrow="الشبكة المالية"
        title="وكلاء الشحن"
        description="إدارة المراكز ومواقعها وحسابات دخول الوكلاء من مكان واحد."
        action={
          <button className="red-button compact" onClick={() => { setError(""); setCreating(true); }}>
            <Plus size={17} /> إضافة مركز شحن
          </button>
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="مراكز الشحن"
          subtitle={`${visibleAgents.length} من ${agents.length} مركز مسجل`}
          icon={<WalletCards size={18} />}
          options={[
            { label: "تحديث البيانات", icon: <RefreshCw size={15} />, onClick: onRefresh },
            { label: "تنزيل النتائج بصيغة CSV", icon: <Download size={15} />, onClick: exportAgents },
          ]}
        />
        <TableToolbar value={query} onChange={setQuery} placeholder="ابحث باسم المركز أو الموقع أو الهاتف..." />
        <div className="admin-table">
          <div className="table-head agent-head">
            <span>المركز وصاحبه</span><span>الموقع</span><span>الرصيد</span><span>استخدام اليوم</span><span>استخدام الشهر</span>
          </div>
          {visibleAgents.map((agent) => (
            <div
              className="table-row entity-row agent-head"
              role="button"
              tabIndex={0}
              key={agent.id}
              aria-label={`عرض تفاصيل مركز ${agent.name}`}
              onClick={() => openDetails(agent.id)}
              onKeyDown={(event) => rowKey(event, agent.id)}
            >
              <div className="person-cell">
                <div className="table-avatar agent"><WalletCards size={16} /></div>
                <div>
                  <strong>{agent.name}</strong>
                  <small>{agent.owner_name} · {agent.phone}</small>
                  <small className={agent.has_account ? (agent.status === "active" ? "entity-account-active" : "entity-account-blocked") : "entity-account-muted"}>
                    {agent.has_account ? (agent.status === "active" ? "حساب الوكيل نشط" : "حساب الوكيل معطل") : "لم يُنشأ حساب دخول"}
                  </small>
                </div>
              </div>
              <a
                className="location-link"
                href={googleMapsUrl(agent.latitude, agent.longitude, agent.location)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <MapPin size={14} /> {agent.location}
              </a>
              <button
                type="button"
                className="money-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setError("");
                  setBalance(String(agent.available_balance));
                  setBalanceId(agent.id);
                }}
              >
                {formatMoney(agent.available_balance)} د.أ <Plus size={13} />
              </button>
              <span>{formatMoney(agent.daily_spend)} د.أ</span>
              <span>{formatMoney(agent.monthly_spend)} د.أ</span>
            </div>
          ))}
          {!visibleAgents.length && (
            <EmptyState text={agents.length ? "لا توجد مراكز تطابق البحث." : "لا توجد مراكز شحن بعد. أضف أول مركز من الزر أعلاه."} />
          )}
        </div>
      </section>

      {creating && (
        <Modal className="entity-dialog">
          <ModalTitle eyebrow="شبكة الوكلاء" title="إضافة مركز شحن" onClose={() => setCreating(false)} />
          <form onSubmit={(event) => void createAgent(event)}>
            {centerFields(form, setForm, "create")}
            <p className="location-note"><KeyRound size={15} /> بعد حفظ المركز، افتح تفاصيله لإنشاء حساب دخول للوكيل بكلمة مرور تختارها.</p>
            {error && <p className="entity-error" role="alert">{error}</p>}
            <ModalActions saving={saving} label="حفظ المركز" onCancel={() => setCreating(false)} />
          </form>
        </Modal>
      )}

      {selected && (
        <Modal className="entity-dialog">
          <ModalTitle
            eyebrow={mode === "account" ? "صلاحيات الوكيل" : "شبكة الوكلاء"}
            title={mode === "edit" ? "تعديل بيانات المركز" : mode === "account" ? (selected.has_account ? "تغيير كلمة مرور الوكيل" : "إنشاء حساب للوكيل") : selected.name}
            onClose={() => { setSelectedId(null); setMode("view"); }}
          />
          {mode === "view" && (
            <>
              <div className="entity-details-grid">
                <div><span>رقم المركز</span><strong dir="ltr">{selected.id}</strong></div>
                <div><span>اسم المركز</span><strong>{selected.name}</strong></div>
                <div><span>صاحب المكان</span><strong>{selected.owner_name}</strong></div>
                <div><span>رقم الهاتف ورقم الدخول</span><strong dir="ltr">{selected.phone}</strong></div>
                <div className="wide"><span>عنوان الموقع</span><strong>{selected.location}</strong></div>
                <div><span>خط العرض</span><strong dir="ltr">{selected.latitude ?? "غير محدد"}</strong></div>
                <div><span>خط الطول</span><strong dir="ltr">{selected.longitude ?? "غير محدد"}</strong></div>
                <div><span>الرصيد المتاح</span><strong className="money-text">{formatMoney(selected.available_balance)} د.أ</strong></div>
                <div><span>استخدام اليوم / الشهر</span><strong>{formatMoney(selected.daily_spend)} / {formatMoney(selected.monthly_spend)} د.أ</strong></div>
                <div className="wide"><span>حساب دخول الوكيل</span><strong className={selected.has_account ? (selected.status === "active" ? "entity-account-active" : "entity-account-blocked") : "entity-account-muted"}>{selected.has_account ? (selected.status === "active" ? "نشط — يمكنه تسجيل الدخول" : "معطل — مُنع من الدخول") : "لم يتم إنشاء حساب دخول بعد"}</strong></div>
              </div>
              <div className="entity-links">
                <a href={googleMapsUrl(selected.latitude, selected.longitude, selected.location)} target="_blank" rel="noopener noreferrer"><MapPin size={15} /> فتح الموقع في خرائط Google</a>
                <a href={`tel:${selected.phone}`}><Phone size={15} /> اتصال</a>
                <a href={phoneLink(selected.phone)} target="_blank" rel="noopener noreferrer">واتساب</a>
              </div>
              <div className="entity-actions">
                <h4>إدارة المركز والحساب</h4>
                <div className="entity-action-grid">
                  <button type="button" className="entity-action primary" onClick={() => { setError(""); setPassword(""); setConfirmation(""); setMode("account"); }}>
                    <KeyRound size={16} /> {selected.has_account ? "تغيير كلمة المرور" : "إنشاء حساب للوكيل"}
                  </button>
                  <button type="button" className="entity-action" onClick={() => { setError(""); setEditForm(formFromAgent(selected)); setMode("edit"); }}>
                    <Pencil size={16} /> تعديل بيانات المركز والموقع
                  </button>
                  <button type="button" className="entity-action" onClick={() => { setError(""); setEditForm(formFromAgent(selected)); setMode("edit"); setMapFor("edit"); }}>
                    <MapPin size={16} /> تحديد الموقع على الخريطة
                  </button>
                  {selected.has_account && (
                    <button type="button" className="entity-action" disabled={saving} onClick={() => void toggleAccount()}>
                      <ShieldOff size={16} /> {selected.status === "active" ? "تعطيل حساب الوكيل" : "تفعيل حساب الوكيل"}
                    </button>
                  )}
                  <button type="button" className="entity-action" onClick={() => { setError(""); setBalance(String(selected.available_balance)); setBalanceId(selected.id); }}>
                    <WalletCards size={16} /> تعديل الرصيد
                  </button>
                  {selected.has_account && (
                    <button type="button" className="entity-action danger" disabled={saving} onClick={() => void removeAccount()}>
                      <Trash2 size={16} /> حذف حساب الدخول فقط
                    </button>
                  )}
                  <button type="button" className="entity-action danger" disabled={saving} onClick={() => void removeAgent()}>
                    <Trash2 size={16} /> حذف المركز بالكامل
                  </button>
                </div>
              </div>
            </>
          )}
          {mode === "edit" && (
            <form onSubmit={(event) => void updateAgent(event)}>
              {centerFields(editForm, setEditForm, "edit")}
              <p className="location-note">تغيير رقم الهاتف سيغيّر رقم دخول الوكيل ويُنهي الجلسات الحالية.</p>
              {error && <p className="entity-error" role="alert">{error}</p>}
              <ModalActions saving={saving} label="حفظ التعديلات" onCancel={() => setMode("view")} />
            </form>
          )}
          {mode === "account" && (
            <form onSubmit={(event) => void saveAccount(event)}>
              <p className="location-note"><KeyRound size={15} /> رقم دخول الوكيل: <b dir="ltr">{selected.phone}</b>. حدد كلمة مرور خاصة به، ولا تُعرض بعد الحفظ.</p>
              {isDemoMode() && (
                <p className="location-note">حسابات الوضع المحلي تعمل على هذا المتصفح فقط. دخول الوكيل من جهاز آخر يتطلب ربط قاعدة بيانات مشتركة.</p>
              )}
              <label>كلمة المرور الجديدة
                <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ثمانية أحرف على الأقل" />
              </label>
              <label>تأكيد كلمة المرور
                <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="أعد إدخال كلمة المرور" />
              </label>
              {error && <p className="entity-error" role="alert">{error}</p>}
              <ModalActions saving={saving} label={selected.has_account ? "تغيير كلمة المرور" : "إنشاء الحساب"} onCancel={() => setMode("view")} />
            </form>
          )}
          {mode === "view" && error && <p className="entity-error" role="alert">{error}</p>}
        </Modal>
      )}

      {balanceAgent && (
        <Modal className="balance-dialog">
          <ModalTitle eyebrow="المحفظة" title={`تعديل رصيد ${balanceAgent.name}`} onClose={() => setBalanceId(null)} />
          <form onSubmit={(event) => void updateBalance(event)}>
            <label>الرصيد الجديد بالدينار الأردني
              <input required min="0" step="0.01" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} />
            </label>
            <div className="balance-preview">الرصيد الحالي <strong>{formatMoney(balanceAgent.available_balance)} د.أ</strong></div>
            {error && <p className="entity-error" role="alert">{error}</p>}
            <ModalActions saving={saving} label="تحديث الرصيد" onCancel={() => setBalanceId(null)} />
          </form>
        </Modal>
      )}

      {mapFor && (
        <LocationPicker
          latitude={coordinatesOf(mapForm).latitude}
          longitude={coordinatesOf(mapForm).longitude}
          address={mapForm.location}
          onClose={() => setMapFor(null)}
          onConfirm={(point: Coordinates) => {
            const update = (value: CenterForm) => ({
              ...value,
              latitude: String(point.latitude),
              longitude: String(point.longitude),
              location: value.location.trim() || `${point.latitude}, ${point.longitude}`,
            });
            if (mapFor === "create") setForm((value) => update(value));
            else setEditForm((value) => update(value));
            setMapFor(null);
          }}
        />
      )}
    </>
  );
}