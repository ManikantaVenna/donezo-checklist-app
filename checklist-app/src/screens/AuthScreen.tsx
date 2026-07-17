import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

type AuthAction = "signin" | "signup";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<AuthAction | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
    }
  }, []);

  async function submit(action: AuthAction) {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    setBusy(action);
    try {
      const result =
        action === "signin"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

      if (result.error) {
        Alert.alert("Authentication failed", result.error.message);
      } else if (action === "signup" && !result.data.session) {
        Alert.alert("Check your email", "Confirm your email address to finish creating your account.");
      }
    } catch (error) {
      Alert.alert(
        "Authentication failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>B</Text>
        </View>
        <Text style={styles.eyebrow}>B PRIME</Text>
        <Text style={styles.title}>Build a better day.</Text>
        <Text style={styles.subcopy}>Sign in to keep your routines, tasks, and projects in sync.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            accessibilityLabel="Password"
            autoComplete="current-password"
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <View style={styles.actions}>
            <AppButton
              disabled={Boolean(busy)}
              label={busy === "signin" ? "Signing in..." : "Sign in"}
              onPress={() => submit("signin")}
            />
            <AppButton
              disabled={Boolean(busy)}
              label={busy === "signup" ? "Creating account..." : "Create account"}
              onPress={() => submit("signup")}
              tone="ghost"
            />
          </View>
        </View>

        <Text style={styles.footer}>Your checklist will stay in sync across your signed-in devices.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: radii.card,
    backgroundColor: colors.green,
  },
  brandMarkText: { color: colors.black, fontFamily: fontFamily.black, fontSize: 22 },
  eyebrow: { marginTop: 26, color: colors.green, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.5 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  form: { marginTop: 32, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 16 },
  label: { marginBottom: 7, color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  input: {
    height: 48,
    marginBottom: 18,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    paddingHorizontal: 13,
  },
  actions: { gap: 10 },
  footer: { marginTop: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

export default AuthScreen;
