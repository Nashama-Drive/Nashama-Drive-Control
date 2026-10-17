import { useState } from "react";
import { Download, RefreshCw, ShieldAlert, TriangleAlert } from "lucide-react";
import {
  EmptyState,
  PageIntro,
  PanelHeading,
  TableToolbar,
} from "@/components/ui";
import { downloadCsv } from "@/lib/download";
import { formatDate } from "@/lib/format";
import type { Issue } from "@/lib/types";

export default function Issues({
  issues,
  onRefresh,
}: {
  issues: Issue[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const visibleIssues = issues.filter((issue) => {
    const matchesStatus = status === "all" || issue.status === status;
    const matchesQuery = `${issue.title} ${issue.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const exportIssues = () =>
    downloadCsv(
      "nashama-system-issues.csv",
      ["العنوان", "الوصف", "درجة الخطورة", "الحالة", "التاريخ"],
      visibleIssues.map((item) => [
        item.title,
        item.description,
        item.severity,
        item.status,
        item.created_at,
      ]),
    );

  return (
    <>
      <PageIntro
        eyebrow="المراقبة التقنية"
        title="مشاكل النظام"
        description="تابع المشاكل القادمة من تطبيق الإدارة والوكلاء والكباتن والعملاء."
        action={
          <div className="summary-pill red-pill">
            <ShieldAlert size={16} /> مراقبة مباشرة
          </div>
        }
      />

      <section className="panel table-panel">
        <PanelHeading
          title="سجل المشاكل"
          subtitle={`${visibleIssues.length} من ${issues.length} أخطاء وتنبيهات`}
          icon={<TriangleAlert size={18} />}
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportIssues,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث بعنوان المشكلة أو وصفها..."
        >
          <select
            aria-label="تصفية المشاكل حسب الحالة"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="in_progress">قيد الحل</option>
            <option value="resolved">تم الحل</option>
          </select>
        </TableToolbar>
        <div className="issue-list">
          {visibleIssues.map((issue) => (
            <div className="issue-card" key={issue.id}>
              <span className={`issue-severity ${issue.severity}`}>
                <TriangleAlert size={18} />
              </span>
              <div>
                <strong>{issue.title}</strong>
                <p>{issue.description}</p>
                <small>{formatDate(issue.created_at)}</small>
              </div>
              <b
                className={
                  issue.status === "resolved"
                    ? "status-badge active"
                    : "status-badge warning"
                }
              >
                {issue.status === "in_progress"
                  ? "قيد الحل"
                  : issue.status === "resolved"
                    ? "تم الحل"
                    : "مفتوحة"}
              </b>
            </div>
          ))}
          {!visibleIssues.length && (
            <EmptyState
              text={
                issues.length
                  ? "لا توجد مشاكل تطابق البحث أو التصفية."
                  : "لا توجد مشاكل مسجلة"
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
