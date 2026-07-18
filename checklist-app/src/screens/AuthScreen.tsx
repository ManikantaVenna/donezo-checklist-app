import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { getRememberMePreference, setRememberMePreference } from "../lib/authRememberPreference";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

type AuthStep = "form" | "code";
type AuthAction = "signin" | "signup" | "resend" | "verify";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<AuthStep>("form");
  const [busy, setBusy] = useState<AuthAction | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
    }

    void getRememberMePreference()
      .then(setRememberMe)
      .catch(() => {
        // Keep the friendly default if local preference storage is unavailable.
      });
  }, []);

  function getValidatedCredentials() {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordError = getPasswordError(password);

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email needed", "Enter a real email address for Donezo.");
      return null;
    }

    if (passwordError) {
      Alert.alert("Password too short", passwordError);
      return null;
    }

    return { email: normalizedEmail, password };
  }

  async function signIn() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const credentials = getValidatedCredentials();
    if (!credentials) return;

    setBusy("signin");
    try {
      await setRememberMePreference(rememberMe);
      const result = await supabase.auth.signInWithPassword(credentials);

      if (result.error) {
        const message = result.error.message.toLowerCase().includes("email not confirmed")
          ? "This email still needs verification. Tap Create account again or enter the verification code from your email."
          : result.error.message;
        Alert.alert("Sign in failed", message);
      }
    } catch (error) {
      Alert.alert(
        "Sign in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function createAccount() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const credentials = getValidatedCredentials();
    if (!credentials) return;

    setBusy("signup");
    try {
      await setRememberMePreference(rememberMe);
      const result = await supabase.auth.signUp(credentials);

      if (result.error) {
        Alert.alert("Account failed", result.error.message);
      } else if (result.data.session) {
        // Some auth setups return a session immediately. In hosted Supabase with
        // email confirmations enabled, the user normally lands on the code step.
        setEmail(credentials.email);
      } else {
        setEmail(credentials.email);
        setStep("code");
        Alert.alert("Code sent", "Check your email for the Donezo account verification code.");
      }
    } catch (error) {
      Alert.alert(
        "Account failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function resendSignupCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email needed", "Enter the email address you used for Donezo.");
      setStep("form");
      return;
    }

    setBusy("resend");
    try {
      const result = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (result.error) {
        Alert.alert("Code failed to resend", result.error.message);
      } else {
        Alert.alert("Code resent", "Check your email for the new Donezo verification code.");
      }
    } catch (error) {
      Alert.alert(
        "Code failed to resend",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifySignupCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email needed", "Enter the email address you used for Donezo.");
      setStep("form");
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
        type: "signup",
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
  const isBusy = Boolean(busy);

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
          Sign in with your password. New accounts confirm with a quick email code.
        </Text>

        <View style={styles.form}>
          {step === "form" ? (
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

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                onPress={() => setRememberMe((current) => !current)}
                style={({ pressed }) => [styles.rememberRow, pressed && styles.pressed]}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  <Text style={[styles.checkmark, rememberMe && styles.checkmarkVisible]}>✓</Text>
                </View>
                <View style={styles.rememberCopy}>
                  <Text style={styles.rememberTitle}>Remember me</Text>
                  <Text style={styles.rememberDetail}>Stay signed in on this device.</Text>
                </View>
              </Pressable>

              <View style={styles.actions}>
                <AppButton
                  disabled={isBusy}
                  label={busy === "signin" ? "Signing in..." : "Sign in"}
                  onPress={signIn}
                />
                <AppButton
                  disabled={isBusy}
                  label={busy === "signup" ? "Creating account..." : "Create account"}
                  onPress={createAccount}
                  tone="ghost"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <Text style={styles.helper}>
                We sent a signup verification code to {maskedEmail}. Enter it to activate your account.
              </Text>
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
                  disabled={isBusy}
                  label={busy === "verify" ? "Checking code..." : "Verify and enter"}
                  onPress={verifySignupCode}
                />
                <AppButton
                  disabled={isBusy}
                  label={busy === "resend" ? "Resending..." : "Resend code"}
                  onPress={resendSignupCode}
                  tone="ghost"
                />
                <AppButton
                  disabled={isBusy}
                  label="Back to sign in"
                  onPress={() => {
                    setCode("");
                    setStep("form");
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

function getPasswordError(password: string): string | null {
  if (password.length < 6) {
    return "Use at least 6 characters for the password.";
  }

  return null;
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
  rememberRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 11,
  },
  checkbox: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel2,
  },
  checkboxChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: colors.black,
    fontFamily: fontFamily.black,
    fontSize: 14,
    opacity: 0,
  },
  checkmarkVisible: {
    opacity: 1,
  },
  rememberCopy: {
    flex: 1,
  },
  rememberTitle: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  rememberDetail: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  actions: { gap: 10 },
  pressed: { opacity: 0.78 },
  footer: { marginTop: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

export default AuthScreen;
