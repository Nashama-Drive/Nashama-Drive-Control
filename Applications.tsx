import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Link2,
  CircleAlert,
  Download,
  FileWarning,
  Headphones,
  MapPin,
  MessageCircleQuestion,
  Plus,
  RefreshCw,
  UserCog,
  WalletCards,
  X,
} from "lucide-react";
import {
  EmptyState,
  Modal,
  ModalActions,
  ModalTitle,
  PageIntro,
  PanelHeading,
  TableToolbar,
} from "@/components/ui";
import { rpc } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  type AgentApplication,
  type ApplicationStatus,
  type CaptainApplication,
  type InquiryApplication,
} from "@/lib/types";

type TabKey = "captain" | "agent" | "inquiry";

const TABS: {
  key: TabKey;
  label: string;
  icon: ReactNode;
  hint: string;
}[] = [
  {
    key: "captain",
    label: "تقديم كابتن",
    icon: <UserCog size={17} />,
    hint: "طلبات انضمام السائقين الجدد إلى الأسطول",
  },
  {
    key: "agent",
    label: "تقديم وكلاء الشحن",
    icon: <WalletCards size={17} />,
    hint: "طلبات فتح مراكز شحن جديدة",
  },
  {
    key: "inquiry",
    label: "تقديم استفسار أو شكوى",
    icon: <MessageCircleQuestion size={17} />,
    hint: "الاستفسارات والشكاوى الواردة من المستخدمين",
  },
];

const STATUS_FILTERS: { value: "all" | ApplicationStatus; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "new", label: "جديد" },
  { value: "reviewing", label: "قيد المراجعة" },
  { value: "approved", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
];

type ApplicationsData = {
  captains: CaptainApplication[];
  agents: AgentApplication[];
  inquiries: InquiryApplication[];
};

const statusClass = (status: ApplicationStatus) => {
  if (status === "approved") return "status-badge active";
  if (status === "rejected") return "status-badge blocked";
  if (status === "reviewing") return "status-badge warning";
  return "status-badge pending";
};

