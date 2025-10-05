import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth event: ${event}`, session);
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    localStorage.setItem("supabase.auth.token", JSON.stringify(session));
  } else if (event === "SIGNED_OUT") {
    localStorage.removeItem("supabase.auth.token");
  }
});
