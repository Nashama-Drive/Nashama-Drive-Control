import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://xpjbowmcwpkheqlvwcqo.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwamJvd21jd3BraGVxbHZ3Y3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODkxNTcsImV4cCI6MjEwNzA2NTE1N30.5xnjr2gu6RV21BmUiedKTkl_hVD63RgxV7iIAQKC_iI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export const AVATAR_BUCKET = "nashama-avatars";
