import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

type AuthStep = "email" | "code";
type AuthAction = "send" | "verify";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [busy, setBusy] = useState<AuthAction | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
    }
  }, []);

  async function sendCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email needed", "Enter a real email address so Donezo can send your login code.");
      return;
    }

    setBusy("send");
    try {
      const result = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      if (result.error) {
        Alert.alert("Code failed to send", result.error.message);
      } else {
        setEmail(normalizedEmail);
        setStep("code");
        Alert.alert("Code sent", "Check your email for the Donezo verification code.");
      }
    } catch (error) {
      Alert.alert(
        "Code failed to send",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email needed", "Enter the email address you used for Donezo.");
      setStep("email");
      return;
    }

    if (normalizedCode.length < 6) {
      Alert.alert("Code needed", "Enter the 6-digit code from your Donezo email.");
      return;
    }

    setBusy("verify");
    try {
      const result = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email",
      });

      if (result.error) {
        Alert.alert("Code did not work", result.error.message);
      }
    } catch (error) {
      Alert.alert(
        "Code did not work",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  const maskedEmail = email.trim().toLowerCase();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>D</Text>
        </View>
        <Text style={styles.eyebrow}>DONEZO</Text>
        <Text style={styles.title}>Tasks? Donezo.</Text>
        <Text style={styles.subcopy}>
          Sign in with a quick email code. No password to remember, no tiny password lecture.
        </Text>

        <View style={styles.form}>
          {step === "email" ? (
            <>
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
              <AppButton
                disabled={Boolean(busy)}
                label={busy === "send" ? "Sending code..." : "Send verification code"}
                onPress={sendCode}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <Text style={styles.helper}>We sent a code to {maskedEmail}.</Text>
              <TextInput
                accessibilityLabel="Verification code"
                autoCapitalize="none"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.codeInput]}
                value={code}
              />
              <View style={styles.actions}>
                <AppButton
                  disabled={Boolean(busy)}
                  label={busy === "verify" ? "Checking code..." : "Verify and enter"}
                  onPress={verifyCode}
                />
                <AppButton
                  disabled={Boolean(busy)}
                  label={busy === "send" ? "Resending..." : "Resend code"}
                  onPress={sendCode}
                  tone="ghost"
                />
                <AppButton
                  disabled={Boolean(busy)}
                  label="Use another email"
                  onPress={() => {
                    setCode("");
                    setStep("email");
                  }}
                  tone="ghost"
                />
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer}>Donezo keeps your tasks, routines, and projects synced across devices.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    backgroundColor: colors.accent,
  },
  brandMarkText: { color: colors.black, fontFamily: fontFamily.black, fontSize: 22 },
  eyebrow: { marginTop: 26, color: colors.accent, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.5 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  form: { marginTop: 32, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 16 },
  label: { marginBottom: 7, color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  helper: { marginBottom: 10, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
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
  codeInput: {
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 22,
    letterSpacing: 7,
    textAlign: "center",
  },
  actions: { gap: 10 },
  footer: { marginTop: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

export default AuthScreen;
