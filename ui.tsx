import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CircleUserRound,
  ClipboardList,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import { uploadAvatar } from "@/lib/api";

export const PageIntro = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="page-intro">
    <div>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {action}
  </div>
);

export const PanelHeading = ({
  title,
  subtitle,
  icon,
  action,
  options,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  action?: ReactNode;
  options?: { label: string; onClick: () => void; icon?: ReactNode }[];
}) => (
  <div className="panel-heading">
    <span className="panel-heading-icon">{icon}</span>
    <div>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
    {action ??
      (options?.length ? <PanelOptions title={title} options={options} /> : null)}
  </div>
);

const PanelOptions = ({
  title,
  options,
}: {
  title: string;
  options: { label: string; onClick: () => void; icon?: ReactNode }[];
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="panel-options" ref={root}>
      <button
        className="dots"
        type="button"
        aria-label={`خيارات ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={17} />
      </button>
      {open && (
        <div className="panel-menu-dropdown" role="menu">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                option.onClick();
              }}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TableToolbar = ({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
}) => (
  <div className="table-toolbar">
    <label className="table-search">
      <Search size={16} />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
    {children}
  </div>
);

export const Modal = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`modal-layer ${className}`}>
    <div className="form-modal">{children}</div>
  </div>
);

export const ModalTitle = ({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) => (
  <div className="modal-title">
    <div>
      <span>{eyebrow}</span>
      <h3>{title}</h3>
    </div>
    <button className="icon-close" type="button" onClick={onClose}>
      <X size={18} />
    </button>
  </div>
);

export const ModalActions = ({
  saving,
  label,
  onCancel,
  tone = "red",
}: {
  saving: boolean;
  label: string;
  onCancel: () => void;
  tone?: "red" | "gold";
}) => (
  <div className="modal-actions">
    <button type="button" className="ghost-button" onClick={onCancel}>
      إلغاء
    </button>
    <button
      type="submit"
      className={tone === "gold" ? "gold-button" : "red-button"}
      disabled={saving}
    >
      {saving ? "جاري الحفظ..." : label}
    </button>
  </div>
);

export const EmptyState = ({ text }: { text: string }) => (
  <div className="empty-state">
    <ClipboardList size={24} />
    <span>{text}</span>
  </div>
);

export const ImagePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختر ملف صورة صالحاً.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة أكبر من الحد المسموح (5MB).");
      event.currentTarget.value = "";
      return;
    }
    setError("");
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      if (url) onChange(url);
    } catch {
      setError("تعذر رفع الصورة، حاول مرة أخرى.");
    }
    setUploading(false);
  };

  return (
    <label className="image-picker">
      <span>{label}</span>
      <div className="image-picker-row">
        {value ? <img src={value} alt="معاينة الصورة" /> : <CircleUserRound size={25} />}
        <div>
          <strong>
            {uploading
              ? "جاري رفع الصورة..."
              : value
                ? "تم اختيار الصورة"
                : "إضافة صورة من الاستوديو"}
          </strong>
          <small>الصيغ المدعومة JPG و PNG و WebP · حتى 5MB</small>
        </div>
        <input
          type="file"
          disabled={uploading}
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
        />
      </div>
      {error && <small className="image-error" role="alert">{error}</small>}
    </label>
  );
};
