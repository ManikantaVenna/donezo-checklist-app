import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppUpdateNotice } from "./src/components/AppUpdateNotice";
import { mockChecklistRepository } from "./src/data/mockChecklistRepository";
import { supabaseChecklistRepository } from "./src/data/supabaseChecklistRepository";
import { hasSupabaseEnv } from "./src/env";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DailyScreen } from "./src/screens/DailyScreen";
import { ProjectsScreen } from "./src/screens/ProjectsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import { AppUpdateProvider } from "./src/state/AppUpdateContext";
import { ChecklistProvider } from "./src/state/ChecklistContext";
import { useAppFonts } from "./src/theme/fonts";
import { colors, fontFamily } from "./src/theme/tokens";

type Tab = "today" | "daily" | "projects" | "settings";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "daily", label: "Daily" },
  { id: "projects", label: "Projects" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppUpdateProvider>
        <AppContent />
        <AppUpdateNotice />
      </AppUpdateProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [tab, setTab] = useState<Tab>("today");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(() => !supabase);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
  }, []);

  useEffect(() => {
    const authClient = supabase;

    if (!authClient) {
      setAuthReady(true);
      return;
    }

    let active = true;
    void authClient.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        // The sign-in screen is the safe fallback if session hydration fails.
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    const { data: subscription } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if ((!fontsLoaded && !fontError) || !authReady) {
    return (
      <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (hasSupabaseEnv() && !session) {
    return (
      <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.app}>
        <AuthScreen />
      </SafeAreaView>
    );
  }

  const repository = hasSupabaseEnv() && session ? supabaseChecklistRepository : mockChecklistRepository;
  const userId = session?.user.id ?? "demo-user";
  const usingDemoMode = !hasSupabaseEnv() || !session;

  return (
    <ChecklistProvider repository={repository} userId={userId}>
      <SafeAreaView edges={["top", "right", "left"]} style={styles.app}>
        <StatusBar style="light" />
        <View style={styles.screen}>
          {renderScreen(tab, {
            accountEmail: session?.user.email ?? null,
            onSignOut: signOut,
            usingDemoMode,
          })}
        </View>
        <SafeAreaView accessibilityRole="tablist" edges={["bottom"]} style={styles.nav}>
          {tabs.map((item) => {
            const selected = item.id === tab;
            return (
              <Pressable
                key={item.id}
                accessibilityLabel={`${item.label} tab`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(item.id)}
                style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}
              >
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </SafeAreaView>
      </SafeAreaView>
    </ChecklistProvider>
  );
}

function renderScreen(
  tab: Tab,
  settingsProps: { accountEmail: string | null; onSignOut: () => Promise<void>; usingDemoMode: boolean },
) {
  switch (tab) {
    case "daily":
      return <DailyScreen />;
    case "projects":
      return <ProjectsScreen />;
    case "settings":
      return <SettingsScreen {...settingsProps} />;
    case "today":
    default:
      return <TodayScreen />;
  }
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  screen: { flex: 1 },
  nav: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.panel, paddingHorizontal: 8, paddingVertical: 9 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 38, borderRadius: 8 },
  tabSelected: { backgroundColor: colors.panel3 },
  tabPressed: { opacity: 0.72 },
  tabLabel: { color: colors.muted, fontFamily: fontFamily.bold, fontSize: 11 },
  tabLabelSelected: { color: colors.accent },
});
