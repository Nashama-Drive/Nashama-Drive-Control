import { useState } from "react";
import { Download, Receipt, RefreshCw } from "lucide-react";
import { EmptyState, PanelHeading, TableToolbar } from "@/components/ui";
import { downloadCsv } from "@/lib/download";
import { formatDateTime, formatMoney, initials } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export default function History({
  transactions,
  onRefresh,
}: {
  transactions: Transaction[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const visibleTransactions = transactions.filter((transaction) =>
    `${transaction.driver_name} ${transaction.driver_id} ${transaction.reference_number}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const exportTransactions = () =>
    downloadCsv(
      "nashama-transactions.csv",
      ["السائق", "معرف السائق", "المبلغ", "العمولة", "المرجع", "الرصيد بعد", "التاريخ"],
      visibleTransactions.map((item) => [
        item.driver_name,
        item.driver_id,
        item.amount,
        item.commission,
        item.reference_number,
        item.balance_after,
        item.created_at,
      ]),
    );

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">السجل الكامل</span>
          <h2>سجل المعاملات</h2>
          <p>جميع عمليات الشحن التي قمت بها مع السائقين.</p>
        </div>
      </div>

      <section className="panel table-panel">
        <PanelHeading
          title="المعاملات"
          subtitle={`${visibleTransactions.length} من ${transactions.length} عملية`}
          icon={<Receipt size={18} />}
          options={[
            {
              label: "تحديث البيانات",
              icon: <RefreshCw size={15} />,
              onClick: onRefresh,
            },
            {
              label: "تنزيل النتائج بصيغة CSV",
              icon: <Download size={15} />,
              onClick: exportTransactions,
            },
          ]}
        />
        <TableToolbar
          value={query}
          onChange={setQuery}
          placeholder="ابحث باسم السائق أو رقم المرجع..."
        />
        <div className="admin-table agent-tx-table">
          <div className="table-head">
            <span>السائق</span>
            <span>المبلغ</span>
            <span>العمولة</span>
            <span>المرجع</span>
            <span>الرصيد بعد</span>
            <span>التاريخ</span>
          </div>
          {visibleTransactions.map((transaction) => (
            <div className="table-row" key={transaction.id}>
              <div className="person-cell">
                <div className="table-avatar driver">
                  {initials(transaction.driver_name)}
                </div>
                <div>
                  <strong>{transaction.driver_name}</strong>
                  <small dir="ltr">{transaction.driver_id}</small>
                </div>
              </div>
              <span className="money-text">
                {formatMoney(transaction.amount)} د.أ
              </span>
              <span>1.000 د.أ</span>
              <span className="mono-text">{transaction.reference_number}</span>
              <span className="money-text">
                {formatMoney(transaction.balance_after)} د.أ
              </span>
              <span className="tx-time">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>
          ))}
          {!visibleTransactions.length && (
            <EmptyState
              text={
                transactions.length
                  ? "لا توجد معاملات تطابق البحث."
                  : "لا توجد معاملات مسجلة بعد"
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
