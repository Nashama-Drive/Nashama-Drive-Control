import { useState } from "react";
import { CircleCheck, Headphones } from "lucide-react";
import { rpc } from "@/lib/api";
import {
  formatMoney,
  initials,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/format";
import type { AgentProfile } from "@/lib/types";

export default function Profile({
  profile,
  token,
  onProfileUpdate,
  onMessage,
}: {
  profile: AgentProfile;
  token: string;
  onProfileUpdate: (patch: Partial<AgentProfile>) => void;
  onMessage: (message: string) => void;
}) {
  const [phone, setPhone] = useState(profile.phone);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await rpc<{ phone: string }[]>(
      "update_nashama_agent_profile",
      { p_session_token: token, p_phone: phone || null, p_password: password || null },
    );
    setSaving(false);
    if (error || !data?.[0]) {
      onMessage("تعذر حفظ التعديلات.");
      return;
    }
    onProfileUpdate({ phone: data[0].phone });
    setPassword("");
    onMessage("تم حفظ تعديلات الملف بنجاح.");
  };

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">الحساب</span>
          <h2>الملف الشخصي</h2>
          <p>بيانات حسابك وإعدادات الوصول.</p>
        </div>
      </div>

      <section className="profile-card panel">
        <div className="profile-hero">
          <div className="profile-large-avatar gold-avatar">{initials(profile.name)}</div>
          <div>
            <span className="eyebrow">حساب الوكيل</span>
            <h2>{profile.name}</h2>
            <p>
              {profile.location} · {profile.owner_name}
            </p>
          </div>
          <CircleCheck className="verified-profile" size={22} />
        </div>

        <div className="profile-fields">
          <div>
            <span>الموقع</span>
            <strong>{profile.location}</strong>
          </div>
          <div>
            <span>صاحب المركز</span>
            <strong>{profile.owner_name || "—"}</strong>
          </div>
          <div>
            <span>إنفاق اليوم</span>
            <strong>{formatMoney(profile.daily_spend)} د.أ</strong>
          </div>
          <div>
            <span>إنفاق الشهر</span>
            <strong>{formatMoney(profile.monthly_spend)} د.أ</strong>
          </div>
        </div>

        <div className="profile-edit">
          <label>
            رقم الهاتف
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
            />
          </label>
          <label>
            كلمة مرور جديدة (اختياري)
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="اتركها فارغة لعدم التغيير"
              minLength={8}
            />
          </label>
          <button className="gold-button" onClick={() => void save()} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>

        <div className="support-banner">
          <Headphones size={21} />
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="التواصل مع الدعم الفني عبر واتساب"
          >
            <strong>الدعم الفني عبر واتساب</strong>
            <span dir="ltr">{SUPPORT_PHONE}</span>
          </a>
        </div>
      </section>
    </>
  );
}
