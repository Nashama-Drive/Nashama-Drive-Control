import { useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { PageIntro, PanelHeading } from "@/components/ui";
import { APPLICATIONS_TABLE, getBackendMode } from "@/lib/api";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

const SQL = `-- نفّذ هذا المرة واحدة في Supabase > SQL Editor
create table if not exists ${APPLICATIONS_TABLE} (
  id uuid primary key default gen_random_uuid(),
  group_name text not null check (group_name in ('captain','agent','inquiry')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  review_note text default '',
  source text default 'موقع نشاما درايف',
  created_at timestamptz not null default now()
);

alter table ${APPLICATIONS_TABLE} enable row level security;

create policy "public can submit applications"
on ${APPLICATIONS_TABLE} for insert to anon with check (true);

create policy "public can read applications"
on ${APPLICATIONS_TABLE} for select to anon using (true);

create policy "admin can update applications"
on ${APPLICATIONS_TABLE} for update to anon using (true) with check (true);`;

const SNIPPET = `<!-- الصق هذا الكود في موقع التقديم (نشاما درايف)
     داخل onSubmit لكل نموذج، بعد جمع القيم من الحقول -->
<script type="module">
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

  const supabase = createClient(
    "${SUPABASE_URL}",
    "${SUPABASE_ANON_KEY}",
  );

  // group: "captain" | "agent" | "inquiry"
  async function submitApplication(group, fields) {
    const { error } = await supabase
      .from("${APPLICATIONS_TABLE}")
      .insert({
        group_name: group,
        payload: fields,      // نفس أسماء الحقول المعروضة في مركز التحكم
        source: "موقع نشاما درايف",
      });
    if (error) throw error;
  }

  // مثال: تقديم كابتن
  // submitApplication("captain", {
  //   full_name: "الاسم الرباعي",
  //   phone: "079XXXXXXXX",
  //   car_model: "تويوتا كامري",
  //   car_year: "2022",
  //   vehicle_plate: "12-34567",
  //   car_images: ["رابط الصورة"],
  //   city: "عمّان",
  // });
</script>`;

const FIELD_MAP = [
  {
    group: "تقديم كابتن",
    key: "captain",
    rows: [
      ["full_name", "الاسم الرباعي"],
      ["phone", "رقم الهاتف"],
      ["car_model", "نوع السيارة"],
      ["car_year", "تاريخ إصدار السيارة (الموديل)"],
      ["vehicle_plate", "رقم اللوحة"],
      ["car_images", "صور السيارة (أمامية، خلفية، جانبية)"],
      ["city", "المدينة"],
    ],
  },
  {
    group: "تقديم وكلاء الشحن",
    key: "agent",
    rows: [
      ["company_name", "اسم الشركة / المشروع"],
      ["phone", "رقم الهاتف"],
      ["location", "عنوان المحل / الشركة"],
      ["latitude", "خط العرض من GPS"],
      ["longitude", "خط الطول من GPS"],
    ],
  },
  {
    group: "تقديم استفسار أو شكوى",
    key: "inquiry",
    rows: [
      ["full_name", "الاسم"],
      ["phone", "رقم الهاتف"],
      ["kind", "النوع: inquiry أو complaint"],
      ["message", "نص الرسالة أو الاستفسار"],
    ],
  },
];

export default function Integration() {
  const [copied, setCopied] = useState("");
  const demoMode = getBackendMode() === "local";

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="الربط"
        title="ربط موقع التقديم بمركز التحكم"
        description="اجعل تقديمات الكباتن ووكلاء الشحن والاستفسارات تصل مباشرة إلى سجلات التقديم في هذه اللوحة."
        action={
          <div className="summary-pill">
            <Link2 size={16} /> سجلات التقديم جاهزة
          </div>
        }
      />

      <section className="panel">
        <PanelHeading
          title="خطوات الربط"
          subtitle="ثلاث خطوات فقط ثم تظهر التقديمات في لوحة الإدارة"
          icon={<Link2 size={18} />}
          action={<span className="muted-action">اقرأ ثم انسخ</span>}
        />
        <div className="integration-steps">
          <div className="integration-step">
            <b>1</b>
            <div>
              <strong>إنشاء جدول التقديمات</strong>
              <p>
                نفّذ كتلة SQL التالية مرة واحدة في Supabase الخاص بمشروع نشاما
                درايف لإنشاء جدول يستقبل التقديمات من الموقع العام.
              </p>
            </div>
          </div>
          <div className="integration-step">
            <b>2</b>
            <div>
              <strong>إرسال النماذج من الموقع</strong>
              <p>
                أضف كود الإرسال إلى موقع التقديم داخل معالج الإرسال للنماذج
                الثلاثة (كابتن، وكيل شحن، استفسار أو شكوى).
              </p>
            </div>
          </div>
          <div className="integration-step">
            <b>3</b>
            <div>
              <strong>المراجعة من مركز التحكم</strong>
              <p>
                تظهر الطلبات في «سجلات التقديم»، وقبول طلب الكابتن يضيفه
                للأسطول، وقبول طلب الوكيل ينشئ مركز شحن برصيد صفر.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <PanelHeading
          title="كتلة SQL لجدول التقديمات"
          subtitle="Supabase > SQL Editor > New query"
          icon={<Copy size={18} />}
          action={
            <button
              className="dots"
              type="button"
              onClick={() => void copy("sql", SQL)}
            >
              {copied === "sql" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          }
        />
        <pre className="code-block" dir="ltr">
          {SQL}
        </pre>
      </section>

      <section className="panel">
        <PanelHeading
          title="كود الإرسال لموقع التقديم"
          subtitle="يُلصق داخل ملف السكربت في موقع نشاما درايف"
          icon={<Copy size={18} />}
          action={
            <button
              className="dots"
              type="button"
              onClick={() => void copy("snippet", SNIPPET)}
            >
              {copied === "snippet" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          }
        />
        <pre className="code-block" dir="ltr">
          {SNIPPET}
        </pre>
      </section>

      <section className="panel">
        <PanelHeading
          title="أسماء الحقول المتوافقة"
          subtitle="يجب أن تستخدم الموقعان نفس أسماء الحقول"
          icon={<RefreshCw size={18} />}
        />
        <div className="integration-map">
          {FIELD_MAP.map((section) => (
            <div className="integration-map-group" key={section.key}>
              <strong>{section.group}</strong>
              <div className="integration-map-rows">
                {section.rows.map(([field, label]) => (
                  <div className="integration-map-row" key={field}>
                    <code dir="ltr">{field}</code>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {demoMode && (
        <div className="location-note" style={{ marginTop: 15 }}>
          الوضع الحالي تجريبي محلي: التقديمات تُحفظ على هذا الجهاز. بعد تنفيذ
          خطوات الربط تُحفظ في Supabase وتظهر على كل الأجهزة.
        </div>
      )}
    </>
  );
}
