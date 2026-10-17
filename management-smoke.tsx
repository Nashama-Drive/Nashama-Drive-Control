import assert from "node:assert/strict";
import { StrictMode, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Agents from "../src/admin/pages/Agents";
import Drivers from "../src/admin/pages/Drivers";
import { authenticateAdmin, authenticateAgent, rpc } from "../src/lib/api";
import type { AdminDashboard } from "../src/lib/types";

async function run() {
  const login = await authenticateAdmin("AbuSarah", "Faisl511");
  assert.equal(login.error, null);
  const token = String(login.data?.[0].session_token);
  const initial = await rpc<AdminDashboard>("get_nashama_admin_dashboard", {
    p_session_token: token,
  });
  assert.ok(initial.data);

  function AgentHarness() {
    const [dashboard, setDashboard] = useState(initial.data!);
    const refresh = async () => {
      const result = await rpc<AdminDashboard>("get_nashama_admin_dashboard", {
        p_session_token: token,
      });
      if (result.data) setDashboard(result.data);
    };
    return (
      <Agents
        agents={dashboard.agents}
        token={token}
        onRefresh={() => void refresh()}
        onMessage={() => {}}
      />
    );
  }

  const agentView = render(<StrictMode><AgentHarness /></StrictMode>);
  fireEvent.click(screen.getByRole("button", { name: /إضافة مركز شحن/ }));
  fireEvent.change(screen.getByLabelText("اسم المركز"), {
    target: { value: "مركز الجاردنز" },
  });
  fireEvent.change(screen.getByLabelText("اسم صاحب المكان"), {
    target: { value: "أبو عمر" },
  });
  fireEvent.change(screen.getByLabelText("رقم هاتف الوكيل (رقم الدخول)"), {
    target: { value: "0794455667" },
  });
  fireEvent.change(screen.getByLabelText("عنوان الموقع"), {
    target: { value: "عمّان، الجاردنز" },
  });
  fireEvent.click(screen.getByRole("button", { name: /تحديد الموقع على الخريطة/ }));
  fireEvent.change(screen.getByLabelText("رابط الموقع من خرائط Google"), {
    target: {
      value: "https://www.google.com/maps/@31.9539,35.9106,15z",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "تحديد من الرابط" }));
  fireEvent.click(screen.getByRole("button", { name: "اعتماد الموقع" }));
  assert.equal(
    (screen.getByLabelText("خط العرض") as HTMLInputElement).value,
    "31.9539",
  );
  fireEvent.click(screen.getByRole("button", { name: "حفظ المركز" }));
  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "إنشاء حساب للوكيل" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "إنشاء حساب للوكيل" }));
  fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), {
    target: { value: "PrivateKey123!" },
  });
  fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور"), {
    target: { value: "PrivateKey123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "إنشاء الحساب" }));
  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "تعطيل حساب الوكيل" }));
  });
  const agentLogin = await authenticateAgent("0794455667", "PrivateKey123!");
  assert.equal(agentLogin.error, null);
  fireEvent.click(screen.getByRole("button", { name: "تعطيل حساب الوكيل" }));
  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "تفعيل حساب الوكيل" }));
  });
  const blocked = await authenticateAgent("0794455667", "PrivateKey123!");
  assert.ok(blocked.error);
  agentView.unmount();

  const driverInitial = await rpc<AdminDashboard>("get_nashama_admin_dashboard", {
    p_session_token: token,
  });
  function DriverHarness() {
    const [dashboard, setDashboard] = useState(driverInitial.data!);
    const refresh = async () => {
      const result = await rpc<AdminDashboard>("get_nashama_admin_dashboard", {
        p_session_token: token,
      });
      if (result.data) setDashboard(result.data);
    };
    return (
      <Drivers
        drivers={dashboard.drivers}
        token={token}
        onRefresh={() => void refresh()}
        onMessage={() => {}}
      />
    );
  }
  const driverView = render(<StrictMode><DriverHarness /></StrictMode>);
  fireEvent.click(screen.getByRole("button", { name: "إضافة سائق" }));
  fireEvent.change(screen.getByLabelText("معرف السائق"), {
    target: { value: "ND-300" },
  });
  fireEvent.change(screen.getByLabelText("الاسم الكامل"), {
    target: { value: "مازن عمر" },
  });
  fireEvent.change(screen.getByLabelText("رقم الهوية"), {
    target: { value: "9988" },
  });
  fireEvent.change(screen.getByLabelText("رقم لوحة السيارة"), {
    target: { value: "4455" },
  });
  fireEvent.change(screen.getByLabelText("رقم الهاتف"), {
    target: { value: "0790000000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "حفظ السائق" }));
  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "تعطيل السائق" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "تعطيل السائق" }));
  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "تفعيل السائق" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "تعديل بيانات السائق" }));
  assert.equal((screen.getByLabelText("رقم الهوية") as HTMLInputElement).value, "9988");
  driverView.unmount();

  console.log("PASS: map selection, agent account, disable login, and driver details.");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});