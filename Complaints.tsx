import { useState } from "react";
import { Download, FileWarning, Headphones, RefreshCw } from "lucide-react";
import {
  EmptyState,
  PageIntro,
  PanelHeading,
  TableToolbar,
} from "@/components/ui";
import { downloadCsv } from "@/lib/download";
import type { Complaint } from "@/lib/types";

export default function Complaints({
  complaints,
  onRefresh,
}: {
  complaints: Complaint[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const openCount = complaints.filter((item) => item.status !== "resolved").length;
  const visibleComplaints = complaints.filter((complaint) => {
    const matchesStatus = status === "all" || complaint.status === status;
    const matchesQuery = [
      complaint.subject,
      complaint.description,
      complaint.driver_id ?? "",
      complaint.complainant_type,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const exportComplaints = () =>
    downloadCsv(
      "nashama-complaints.csv",
      ["الموضوع", "الوصف", "المرسل", "السائق", "الأولوية", "الحالة", "التاريخ"],
      visibleComplaints.map((item) => [
        item.subject,
        item.description,
        item.complainant_type === "customer" ? "عميل" : "كابتن",
        item.driver_id,
        item.priority,
        item.status,
        item.created_at,
      ]),
    );

  return (
    <>
      <PageIntro
        eyebrow="خدمة المتابعة"
        title="الشكاوى"
        description="راجع بلاغات العملاء والكباتن واتخذ الإجراء المناسب."
        action={
          <div className="summary-pill">
            <FileWarning size={16} /> {openCount} مفتوحة
          </div>
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="قائمة الشكاوى"
          subtitle={`${visibleComplaints.length} من ${complaints.length} بلاغات · ${openCount} مفتوحة`}
          icon={<Headphones size={18} />}
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportComplaints,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث بعنوان البلاغ أو السائق..."
        >
          <select
            aria-label="تصفية الشكاوى حسب الحالة"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="in_progress">قيد المتابعة</option>
            <option value="resolved">تم الحل</option>
          </select>
        </TableToolbar>
        <div className="admin-table complaints-table">
          <div className="table-head">
            <span>الموضوع</span>
            <span>المرسل</span>
            <span>السائق</span>
            <span>الأولوية</span>
            <span>الحالة</span>
          </div>
          {visibleComplaints.map((complaint) => (
            <div className="table-row" key={complaint.id}>
              <div>
                <strong>{complaint.subject}</strong>
                <small className="row-description">{complaint.description}</small>
              </div>
              <span>
                {complaint.complainant_type === "customer" ? "عميل" : "كابتن"}
              </span>
              <span className="mono-text">{complaint.driver_id ?? "—"}</span>
              <span>
                <b className={`priority-badge ${complaint.priority}`}>
                  {complaint.priority === "high"
                    ? "عالية"
                    : complaint.priority === "low"
                      ? "منخفضة"
                      : "متوسطة"}
                </b>
              </span>
              <span>
                <b
                  className={
                    complaint.status === "resolved"
                      ? "status-badge active"
                      : "status-badge warning"
                  }
                >
                  {complaint.status === "open"
                    ? "مفتوحة"
                    : complaint.status === "in_progress"
                      ? "قيد المتابعة"
                      : "تم الحل"}
                </b>
              </span>
            </div>
          ))}
          {!visibleComplaints.length && (
            <EmptyState
              text={
                complaints.length
                  ? "لا توجد شكاوى تطابق البحث أو التصفية."
                  : "لا توجد شكاوى مسجلة"
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
