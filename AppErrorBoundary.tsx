import { Component, type ErrorInfo, type ReactNode } from "react";

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Failed to render application", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="admin-login" dir="rtl">
          <section className="login-panel" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>
              تعذر عرض لوحة التحكم
            </h1>
            <p style={{ color: "#939a94", fontSize: 12, marginBottom: 24 }}>
              حدث خطأ مؤقت أثناء تحميل البيانات. حاول تحديث الصفحة.
            </p>
            <button
              className="red-button"
              onClick={() => window.location.reload()}
            >
              تحديث الصفحة
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}