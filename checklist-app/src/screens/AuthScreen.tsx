import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

type AuthStep = "email" | "code";
type AuthAction = "send" | "resend" | "verify";

type Notice = {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
} | null;

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [busy, setBusy] = useState<AuthAction | null>(null);
  const [notice, setNotice] = useState<Notice>(() =>
    !hasSupabaseEnv() || !supabase
      ? {
          tone: "info",
          title: "Demo mode",
          message: "Supabase env is missing, so Donezo is running with local demo data.",
        }
      : null,
  );

  const normalizedEmail = email.trim().toLowerCase();
  const isBusy = Boolean(busy);
  const copy = getStepCopy(step);

  function showNotice(tone: NonNullable<Notice>["tone"], title: string, message: string) {
    setNotice({ tone, title, message });
  }

  function getValidatedEmail() {
    const value = email.trim().toLowerCase();

    if (!isValidEmail(value)) {
      showNotice("error", "Email needed", "Enter a real email address for Donezo.");
      return null;
    }

    setEmail(value);
    return value;
  }

  async function sendCode(action: "send" | "resend" = "send") {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so email codes are disabled in this preview.");
      return;
    }

    const value = getValidatedEmail();
    if (!value) return;

    setBusy(action);
    try {
      const result = await supabase.auth.signInWithOtp({
        email: value,
        options: { shouldCreateUser: true },
      });

      if (result.error) {
        showNotice("error", "Code could not be sent", friendlyAuthMessage(result.error.message));
        return;
      }

      setEmail(value);
      setCode("");
      setStep("code");
      showNotice(
        "success",
        action === "resend" ? "Fresh code sent" : "Check your inbox",
        "Enter the 6-digit Donezo code we sent to your email.",
      );
    } catch (error) {
      showNotice("error", "Code could not be sent", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so verification is disabled in this preview.");
      return;
    }

    const value = getValidatedEmail();
    if (!value) return;

    const normalizedCode = code.trim();
    if (normalizedCode.length !== 6) {
      showNotice("error", "Code needed", "Enter all 6 digits from your Donezo email.");
      return;
    }

    setBusy("verify");
    try {
      const result = await supabase.auth.verifyOtp({
        email: value,
        token: normalizedCode,
        type: "email",
      });

      if (result.error) {
        showNotice("error", "Code did not work", friendlyAuthMessage(result.error.message));
        return;
      }

      showNotice("success", "Welcome to Donezo", "Your lists are ready.");
    } catch (error) {
      showNotice("error", "Code did not work", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setNotice(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.brandMark}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="Donezo logo"
              source={require("../../assets/donezo-logo.png")}
              style={styles.brandLogo}
            />
          </View>
          <Text style={styles.eyebrow}>DONEZO</Text>
          <Text style={styles.title}>{copy.heroTitle}</Text>
          <Text style={styles.subcopy}>{copy.heroCopy}</Text>

          <View style={styles.form}>
            <Text style={styles.cardTitle}>{copy.cardTitle}</Text>
            <Text style={styles.helper}>{copy.cardCopy}</Text>

            {notice && (
              <View style={[styles.notice, styles[`${notice.tone}Notice`]]}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeMessage}>{notice.message}</Text>
              </View>
            )}

            {step === "email" ? (
              <>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={() => void sendCode()}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  returnKeyType="go"
                  style={styles.input}
                  value={email}
                />
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "send" ? "Sending code..." : "Continue with email"}
                    onPress={() => void sendCode()}
                  />
                </View>
                <Text style={styles.securityNote}>No password. New account or returning user—Donezo handles both.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emailPill}>{normalizedEmail || "your email"}</Text>
                <Text style={styles.label}>VERIFICATION CODE</Text>
                <TextInput
                  accessibilityLabel="Verification code"
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
                  onSubmitEditing={() => void verifyCode()}
                  placeholder="123456"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  style={[styles.input, styles.codeInput]}
                  value={code}
                />
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "verify" ? "Checking code..." : "Verify and enter"}
                    onPress={() => void verifyCode()}
                  />
                  <AppButton
                    disabled={isBusy}
                    label={busy === "resend" ? "Resending..." : "Resend code"}
                    onPress={() => void sendCode("resend")}
                    tone="ghost"
                  />
                </View>
                <View style={styles.linkRow}>
                  <AuthLink label="Use a different email" onPress={changeEmail} />
                </View>
              </>
            )}
          </View>

          <Text style={styles.footer}>One account. Every device. Everything synced.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function getStepCopy(step: AuthStep) {
  if (step === "code") {
    return {
      heroTitle: "Tiny code. Big entrance.",
      heroCopy: "Enter the 6-digit code from your email. Then you’re in.",
      cardTitle: "Check your email",
      cardCopy: "The same simple code works whether your account is new or already yours.",
    };
  }

  return {
    heroTitle: "Tasks? Donezo.",
    heroCopy: "Your tasks, routines, and projects—private, synced, and ready on every device.",
    cardTitle: "Continue to Donezo",
    cardCopy: "Enter your email and we’ll send a quick 6-digit code.",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

function friendlyAuthMessage(message: string): string {
  const value = message.toLowerCase();
  if (value.includes("rate limit") || value.includes("security purposes")) {
    return "Too many tries too fast. Give it a minute, then try again.";
  }

  return message;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.black,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  brandLogo: { width: 64, height: 64, borderRadius: 16 },
  eyebrow: { marginTop: 26, color: colors.accent, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.5 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  form: {
    marginTop: 32,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 16,
  },
  cardTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 19 },
  helper: { marginTop: 6, marginBottom: 14, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
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
  codeInput: {
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 22,
    letterSpacing: 7,
    textAlign: "center",
  },
  emailPill: {
    alignSelf: "flex-start",
    marginBottom: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.accentTint,
    color: colors.accentSoft,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  notice: { marginBottom: 16, borderRadius: radii.card, borderWidth: 1, padding: 12 },
  infoNotice: { borderColor: colors.lineStrong, backgroundColor: "rgba(157,183,255,0.09)" },
  successNotice: { borderColor: "rgba(216,183,106,0.45)", backgroundColor: colors.accentTint },
  errorNotice: { borderColor: "rgba(242,109,95,0.45)", backgroundColor: "rgba(242,109,95,0.1)" },
  noticeTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 13 },
  noticeMessage: { marginTop: 4, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  actions: { gap: 10 },
  securityNote: {
    marginTop: 14,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  linkRow: { alignItems: "center", marginTop: 14 },
  linkText: { color: colors.accentSoft, fontFamily: fontFamily.bold, fontSize: 13 },
  pressed: { opacity: 0.78 },
  footer: { marginTop: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

export default AuthScreen;