export default function Applications({
  data,
  token,
  onRefresh,
  onMessage,
  onOpenIntegration,
}: {
  data: ApplicationsData;
  token: string;
  onRefresh: () => void;
  onMessage: (message: string) => void;
  onOpenIntegration: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("captain");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ApplicationStatus>("all");
  const [review, setReview] = useState<{
    group: TabKey;
    id: string;
    status: ApplicationStatus;
    title: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [driverId, setDriverId] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = {
    captain: data.captains.length,
    agent: data.agents.length,
    inquiry: data.inquiries.length,
  };

  const newestFirst = (a: string, b: string) =>
    new Date(b).getTime() - new Date(a).getTime();

  const visibleCaptains = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.captains
      .filter(
        (item) =>
          (status === "all" || item.status === status) &&
          [item.full_name, item.phone, item.city, item.vehicle_plate, item.car_model, item.car_year]
            .join(" ")
            .toLowerCase()
            .includes(search),
      )
      .sort((a, b) => newestFirst(a.created_at, b.created_at));
  }, [data.captains, query, status]);

  const visibleAgents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.agents
      .filter(
        (item) =>
          (status === "all" || item.status === status) &&
          [item.company_name, item.phone, item.location]
            .join(" ")
            .toLowerCase()
            .includes(search),
      )
      .sort((a, b) => newestFirst(a.created_at, b.created_at));
  }, [data.agents, query, status]);

  const visibleInquiries = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.inquiries
      .filter(
        (item) =>
          (status === "all" || item.status === status) &&
          [item.full_name, item.phone, item.message]
            .join(" ")
            .toLowerCase()
            .includes(search),
      )
      .sort((a, b) => newestFirst(a.created_at, b.created_at));
  }, [data.inquiries, query, status]);

  const rowsTotal =
    tab === "captain"
      ? visibleCaptains.length
      : tab === "agent"
        ? visibleAgents.length
        : visibleInquiries.length;

  const openItems =
    data.captains.filter((item) => item.status === "new").length +
    data.agents.filter((item) => item.status === "new").length +
    data.inquiries.filter((item) => item.status === "new").length;

  const changeStatus = async (
    group: TabKey,
    id: string,
    next: ApplicationStatus,
    reviewNote?: string,
  ) => {
    const { error } = await rpc("set_nashama_application_status", {
      p_session_token: token,
      p_group: group,
      p_application_id: id,
      p_status: next,
      p_review_note: reviewNote ?? "",
    });
    if (error) {
      onMessage("تعذر تحديث حالة التقديم.");
      return false;
    }
    return true;
  };

  const submitReview = async () => {
    if (!review) return;
    setSaving(true);
    const updated = await changeStatus(
      review.group,
      review.id,
      review.status,
      note,
    );
    setSaving(false);
    if (!updated) return;
    setReview(null);
    setNote("");
    setDriverId("");
    onMessage("تم تحديث حالة التقديم بنجاح.");
    await onRefresh();
  };

  const approveCaptain = async (id: string) => {
    setSaving(true);
    const { data: result, error } = await rpc<{ driver_id: string }[]>(
      "approve_nashama_captain_application",
      {
        p_session_token: token,
        p_application_id: id,
        p_driver_id: driverId.trim() || null,
      },
    );
    setSaving(false);
    if (error || !result?.[0]) {
      onMessage(
        "تعذر قبول التقديم. تأكد أن المعرف غير مستخدم وأن البيانات مكتملة.",
      );
      return;
    }
    setReview(null);
    setDriverId("");
    onMessage(`تم القبول وإضافة السائق بالمعرف ${result[0].driver_id}.`);
    await onRefresh();
  };

  const approveAgent = async (id: string) => {
    setSaving(true);
    const { error } = await rpc("approve_nashama_agent_application", {
      p_session_token: token,
      p_application_id: id,
    });
    setSaving(false);
    if (error) {
      onMessage("تعذر قبول التقديم. تأكد أن رقم الهاتف غير مستخدم.");
      return;
    }
    setReview(null);
    onMessage("تم إنشاء المركز برصيد صفر. افتح تفاصيله في وكلاء الشحن لإنشاء حساب الدخول.");
    await onRefresh();
  };

  const exportCsv = () => {
    if (tab === "captain") {
      downloadCsv(
        "nashama-captain-applications.csv",
        ["الرقم", "الاسم الرباعي", "رقم الهاتف", "نوع السيارة", "موديل السيارة", "رقم اللوحة", "المدينة", "عدد الصور", "الحالة", "التاريخ"],
        visibleCaptains.map((item) => [
          item.id,
          item.full_name,
          item.phone,
          item.car_model,
          item.car_year,
          item.vehicle_plate,
          item.city,
          item.car_images.length,
          APPLICATION_STATUS_LABEL[item.status],
          item.created_at,
        ]),
      );
      return;
    }
    if (tab === "agent") {
      downloadCsv(
        "nashama-agent-applications.csv",
        ["الرقم", "اسم الشركة / المشروع", "رقم الهاتف", "الموقع", "خط العرض", "خط الطول", "الحالة", "التاريخ"],
        visibleAgents.map((item) => [
          item.id,
          item.company_name,
          item.phone,
          item.location,
          item.latitude ?? "",
          item.longitude ?? "",
          APPLICATION_STATUS_LABEL[item.status],
          item.created_at,
        ]),
      );
      return;
    }
    downloadCsv(
      "nashama-inquiries.csv",
      ["الرقم", "الاسم", "رقم الهاتف", "النوع", "نص الرسالة", "الحالة", "التاريخ"],
      visibleInquiries.map((item) => [
        item.id,
        item.full_name,
        item.phone,
        item.kind === "complaint" ? "شكوى" : "استفسار",
        item.message,
        APPLICATION_STATUS_LABEL[item.status],
        item.created_at,
      ]),
    );
  };

  const activeTab = TABS.find((item) => item.key === tab)!;

  return (
    <>
      <PageIntro
        eyebrow="سجلات التقديم"
        title="سجلات التقديم"
        description="مراجعة طلبات الكباتن ووكلاء الشحن والاستفسارات الواردة من التطبيقات واتخاذ الإجراء المناسب."
        action={
          <div className="page-intro-actions">
            <div className="summary-pill">
              <FileWarning size={16} /> {openItems} تقديم جديد
            </div>
            <button className="outline-action" onClick={onOpenIntegration}>
              <Link2 size={16} /> ربط الموقعين
            </button>
          </div>
        }
      />

      <div className="application-tabs">
        {TABS.map((item) => {
          const newCount =
            item.key === "captain"
              ? data.captains.filter((row) => row.status === "new").length
              : item.key === "agent"
                ? data.agents.filter((row) => row.status === "new").length
                : data.inquiries.filter((row) => row.status === "new").length;
          return (
            <button
              key={item.key}
              type="button"
              className={
                tab === item.key ? "application-tab active" : "application-tab"
              }
              onClick={() => {
                setTab(item.key);
                setStatus("all");
                setQuery("");
              }}
            >
              <span className="application-tab-icon">{item.icon}</span>
              <span className="application-tab-copy">
                <strong>{item.label}</strong>
                <small>{counts[item.key]} تقديم</small>
              </span>
              {newCount > 0 && <b className="application-tab-dot">{newCount}</b>}
            </button>
          );
        })}
      </div>

      <section className="panel table-panel">
        <PanelHeading
          title={activeTab.label}
          subtitle={`${rowsTotal} من ${counts[tab]} طلب · ${activeTab.hint}`}
          icon={
            tab === "captain" ? (
              <UserCog size={18} />
            ) : tab === "agent" ? (
              <WalletCards size={18} />
            ) : (
              <Headphones size={18} />
            )
          }
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportCsv,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو رقم الهاتف أو المدينة..."
        >
          <select
            aria-label="تصفية التقديمات حسب الحالة"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | ApplicationStatus)
            }
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </TableToolbar>

        <div className="application-list">
          {tab === "captain" &&
            visibleCaptains.map((item) => (
              <article className="application-card" key={item.id}>
                <header>
                  <div>
                    <strong>{item.full_name}</strong>
                    <small dir="ltr">{item.id} · {item.phone}</small>
                  </div>
                  <b className={statusClass(item.status)}>
                    {APPLICATION_STATUS_LABEL[item.status]}
                  </b>
                </header>
                <dl>
                  <div>
                    <dt>المدينة</dt>
                    <dd>{item.city || "—"}</dd>
                  </div>
                  <div>
                    <dt>نوع السيارة</dt>
                    <dd>{item.car_model || "—"}</dd>
                  </div>
                  <div>
                    <dt>موديل السيارة</dt>
                    <dd className="mono-text">{item.car_year || "—"}</dd>
                  </div>
                  <div>
                    <dt>رقم اللوحة</dt>
                    <dd className="mono-text">{item.vehicle_plate || "—"}</dd>
                  </div>
                </dl>
                {item.car_images.length > 0 && (
                  <div className="application-gallery">
                    {item.car_images.map((image, index) => (
                      <a key={index} href={image} target="_blank" rel="noreferrer">
                        <img src={image} alt={`صورة السيارة ${index + 1}`} />
                      </a>
                    ))}
                    <span>{item.car_images.length} صورة للسيارة</span>
                  </div>
                )}
                {item.review_note && (
                  <p className="application-review-note">
                    <CircleAlert size={13} /> {item.review_note}
                  </p>
                )}
                <footer>
                  <span className="application-date">
                    {formatDateTime(item.created_at)} · {formatDate(item.created_at)}
                  </span>
                  <div className="application-actions">
                    {item.status === "new" && (
                      <button
                        className="table-action warn"
                        onClick={() =>
                          void changeStatus("captain", item.id, "reviewing", item.review_note)
                        }
                      >
                        <RefreshCw size={14} /> بدء المراجعة
                      </button>
                    )}
                    <button
                      className="table-action active-action"
                      onClick={() => {
                        setReview({
                          group: "captain",
                          id: item.id,
                          status: "approved",
                          title: `قبول تقديم ${item.full_name}`,
                        });
                        setNote(item.review_note);
                        setDriverId("");
                      }}
                    >
                      <Check size={14} /> قبول وإضافة للأسطول
                    </button>
                    <button
                      className="table-action danger"
                      onClick={() => {
                        setReview({
                          group: "captain",
                          id: item.id,
                          status: "rejected",
                          title: `رفض تقديم ${item.full_name}`,
                        });
                        setNote(item.review_note);
                      }}
                    >
                      <X size={14} /> رفض
                    </button>
                  </div>
                </footer>
              </article>
            ))}

          {tab === "agent" &&
            visibleAgents.map((item) => (
              <article className="application-card" key={item.id}>
                <header>
                  <div>
                    <strong>{item.company_name}</strong>
                    <small dir="ltr">{item.id} · {item.phone}</small>
                  </div>
                  <b className={statusClass(item.status)}>
                    {APPLICATION_STATUS_LABEL[item.status]}
                  </b>
                </header>
                <dl>
                  <div className="wide">
                    <dt>موقع المحل / الشركة</dt>
                    <dd>{item.location || "—"}</dd>
                  </div>
                </dl>
                {item.latitude != null && item.longitude != null && (
                  <a
                    className="location-link application-map-link"
                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin size={14} /> فتح موقع المركز على خرائط Google
                  </a>
                )}
                {item.review_note && (
                  <p className="application-review-note">
                    <CircleAlert size={13} /> {item.review_note}
                  </p>
                )}
                <footer>
                  <span className="application-date">
                    {formatDateTime(item.created_at)} · {formatDate(item.created_at)}
                  </span>
                  <div className="application-actions">
                    {item.status === "new" && (
                      <button
                        className="table-action warn"
                        onClick={() =>
                          void changeStatus("agent", item.id, "reviewing", item.review_note)
                        }
                      >
                        <RefreshCw size={14} /> بدء المراجعة
                      </button>
                    )}
                    <button
                      className="table-action active-action"
                      onClick={() => {
                        setReview({
                          group: "agent",
                          id: item.id,
                          status: "approved",
                          title: `قبول تقديم ${item.company_name}`,
                        });
                        setNote(item.review_note);
                      }}
                    >
                      <Plus size={14} /> قبول وإنشاء مركز شحن
                    </button>
                    <button
                      className="table-action danger"
                      onClick={() => {
                        setReview({
                          group: "agent",
                          id: item.id,
                          status: "rejected",
                          title: `رفض تقديم ${item.company_name}`,
                        });
                        setNote(item.review_note);
                      }}
                    >
                      <X size={14} /> رفض
                    </button>
                  </div>
                </footer>
              </article>
            ))}

          {tab === "inquiry" &&
            visibleInquiries.map((item) => (
              <article className="application-card" key={item.id}>
                <header>
                  <div>
                    <strong>{item.message}</strong>
                    <small>
                      {item.full_name} · <span dir="ltr">{item.phone}</span>
                    </small>
                  </div>
                  <b
                    className={
                      item.kind === "complaint"
                        ? "priority-badge high"
                        : "priority-badge low"
                    }
                  >
                    {item.kind === "complaint" ? "شكوى" : "استفسار"}
                  </b>
                </header>
                <p>{item.message}</p>
                {item.review_note && (
                  <p className="application-review-note">
                    <CircleAlert size={13} /> {item.review_note}
                  </p>
                )}
                <footer>
                  <span className="application-date">
                    {formatDateTime(item.created_at)} ·{" "}
                    <b className={statusClass(item.status)}>
                      {APPLICATION_STATUS_LABEL[item.status]}
                    </b>
                  </span>
                  <div className="application-actions">
                    {item.status === "new" && (
                      <button
                        className="table-action warn"
                        onClick={() =>
                          void changeStatus("inquiry", item.id, "reviewing", item.review_note)
                        }
                      >
                        <RefreshCw size={14} /> بدء المتابعة
                      </button>
                    )}
                    <button
                      className="table-action active-action"
                      onClick={() => {
                        setReview({
                          group: "inquiry",
                          id: item.id,
                          status: "approved",
                          title: "تم الرد على الطلب",
                        });
                        setNote(item.review_note);
                      }}
                    >
                      <Check size={14} /> تم الرد وإغلاق
                    </button>
                    <button
                      className="table-action danger"
                      onClick={() => {
                        setReview({
                          group: "inquiry",
                          id: item.id,
                          status: "rejected",
                          title: "إغلاق الطلب دون إجراء",
                        });
                        setNote(item.review_note);
                      }}
                    >
                      <X size={14} /> إغلاق
                    </button>
                  </div>
                </footer>
              </article>
            ))}

          {!rowsTotal && (
            <EmptyState
              text={
                counts[tab]
                  ? "لا توجد تقديمات تطابق البحث أو التصفية."
                  : "لا توجد تقديمات مسجلة في هذا القسم."
              }
            />
          )}
        </div>
      </section>

      {review && (
        <Modal>
          <ModalTitle
            eyebrow="مراجعة التقديم"
            title={review.title}
            onClose={() => {
              setReview(null);
              setDriverId("");
            }}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (review.group === "captain" && review.status === "approved") {
                void approveCaptain(review.id);
                return;
              }
              if (review.group === "agent" && review.status === "approved") {
                void approveAgent(review.id);
                return;
              }
              void submitReview();
            }}
          >
            {review.group === "captain" && review.status === "approved" && (
              <label>
                معرف السائق في الأسطول
                <input
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value.toUpperCase())}
                  placeholder="ND-2501"
                  dir="ltr"
                  className="mono-text"
                />
              </label>
            )}
            <label>
              ملاحظة المراجعة
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="اكتب سبب القرار أو ملاحظة للفريق..."
              />
            </label>
            <ModalActions
              saving={saving}
              tone={review.status === "rejected" ? "red" : "red"}
              label="تأكيد القرار"
              onCancel={() => {
                setReview(null);
                setDriverId("");
              }}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
