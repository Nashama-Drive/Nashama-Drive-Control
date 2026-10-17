import { useState, type FormEvent } from "react";
import {
  ChevronLeft,
  CircleAlert,
  LockKeyhole,
  LogIn,
  WalletCards,
} from "lucide-react";

export default function AgentLogin({
  loading,
  message,
  onLogin,
  onNavigate,
}: {
  loading: boolean;
  message: string;
  onLogin: (phone: string, password: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onLogin(phone.trim(), password);
  };

  return (
    <main dir="rtl" className="admin-login">
      <div className="login-orbit orbit-gold" />
      <div className="login-orbit orbit-red" />
      <section className="login-panel">
        <div className="login-brand">
          <div className="logo-mark gold-mark">
            <WalletCards size={25} />
          </div>
          <strong>
            <span>نشامة</span> درايف
          </strong>
          <small>بوابة وكلاء الشحن</small>
        </div>

        <div className="login-title">
          <span>دخول الوكيل</span>
          <h1>تسجيل دخول الوكيل</h1>
          <p>ادخل إلى حسابك لإدارة عمليات شحن الكباتن</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <label>
            رقم الهاتف
            <input
              autoComplete="off"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="رقم هاتف الوكيل"
              dir="ltr"
            />
          </label>
          <label>
            كلمة المرور
            <input
              autoComplete="off"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="أدخل كلمة المرور"
            />
          </label>

          {message && (
            <div className="login-error">
              <CircleAlert size={16} />
              {message}
            </div>
          )}

          <button className="gold-button" type="submit" disabled={loading}>
            {loading ? "جاري التحقق..." : "دخول"} <LogIn size={18} />
          </button>
        </form>

        <div className="login-security">
          <LockKeyhole size={16} />
          <span>دخول محمي بصلاحيات الوكيل</span>
        </div>

        <div className="login-portal-switch">
          <button type="button" onClick={() => onNavigate("/")}>
            دخول لوحة الإدارة <ChevronLeft size={14} />
          </button>
        </div>

      </section>
      <p className="login-foot">
        NASHAMA DRIVE <i>•</i> AGENT PORTAL
      </p>
    </main>
  );
}
