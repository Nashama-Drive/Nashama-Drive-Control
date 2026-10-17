import { useState, type FormEvent } from "react";
import { Car, Download, Plus, RefreshCw } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    id: "",
    name: "",
    nationalId: "",
    plate: "",
    phone: "",
    avatar: "",
  });

  const createDriver = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await rpc("create_nashama_driver", {
      p_session_token: token,
      p_driver_id: form.id,
      p_name: form.name,
      p_national_id: form.nationalId,
      p_vehicle_plate: form.plate,
      p_phone: form.phone,
      p_avatar_url: form.avatar || null,
    });
    setSaving(false);
    if (error) {
      onMessage(
        "تعذر إضافة السائق. تأكد من أن المعرف غير مستخدم وأن البيانات مكتملة.",
      );
      return;
    }
    setForm({ id: "", name: "", nationalId: "", plate: "", phone: "", avatar: "" });
    setOpen(false);
    onMessage("تمت إضافة السائق بنجاح.");
    await onRefresh();
  };

  const visibleDrivers = drivers.filter((driver) =>
    [driver.id, driver.name, driver.phone, driver.vehicle_plate, driver.national_id]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

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

  return (
    <>
      <PageIntro
        eyebrow="الأسطول"
        title="سجل السائقين"
        description="أضف السائقين ببياناتهم الكاملة ليظهروا في تطبيق الكباتن والوكلاء."
        action={
          <button className="red-button compact" onClick={() => setOpen(true)}>
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
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportDrivers,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو المعرف أو الهاتف..."
        />
        <div className="admin-table">
          <div className="table-head driver-head">
            <span>السائق</span>
            <span>المعرف</span>
            <span>الهاتف</span>
            <span>رقم اللوحة</span>
            <span>رقم الهوية</span>
          </div>
          {visibleDrivers.map((driver) => (
            <div className="table-row" key={driver.id}>
              <div className="person-cell">
                <div className="table-avatar driver">
                  {driver.avatar_url ? (
                    <img src={driver.avatar_url} alt={`صورة ${driver.name}`} />
                  ) : (
                    initials(driver.name)
                  )}
                </div>
                <div>
                  <strong>{driver.name}</strong>
                  <small>{driver.is_active ? "متاح في النظام" : "موقوف"}</small>
                </div>
              </div>
              <span className="mono-text">{driver.id}</span>
              <span>{driver.phone}</span>
              <span>{driver.vehicle_plate || "—"}</span>
              <span>{driver.national_id || "—"}</span>
            </div>
          ))}
          {!visibleDrivers.length && (
            <EmptyState
              text={
                drivers.length
                  ? "لا يوجد سائقون يطابقون البحث."
                  : "لا يوجد سائقون مسجلون بعد. أضف أول سائق من الزر أعلاه."
              }
            />
          )}
        </div>
      </section>

      {open && (
        <Modal>
          <ModalTitle
            eyebrow="إضافة إلى الأسطول"
            title="إضافة سائق"
            onClose={() => setOpen(false)}
          />
          <form onSubmit={createDriver}>
            <div className="form-grid">
              <label>
                معرف السائق
                <input
                  required
                  value={form.id}
                  onChange={(event) =>
                    setForm({ ...form, id: event.target.value.toUpperCase() })
                  }
                  placeholder="مثال: ND-2045"
                />
              </label>
              <label>
                الاسم الكامل
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                رقم الهوية
                <input
                  required
                  value={form.nationalId}
                  onChange={(event) =>
                    setForm({ ...form, nationalId: event.target.value })
                  }
                />
              </label>
              <label>
                رقم لوحة السيارة
                <input
                  required
                  value={form.plate}
                  onChange={(event) => setForm({ ...form, plate: event.target.value })}
                />
              </label>
              <label>
                رقم الهاتف
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <ImagePicker
                label="صورة السائق"
                value={form.avatar}
                onChange={(value) => setForm({ ...form, avatar: value })}
              />
            </div>
            <ModalActions
              saving={saving}
              label="حفظ السائق"
              onCancel={() => setOpen(false)}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
