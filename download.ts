type CsvCell = string | number | null | undefined;

export const downloadCsv = (
  filename: string,
  headers: string[],
  rows: CsvCell[][],
) => {
  const escape = (value: CsvCell) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };
  const content = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const blob = new Blob([`\ufeff${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};