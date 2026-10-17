import { useState, type FormEvent } from "react";
import { Car, Download, Pencil, Phone, Plus, RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import {
  EmptyState,
  ImagePicker,
  Modal,
  ModalActions,
  ModalTitle,
  PageIntro,
  PanelHeading,
  TableToolbar,
} from "@/components/ui";
import { rpc } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { initials } from "@/lib/format";
import type { Driver } from "@/lib/types";

type DriverForm = {
  id: string;
  name: string;
  nationalId: string;
  plate: string;
  phone: string;
  avatar: string;
};

const emptyForm = (): DriverForm => ({
  id: "",
  name: "",
  nationalId: "",
  plate: "",
  phone: "",
  avatar: "",
});

const formFromDriver = (driver: Driver): DriverForm => ({
  id: driver.id,
  name: driver.name,
  nationalId: driver.national_id ?? "",
  plate: driver.vehicle_plate ?? "",
  phone: driver.phone,
  avatar: driver.avatar_url ?? "",
});

export default function Drivers({
  drivers,
  token,
  onRefresh,
  onMessage,
}: {
  drivers: Driver[];
  token: string;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [editForm, setEditForm] = useState<DriverForm>(emptyForm);
  const [error, setError] = useState("");

  const selected = drivers.find((item) => item.id === selectedId) ?? null;
  const visibleDrivers = drivers.filter((driver) =>
    [driver.id, driver.name, driver.phone, driver.vehicle_plate, driver.national_id]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

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

  const createDriver = async (event: FormEvent) => {
    event.preventDefault();
    if (
      await act(
        "create_nashama_driver",
        {
          p_driver_id: form.id.trim().toUpperCase(),
          p_name: form.name.trim(),
          p_national_id: form.nationalId.trim(),
          p_vehicle_plate: form.plate.trim(),
          p_phone: form.phone.trim(),
          p_avatar_url: form.avatar || null,
        },
        "تمت إضافة السائق إلى الأسطول.",
      )
    ) {
      setCreating(false);
      setSelectedId(form.id.trim().toUpperCase());
      setEditing(false);
      setForm(emptyForm());
    }
  };

  const saveDriver = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (
      await act(
        "update_nashama_driver",
        {
          p_driver_id: selected.id,
          p_name: editForm.name.trim(),
          p_national_id: editForm.nationalId.trim(),
          p_vehicle_plate: editForm.plate.trim(),
          p_phone: editForm.phone.trim(),
          p_avatar_url: editForm.avatar || null,
        },
        "تم حفظ بيانات السائق.",
      )
    ) setEditing(false);
  };

  const toggleDriver = async () => {
    if (!selected) return;
    await act(
      "set_nashama_driver_status",
      { p_driver_id: selected.id, p_is_active: !selected.is_active },
      selected.is_active ? "تم إيقاف السائق ومنع شحنه." : "تم تفعيل السائق.",
    );
  };

  const deleteDriver = async () => {
    if (!selected || !window.confirm("حذف السائق نهائياً من الأسطول؟ ستبقى المعاملات القديمة محفوظة.")) return;
    if (await act("delete_nashama_driver", { p_driver_id: selected.id }, "تم حذف السائق من الأسطول.")) {
      setSelectedId(null);
    }
  };

  const exportDrivers = () =>
    downloadCsv(
      "nashama-drivers.csv",
      ["المعرف", "الاسم", "رقم الهاتف", "رقم اللوحة", "رقم الهوية", "الحالة"],
      visibleDrivers.map((driver) => [
        driver.id,
        driver.name,
        driver.phone,
        driver.vehicle_plate,
        driver.national_id,
        driver.is_active ? "متاح" : "موقوف",
      ]),
    );

  const fields = (value: DriverForm, setValue: (next: DriverForm) => void, isEdit: boolean) => (
    <div className="form-grid">
      <label>
        معرف السائق
        <input
          required
          readOnly={isEdit}
          value={value.id}
          onChange={(event) => setValue({ ...value, id: event.target.value.toUpperCase() })}
          placeholder="مثال: ND-2045"
          dir="ltr"
        />
      </label>
      <label>
        الاسم الكامل
        <input required value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} />
      </label>
      <label>
        رقم الهوية
        <input required value={value.nationalId} onChange={(event) => setValue({ ...value, nationalId: event.target.value })} />
      </label>
      <label>
        رقم لوحة السيارة
        <input required value={value.plate} onChange={(event) => setValue({ ...value, plate: event.target.value })} />
      </label>
      <label>
        رقم الهاتف
        <input required type="tel" dir="ltr" value={value.phone} onChange={(event) => setValue({ ...value, phone: event.target.value })} />
      </label>
      <ImagePicker label="صورة السائق" value={value.avatar} onChange={(avatar) => setValue({ ...value, avatar })} />
    </div>
  );

  return (
    <>
      <PageIntro
        eyebrow="الأسطول"
        title="سجل السائقين"
        description="أضف السائقين، واستعرض بيانات كل كابتن وعدل حالته من مكان واحد."
        action={
          <button className="red-button compact" onClick={() => { setError(""); setCreating(true); }}>
            <Plus size={17} /> إضافة سائق
          </button>
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="السائقون المسجلون"
          subtitle={`${visibleDrivers.length} من ${drivers.length} سائق`}
          icon={<Car size={18} />}
          options={[
            { label: "تحديث البيانات", icon: <RefreshCw size={15} />, onClick: onRefresh },
            { label: "تنزيل النتائج بصيغة CSV", icon: <Download size={15} />, onClick: exportDrivers },
          ]}
        />
        <TableToolbar value={query} onChange={setQuery} placeholder="ابحث بالاسم أو المعرف أو الهاتف..." />
        <div className="admin-table">
          <div className="table-head driver-head">
            <span>السائق</span><span>المعرف</span><span>الهاتف</span><span>رقم اللوحة</span><span>رقم الهوية</span>
          </div>
          {visibleDrivers.map((driver) => (
            <button
              type="button"
              className="table-row driver-head entity-row"
              key={driver.id}
              onClick={() => { setError(""); setSelectedId(driver.id); setEditing(false); }}
              aria-label={`عرض بيانات السائق ${driver.name}`}
            >
              <div className="person-cell">
                <div className="table-avatar driver">
                  {driver.avatar_url ? <img src={driver.avatar_url} alt={`صورة ${driver.name}`} /> : initials(driver.name)}
                </div>
                <div>
                  <strong>{driver.name}</strong>
                  <small className={driver.is_active ? "entity-account-active" : "entity-account-blocked"}>
                    {driver.is_active ? "متاح في النظام" : "موقوف"}
                  </small>
                </div>
              </div>
              <span className="mono-text">{driver.id}</span>
              <span>{driver.phone}</span>
              <span>{driver.vehicle_plate || "—"}</span>
              <span>{driver.national_id || "—"}</span>
            </button>
          ))}
          {!visibleDrivers.length && (
            <EmptyState text={drivers.length ? "لا يوجد سائقون يطابقون البحث." : "لا يوجد سائقون مسجلون بعد. أضف أول سائق من الزر أعلاه."} />
          )}
        </div>
      </section>

      {creating && (
        <Modal className="entity-dialog">
          <ModalTitle eyebrow="إضافة إلى الأسطول" title="إضافة سائق" onClose={() => setCreating(false)} />
          <form onSubmit={(event) => void createDriver(event)}>
            {fields(form, setForm, false)}
            {error && <p className="entity-error" role="alert">{error}</p>}
            <ModalActions saving={saving} label="حفظ السائق" onCancel={() => setCreating(false)} />
          </form>
        </Modal>
      )}

      {selected && (
        <Modal className="entity-dialog">
          <ModalTitle
            eyebrow="بيانات الأسطول"
            title={editing ? "تعديل بيانات السائق" : selected.name}
            onClose={() => { setSelectedId(null); setEditing(false); }}
          />
          {editing ? (
            <form onSubmit={(event) => void saveDriver(event)}>
              {fields(editForm, setEditForm, true)}
              {error && <p className="entity-error" role="alert">{error}</p>}
              <ModalActions saving={saving} label="حفظ التعديلات" onCancel={() => setEditing(false)} />
            </form>
          ) : (
            <>
              <div className="entity-profile">
                <div className="profile-large-avatar">
                  {selected.avatar_url ? <img src={selected.avatar_url} alt={`صورة ${selected.name}`} /> : initials(selected.name)}
                </div>
                <div><strong>{selected.name}</strong><small>{selected.is_active ? "سائق متاح للشحن" : "حساب السائق موقوف"}</small></div>
              </div>
              <div className="entity-details-grid">
                <div><span>معرف السائق</span><strong dir="ltr">{selected.id}</strong></div>
                <div><span>الحالة</span><strong className={selected.is_active ? "entity-account-active" : "entity-account-blocked"}>{selected.is_active ? "نشط" : "موقوف"}</strong></div>
                <div><span>الاسم الكامل</span><strong>{selected.name}</strong></div>
                <div><span>رقم الهاتف</span><strong dir="ltr">{selected.phone}</strong></div>
                <div><span>رقم الهوية</span><strong dir="ltr">{selected.national_id || "غير مضاف"}</strong></div>
                <div><span>رقم لوحة السيارة</span><strong dir="ltr">{selected.vehicle_plate || "غير مضاف"}</strong></div>
              </div>
              <div className="entity-links">
                <a href={`tel:${selected.phone}`}><Phone size={15} /> اتصال</a>
                <a href={`https://wa.me/${selected.phone.replace(/\D/g, "").replace(/^0/, "962")}`} target="_blank" rel="noopener noreferrer">واتساب</a>
              </div>
              <div className="entity-actions">
                <h4>إدارة السائق</h4>
                <div className="entity-action-grid">
                  <button type="button" className="entity-action primary" onClick={() => { setEditForm(formFromDriver(selected)); setError(""); setEditing(true); }}>
                    <Pencil size={16} /> تعديل بيانات السائق
                  </button>
                  <button type="button" className="entity-action" disabled={saving} onClick={() => void toggleDriver()}>
                    <ShieldOff size={16} /> {selected.is_active ? "تعطيل السائق" : "تفعيل السائق"}
                  </button>
                  <button type="button" className="entity-action danger" disabled={saving} onClick={() => void deleteDriver()}>
                    <Trash2 size={16} /> حذف السائق
                  </button>
                </div>
              </div>
              {error && <p className="entity-error" role="alert">{error}</p>}
            </>
          )}
        </Modal>
      )}
    </>
  );
}