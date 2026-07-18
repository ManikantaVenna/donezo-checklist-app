import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env, hasSupabaseEnv } from "../env";

export const supabase = hasSupabaseEnv()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
        persistSession: true,
        storage: AsyncStorage,
      },
    })
  : null;

// On native, timers are suspended in the background, so drive the session
// auto-refresh from the app lifecycle as Supabase recommends for React Native.
// The browser handles this through page visibility on web.
if (supabase && Platform.OS !== "web") {
  const client = supabase;
  client.auth.startAutoRefresh();
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
}
