export const formatMoney = (value: number) =>
  new Intl.NumberFormat("ar-JO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ar-JO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ar-JO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

export const SUPPORT_PHONE = "0798939402";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/962798939402";
export const AGENT_COMMISSION = 1;
