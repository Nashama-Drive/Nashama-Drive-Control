import { AVATAR_BUCKET, supabase } from "./supabase";
import { localRpc, readFileAsDataUrl } from "./localBackend";

export type BackendMode = "remote" | "local";

let mode: BackendMode = "remote";
const listeners = new Set<(next: BackendMode) => void>();

const setMode = (next: BackendMode) => {
  if (mode === next) return;
  mode = next;
  listeners.forEach((listener) => listener(next));
};

export const getBackendMode = () => mode;
export const isDemoMode = () => mode === "local";
export const subscribeBackendMode = (listener: (next: BackendMode) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export type ApiError = { message: string };
export type ApiResult<T> = { data: T | null; error: ApiError | null };

const isNetworkIssue = (error: { message?: string; code?: string } | null) => {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  if (!message) return true;
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
};

export const rpc = async <T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<ApiResult<T>> => {
  if (mode === "local") {
    return localRpc(name, args) as ApiResult<T>;
  }
  try {
    const { data, error } = await supabase.rpc(name, args as never);
    if (error) {
      if (isNetworkIssue(error)) {
        setMode("local");
        return localRpc(name, args) as ApiResult<T>;
      }
      return { data: (data as T) ?? null, error: { message: error.message } };
    }
    return { data: (data as T) ?? null, error: null };
  } catch (error) {
    setMode("local");
    return localRpc(name, args) as ApiResult<T>;
  }
};

const shrinkImage = (file: File, size = 480): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => resolve(String(reader.result));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export const uploadAvatar = async (file: File): Promise<string | null> => {
  if (mode === "local") {
    return shrinkImage(file);
  }
  try {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `avatar-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.${extension}`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    setMode("local");
    return shrinkImage(file);
  }
};

export const readLocalImage = readFileAsDataUrl;

export type ApplicationSubmission = {
  p_group: "captain" | "agent" | "inquiry";
  p_full_name?: string;
  p_phone?: string;
  p_car_model?: string;
  p_car_year?: string;
  p_vehicle_plate?: string;
  p_city?: string;
  p_car_images?: string[];
  p_company_name?: string;
  p_location?: string;
  p_latitude?: number | null;
  p_longitude?: number | null;
  p_kind?: "inquiry" | "complaint";
  p_message?: string;
  p_source?: string;
};

/** إرسال تقديم من البوابة العامة إلى مركز التحكم */
export const submitApplication = (payload: ApplicationSubmission) =>
  rpc<{ id: string; group: string }[]>("submit_nashama_application", {
    p_source: "موقع نشاما درايف",
    ...payload,
  });

/** رفع صورة من البوابة العامة (تُخزَّن محلياً كرابط بيانات) */
export const uploadLocalImage = (file: File) =>
  mode === "local" ? shrinkImage(file) : shrinkImage(file);

/** جدول التقديمات على Supabase — يُستخدم عند ربط الموقعين */
export const APPLICATIONS_TABLE = "nashama_applications";

/** تسجيل دخول الإدارة: يحاول الخادم الفعلي ثم الوضع التجريبي المحلي. */
export const authenticateAdmin = async (
  username: string,
  password: string,
): Promise<ApiResult<Record<string, unknown>[]>> => {
  // This owner exists in the local database only; querying the old remote
  // database first can return an incompatible dashboard or delay login.
  if (username.toLowerCase() === "abusarah") {
    setMode("local");
    return localRpc("authenticate_nashama_admin", {
      p_username: username,
      p_password: password,
    }) as ApiResult<Record<string, unknown>[]>;
  }
  const remote = await rpc<Record<string, unknown>[]>(
    "authenticate_nashama_admin",
    { p_username: username, p_password: password },
  );
  if (!remote.error) return remote;
  const local = localRpc("authenticate_nashama_admin", {
    p_username: username,
    p_password: password,
  }) as ApiResult<Record<string, unknown>[]>;
  if (!local.error) {
    setMode("local");
    return local;
  }
  return remote;
};

/** تسجيل دخول وكيل الشحن: يحاول الخادم الفعلي ثم الوضع التجريبي المحلي. */
export const authenticateAgent = async (
  phone: string,
  password: string,
): Promise<ApiResult<Record<string, unknown>[]>> => {
  const remote = await rpc<Record<string, unknown>[]>(
    "authenticate_nashama_agent",
    { p_phone: phone, p_password: password },
  );
  if (!remote.error) return remote;
  const local = localRpc("authenticate_nashama_agent", {
    p_phone: phone,
    p_password: password,
  }) as ApiResult<Record<string, unknown>[]>;
  if (!local.error) {
    setMode("local");
    return local;
  }
  return remote;
};
