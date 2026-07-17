const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: supabaseKey,
};

export function hasSupabaseEnv(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
