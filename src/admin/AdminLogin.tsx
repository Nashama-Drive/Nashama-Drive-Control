import { useState, type FormEvent } from "react";
import {
  Car,
  ChevronLeft,
  CircleAlert,
  LockKeyhole,
  LogIn,
} from "lucide-react";

export default function AdminLogin({
  loading,
  message,
  onLogin,
  onNavigate,
}: {
  loading: boolean;
  message: string;
  onLogin: (username: string, password: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onLogin(username.trim(), password);
  };

  return (
    <main dir="rtl" className="admin-login">
      <div className="login-orbit orbit-red" />
      <div className="login-orbit orbit-gold" />
      <section className="login-panel">
        <div className="login-brand">
          <div className="logo-mark">
            <Car size={25} />
          </div>
          <strong>
            <span>نشامة</span> درايف
          </strong>
          <small>مركز التحكم الرئيسي</small>
        </div>

        <div className="login-title">
          <span>بوابة الإدارة</span>
          <h1>تسجيل الدخول</h1>
          <p>أهلاً بك في مركز قيادة منظومة نشامة درايف</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <label>
            اسم المستخدم
            <input
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="أدخل اسم المستخدم"
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

          <button className="red-button" type="submit" disabled={loading}>
            {loading ? "جاري التحقق..." : "دخول إلى لوحة الإدارة"}
            <LogIn size={18} />
          </button>
        </form>

        <div className="login-security">
          <LockKeyhole size={16} />
          <span>دخول محمي بصلاحيات الإدارة</span>
        </div>

        <div className="login-portal-switch">
          <button type="button" onClick={() => onNavigate("/agent")}>
            دخول وكلاء الشحن <ChevronLeft size={14} />
          </button>
        </div>

      </section>
      <p className="login-foot">
        NASHAMA DRIVE <i>•</i> ADMIN CONTROL CENTER
      </p>
    </main>
  );
}
