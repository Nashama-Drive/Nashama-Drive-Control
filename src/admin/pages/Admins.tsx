import { useState, type FormEvent } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
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
import { isDemoMode, rpc } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { initials } from "@/lib/format";
import type { AdminAccount, AdminProfile } from "@/lib/types";

export default function Admins({
  accounts,
  profile,
  token,
  onRefresh,
  onMessage,
}: {
  accounts: AdminAccount[];
  profile: AdminProfile;
  token: string;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    phone: "",
    avatarData: "",
  });

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await rpc("create_nashama_admin_account", {
      p_session_token: token,
      p_username: form.username,
      p_password: form.password,
      p_full_name: form.fullName,
      p_phone: form.phone,
      p_avatar_url: form.avatarData,
    });
    setSaving(false);
    if (error) {
      onMessage("تعذر إنشاء الحساب. تأكد من البيانات وأن اسم المستخدم غير مستخدم.");
      return;
    }
    setForm({ username: "", password: "", fullName: "", phone: "", avatarData: "" });
    setOpen(false);
    onMessage("تم إنشاء الحساب الإداري بنجاح.");
    await onRefresh();
  };

  const deactivate = async (id: string) => {
    const { error } = await rpc("deactivate_nashama_admin", {
      p_session_token: token,
      p_account_id: id,
    });
    if (error) {
      onMessage("لا يمكن تعطيل هذا الحساب من صلاحيتك الحالية.");
      return;
    }
    onMessage("تم تعطيل الحساب ومنع تسجيل الدخول.");
    await onRefresh();
  };

  const activate = async (id: string) => {
    const { error } = await rpc("activate_nashama_admin", {
      p_session_token: token,
      p_account_id: id,
    });
    if (error) {
      onMessage("تعذر تفعيل الحساب.");
      return;
    }
    onMessage("تم تفعيل الحساب الإداري.");
    await onRefresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("هل تريد حذف الحساب الإداري نهائياً؟")) return;
    const { error } = await rpc("delete_nashama_admin", {
      p_session_token: token,
      p_account_id: id,
    });
    if (error) {
      onMessage("لا يمكن حذف هذا الحساب من صلاحيتك الحالية.");
      return;
    }
    onMessage("تم حذف الحساب من النظام نهائياً.");
    await onRefresh();
  };

  const visibleAccounts = accounts.filter((account) =>
    [account.username, account.full_name, account.phone, account.profile_id]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const exportAccounts = () =>
    downloadCsv(
      "nashama-admins.csv",
      ["اسم المستخدم", "الاسم", "رقم الهاتف", "الصلاحية", "الحالة", "رقم الحساب"],
      visibleAccounts.map((account) => [
        account.username,
        account.full_name,
        account.phone,
        account.role === "owner" ? "صاحب البرنامج" : "إداري",
        account.is_active ? "نشط" : "موقوف",
        account.profile_id,
      ]),
    );

  return (
    <>
      <PageIntro
        eyebrow="إدارة الوصول"
        title="المستخدمون الإداريون"
        description="أنشئ حسابات فريق الإدارة وحدد من يملك صلاحية الدخول إلى مركز القيادة."
        action={
          profile.role === "owner" ? (
            <button className="red-button compact" onClick={() => setOpen(true)}>
              <Plus size={17} /> إنشاء حساب إداري
            </button>
          ) : undefined
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="حسابات الإدارة"
          subtitle={`${visibleAccounts.length} من ${accounts.length} حسابات مسجلة`}
          icon={<Users size={18} />}
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportAccounts,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف..."
        />
        <div className="admin-table">
          <div className="table-head">
            <span>المستخدم</span>
            <span>اسم العرض</span>
            <span>الصلاحية</span>
            <span>الحالة</span>
            <span>الإجراء</span>
          </div>
          {visibleAccounts.map((account) => (
            <div className="table-row" key={account.id}>
              <div className="person-cell">
                <div className="table-avatar">
                  {account.avatar_url ? (
                    <img src={account.avatar_url} alt="" />
                  ) : (
                    initials(account.full_name)
                  )}
                </div>
                <div>
                  <strong>{account.username}</strong>
                  <small>
                    ID: {account.profile_id ?? "—"} · {account.phone || "لا يوجد رقم"}
                  </small>
                </div>
              </div>
              <span>{account.full_name}</span>
              <span>
                <b
                  className={account.role === "owner" ? "role-badge owner" : "role-badge"}
                >
                  {account.role === "owner" ? "صاحب البرنامج" : "إداري"}
                </b>
              </span>
              <span>
                <b
                  className={
                    account.is_active ? "status-badge active" : "status-badge blocked"
                  }
                >
                  {account.is_active ? "نشط" : "موقوف"}
                </b>
              </span>
              <span>
                {profile.role === "owner" && account.role === "admin" ? (
                  <div className="action-group">
                    {account.is_active ? (
                      <button
                        className="table-action warn"
                        onClick={() => void deactivate(account.id)}
                      >
                        <ShieldAlert size={14} /> تعطيل
                      </button>
                    ) : isDemoMode() ? (
                      <button
                        className="table-action warn"
                        onClick={() => void activate(account.id)}
                      >
                        <ShieldCheck size={14} /> تفعيل
                      </button>
                    ) : (
                      <span className="muted-action">موقوف</span>
                    )}
                    <button
                      className="table-action danger"
                      onClick={() => void remove(account.id)}
                    >
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                ) : (
                  <span className="muted-action">محمي</span>
                )}
              </span>
            </div>
          ))}
          {!visibleAccounts.length && (
            <EmptyState
              text={
                accounts.length
                  ? "لا توجد حسابات تطابق البحث."
                  : "لا توجد حسابات إدارية مسجلة بعد."
              }
            />
          )}
        </div>
      </section>

      {open && (
        <Modal>
          <ModalTitle
            eyebrow="صلاحية المالك"
            title="إنشاء حساب إداري"
            onClose={() => setOpen(false)}
          />
          <form onSubmit={createAccount}>
            <div className="form-grid">
              <label>
                اسم المستخدم
                <input
                  required
                  minLength={3}
                  autoComplete="off"
                  value={form.username}
                  onChange={(event) =>
                    setForm({ ...form, username: event.target.value })
                  }
                />
              </label>
              <label>
                كلمة المرور
                <input
                  required
                  minLength={8}
                  autoComplete="new-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </label>
              <label>
                الاسم الكامل
                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                />
              </label>
              <label>
                رقم الهاتف
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <ImagePicker
                label="صورة الحساب"
                value={form.avatarData}
                onChange={(value) => setForm({ ...form, avatarData: value })}
              />
            </div>
            <ModalActions
              saving={saving}
              label="حفظ الحساب"
              onCancel={() => setOpen(false)}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
