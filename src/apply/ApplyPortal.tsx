import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Headphones,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import {
  submitApplication,
  uploadLocalImage,
  type ApplicationSubmission,
} from "@/lib/api";
import { SUPPORT_WHATSAPP_URL } from "@/lib/format";

type TabKey = "captain" | "agent" | "inquiry";

const TABS: { key: TabKey; label: string; icon: typeof Car }[] = [
  { key: "captain", label: "تقديم كابتن", icon: Car },
  { key: "agent", label: "تقديم وكيل شحن", icon: Building2 },
  { key: "inquiry", label: "استفسار أو شكوى", icon: Headphones },
];

export default function ApplyPortal({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("captain");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const [captain, setCaptain] = useState({
    full_name: "",
    phone: "",
    car_model: "",
    car_year: "",
    vehicle_plate: "",
    city: "",
  });
  const [carImages, setCarImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [agent, setAgent] = useState({
    company_name: "",
    phone: "",
    location: "",
  });
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [locating, setLocating] = useState(false);

  const [inquiry, setInquiry] = useState({
    full_name: "",
    phone: "",
    kind: "inquiry" as "inquiry" | "complaint",
    message: "",
  });

  useEffect(() => {
    document.body.classList.remove("sidebar-open");
  }, []);

  const pickCarImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    const urls: string[] = [];
    for (const file of files.slice(0, 6)) {
      if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        urls.push(await uploadLocalImage(file));
      }
    }
    setCarImages((current) => [...current, ...urls].slice(0, 6));
    setUploadingImages(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setAgent((current) => ({
          ...current,
          location: current.location || "الموقع الحالي المحدد عبر GPS",
        }));
        setLocating(false);
      },
      () => {
        setError("تعذر تحديد الموقع، اكتب العنوان يدوياً.");
        setLocating(false);
      },
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const payload: ApplicationSubmission =
      tab === "captain"
        ? {
            p_group: "captain",
            p_full_name: captain.full_name,
            p_phone: captain.phone,
            p_car_model: captain.car_model,
            p_car_year: captain.car_year,
            p_vehicle_plate: captain.vehicle_plate,
            p_city: captain.city,
            p_car_images: carImages,
          }
        : tab === "agent"
          ? {
              p_group: "agent",
              p_company_name: agent.company_name,
              p_phone: agent.phone,
              p_location: agent.location,
              p_latitude: coords.latitude,
              p_longitude: coords.longitude,
            }
          : {
              p_group: "inquiry",
              p_full_name: inquiry.full_name,
              p_phone: inquiry.phone,
              p_kind: inquiry.kind,
              p_message: inquiry.message,
            };
    const { data, error: submitError } = await submitApplication(payload);
    setSaving(false);
    if (submitError || !data?.[0]) {
      setError("تعذر إرسال الطلب، تأكد من الحقول المطلوبة وحاول مرة أخرى.");
      return;
    }
    setDone(data[0].id);
    setCaptain({
      full_name: "",
      phone: "",
      car_model: "",
      car_year: "",
      vehicle_plate: "",
      city: "",
    });
    setCarImages([]);
    setAgent({ company_name: "", phone: "", location: "" });
    setCoords({ latitude: null, longitude: null });
    setInquiry({ full_name: "", phone: "", kind: "inquiry", message: "" });
  };

  return (
    <main dir="rtl" className="apply-page">
      <div className="apply-glow apply-glow-red" />
      <div className="apply-glow apply-gold" />

      <header className="apply-header">
        <button className="apply-back" onClick={() => onNavigate("/")}>
          <ChevronLeft size={16} /> مركز الإدارة
        </button>
        <div className="apply-brand">
          <div className="logo-mark">
            <Car size={22} />
          </div>
          <strong>
            <span>نشاما</span> درايف
          </strong>
          <small>بوابة التقديم والانضمام</small>
        </div>
      </header>

      <section className="apply-shell">
        <h1>انضم إلى منظومة نشاما درايف</h1>
        <p>
          اختر نوع التقديم المناسب، وسيصل طلبك مباشرة إلى مركز التحكم ليتم
          مراجعته من فريق الإدارة.
        </p>

        <div className="apply-tabs">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={tab === item.key ? "apply-tab active" : "apply-tab"}
                onClick={() => {
                  setTab(item.key);
                  setDone("");
                  setError("");
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {done ? (
          <div className="apply-success">
            <CheckCircle2 size={30} />
            <strong>تم استلام طلبك بنجاح</strong>
            <p>
              رقم طلبك <b dir="ltr">{done}</b> — سيتم مراجعته من مركز التحكم
              والتواصل معك على الرقم المُسجّل.
            </p>
            <div className="apply-success-actions">
              <button
                className="red-button"
                onClick={() => {
                  setDone("");
                  setTab(tab);
                }}
              >
                تقديم طلب آخر
              </button>
              <a
                className="ghost-button"
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Headphones size={16} /> الدعم الفني
              </a>
            </div>
          </div>
        ) : (
          <form className="apply-form" onSubmit={submit}>
            {tab === "captain" && (
              <>
                <div className="apply-form-title">
                  <span>طلب الانضمام ككابتن توصيل</span>
                  <h2>بيانات الكابتن والسيارة</h2>
                </div>
                <label className="apply-field">
                  الاسم الرباعي
                  <span className="apply-input">
                    <User size={16} />
                    <input
                      required
                      value={captain.full_name}
                      onChange={(event) =>
                        setCaptain({ ...captain, full_name: event.target.value })
                      }
                      placeholder="أدخل اسمك الرباعي الكامل"
                    />
                  </span>
                </label>
                <label className="apply-field">
                  رقم الهاتف
                  <span className="apply-input">
                    <Phone size={16} />
                    <input
                      required
                      type="tel"
                      dir="ltr"
                      value={captain.phone}
                      onChange={(event) =>
                        setCaptain({ ...captain, phone: event.target.value })
                      }
                      placeholder="079XXXXXXXX"
                    />
                  </span>
                </label>
                <div className="apply-grid">
                  <label className="apply-field">
                    نوع السيارة
                    <span className="apply-input">
                      <Car size={16} />
                      <input
                        required
                        value={captain.car_model}
                        onChange={(event) =>
                          setCaptain({ ...captain, car_model: event.target.value })
                        }
                        placeholder="مثال: تويوتا كامري"
                      />
                    </span>
                  </label>
                  <label className="apply-field">
                    تاريخ إصدار السيارة (الموديل)
                    <span className="apply-input">
                      <Calendar size={16} />
                      <input
                        required
                        dir="ltr"
                        value={captain.car_year}
                        onChange={(event) =>
                          setCaptain({ ...captain, car_year: event.target.value })
                        }
                        placeholder="مثال: 2022"
                      />
                    </span>
                  </label>
                </div>
                <div className="apply-grid">
                  <label className="apply-field">
                    رقم اللوحة
                    <span className="apply-input">
                      <Car size={16} />
                      <input
                        required
                        dir="ltr"
                        value={captain.vehicle_plate}
                        onChange={(event) =>
                          setCaptain({
                            ...captain,
                            vehicle_plate: event.target.value.toUpperCase(),
                          })
                        }
                        placeholder="مثال: 12-34567"
                      />
                    </span>
                  </label>
                  <label className="apply-field">
                    المدينة
                    <span className="apply-input">
                      <MapPin size={16} />
                      <input
                        required
                        value={captain.city}
                        onChange={(event) =>
                          setCaptain({ ...captain, city: event.target.value })
                        }
                        placeholder="مثال: عمّان"
                      />
                    </span>
                  </label>
                </div>
                <div className="apply-field">
                  صور السيارة (أمامية، خلفية، جانبية)
                  <label className="apply-upload">
                    {uploadingImages ? (
                      <Loader2 size={20} className="apply-spin" />
                    ) : (
                      <ImagePlus size={20} />
                    )}
                    <span>
                      {carImages.length
                        ? `تم اختيار ${carImages.length} صورة · اضغط للإضافة`
                        : "اضغط لرفع صور السيارة"}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void pickCarImages(event)}
                    />
                  </label>
                  {carImages.length > 0 && (
                    <div className="apply-thumbs">
                      {carImages.map((image, index) => (
                        <img key={index} src={image} alt={`صورة ${index + 1}`} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "agent" && (
              <>
                <div className="apply-form-title">
                  <span>الانضمام لوكلاء الشحن</span>
                  <h2>بيانات المركز التجاري</h2>
                </div>
                <label className="apply-field">
                  اسم الشركة / المشروع
                  <span className="apply-input">
                    <Building2 size={16} />
                    <input
                      required
                      value={agent.company_name}
                      onChange={(event) =>
                        setAgent({ ...agent, company_name: event.target.value })
                      }
                      placeholder="أدخل اسم شركتك أو مشروعك التجاري"
                    />
                  </span>
                </label>
                <label className="apply-field">
                  رقم الهاتف
                  <span className="apply-input">
                    <Phone size={16} />
                    <input
                      required
                      type="tel"
                      dir="ltr"
                      value={agent.phone}
                      onChange={(event) =>
                        setAgent({ ...agent, phone: event.target.value })
                      }
                      placeholder="079XXXXXXXX"
                    />
                  </span>
                </label>
                <label className="apply-field">
                  عنوان المحل / الشركة
                  <span className="apply-input">
                    <MapPin size={16} />
                    <input
                      required
                      value={agent.location}
                      onChange={(event) =>
                        setAgent({ ...agent, location: event.target.value })
                      }
                      placeholder="المدينة، الحي، الشارع"
                    />
                  </span>
                </label>
                <button
                  type="button"
                  className="apply-gps"
                  onClick={detectLocation}
                  disabled={locating}
                >
                  <MapPin size={16} />
                  {locating
                    ? "جاري تحديد الموقع..."
                    : coords.latitude
                      ? `تم تحديد الموقع (${coords.latitude}, ${coords.longitude})`
                      : "تحديد موقع المحل الحالي عبر الخريطة (GPS)"}
                </button>
              </>
            )}

            {tab === "inquiry" && (
              <>
                <div className="apply-form-title">
                  <span>تقديم استفسار أو شكوى</span>
                  <h2>نحن في خدمتك على مدار الساعة</h2>
                </div>
                <label className="apply-field">
                  الاسم
                  <span className="apply-input">
                    <User size={16} />
                    <input
                      required
                      value={inquiry.full_name}
                      onChange={(event) =>
                        setInquiry({ ...inquiry, full_name: event.target.value })
                      }
                      placeholder="اسمك الكريم"
                    />
                  </span>
                </label>
                <label className="apply-field">
                  رقم الهاتف
                  <span className="apply-input">
                    <Phone size={16} />
                    <input
                      required
                      type="tel"
                      dir="ltr"
                      value={inquiry.phone}
                      onChange={(event) =>
                        setInquiry({ ...inquiry, phone: event.target.value })
                      }
                      placeholder="079XXXXXXXX"
                    />
                  </span>
                </label>
                <div className="apply-field">
                  نوع الطلب
                  <div className="apply-choice">
                    <button
                      type="button"
                      className={
                        inquiry.kind === "inquiry" ? "apply-choice-item active" : "apply-choice-item"
                      }
                      onClick={() => setInquiry({ ...inquiry, kind: "inquiry" })}
                    >
                      استفسار
                    </button>
                    <button
                      type="button"
                      className={
                        inquiry.kind === "complaint" ? "apply-choice-item active" : "apply-choice-item"
                      }
                      onClick={() => setInquiry({ ...inquiry, kind: "complaint" })}
                    >
                      شكوى
                    </button>
                  </div>
                </div>
                <label className="apply-field">
                  نص الرسالة أو الاستفسار
                  <textarea
                    required
                    rows={5}
                    value={inquiry.message}
                    onChange={(event) =>
                      setInquiry({ ...inquiry, message: event.target.value })
                    }
                    placeholder="اكتب استفسارك هنا بالتفصيل..."
                  />
                </label>
              </>
            )}

            {error && (
              <div className="login-error">
                <CircleAlert size={16} /> {error}
              </div>
            )}

            <button className="red-button apply-submit" type="submit" disabled={saving}>
              {saving
                ? "جاري الإرسال..."
                : tab === "captain"
                  ? "إرسال طلب الانضمام ككابتن"
                  : tab === "agent"
                    ? "إرسال طلب الانضمام كوكيل شحن"
                    : "إرسال الرسالة"}
            </button>
          </form>
        )}
      </section>

      <p className="login-foot">
        NASHAMA DRIVE <i>•</i> JOIN PORTAL
      </p>
    </main>
  );
}
