import { useState } from "react";
import { CircleCheck, Headphones } from "lucide-react";
import { ImagePicker, PageIntro } from "@/components/ui";
import { rpc } from "@/lib/api";
import {
  initials,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/format";
import type { AdminProfile } from "@/lib/types";

export default function Profile({
  profile,
  token,
  onProfileUpdate,
  onRefresh,
  onMessage,
}: {
  profile: AdminProfile;
  token: string;
  onProfileUpdate: (patch: Partial<AdminProfile>) => void;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const [phone, setPhone] = useState(profile.phone);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await rpc<{ phone: string; avatar_url: string | null }[]>(
      "update_nashama_admin_profile",
      { p_session_token: token, p_phone: phone, p_avatar_url: avatar || null },
    );
    setSaving(false);
    if (error || !data?.[0]) {
      onMessage("تعذر حفظ تعديلات الملف الشخصي.");
      return;
    }
    onProfileUpdate({ phone: data[0].phone, avatar_url: data[0].avatar_url });
    onMessage("تم حفظ تعديلات الملف الشخصي.");
    await onRefresh();
  };

  return (
    <>
      <PageIntro
        eyebrow="الحساب"
        title="الملف الشخصي"
        description="بيانات الحساب وصلاحيات الوصول إلى مركز القيادة."
      />

      <section className="profile-card panel">
        <div className="profile-hero">
          <div className="profile-large-avatar">
            {avatar ? <img src={avatar} alt="صورة الملف الشخصي" /> : initials(profile.full_name)}
          </div>
          <div>
            <span className="eyebrow">الحساب الحالي</span>
            <h2>{profile.full_name}</h2>
            <p>
              {profile.role === "owner"
                ? "صاحب البرنامج · صلاحية كاملة"
                : "إداري · صلاحيات تشغيلية"}
            </p>
          </div>
          <CircleCheck className="verified-profile" size={22} />
        </div>

        <div className="profile-fields">
          <div>
            <span>رقم الحساب</span>
            <strong>{String(profile.profile_id)}</strong>
          </div>
          <div>
            <span>رقم الدعم الفني الرسمي</span>
            <strong>{SUPPORT_PHONE}</strong>
          </div>
          <div>
            <span>الصلاحية</span>
            <strong>
              {profile.role === "owner" ? "صاحب البرنامج" : "إداري"}
            </strong>
          </div>
        </div>

        <div className="profile-edit">
          <label>
            رقم هاتف الحساب
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <ImagePicker
            label="تعديل صورة الملف الشخصي"
            value={avatar}
            onChange={setAvatar}
          />
          <button className="red-button" onClick={() => void save()} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ تعديلات الملف"}
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
