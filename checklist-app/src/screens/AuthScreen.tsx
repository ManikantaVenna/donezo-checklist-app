import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { getRememberMePreference, setRememberMePreference } from "../lib/authRememberPreference";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

type AuthStep = "signin" | "signup" | "code" | "forgot" | "resetSent" | "resetPassword";
type AuthAction = "signin" | "signup" | "resend" | "verify" | "forgot" | "reset";

type Notice = {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
} | null;

type AuthScreenProps = {
  initialStep?: AuthStep;
  recoveryEmail?: string | null;
  onRecoveryComplete?: () => void;
};

export function AuthScreen({ initialStep = "signin", recoveryEmail, onRecoveryComplete }: AuthScreenProps) {
  const [email, setEmail] = useState(recoveryEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [busy, setBusy] = useState<AuthAction | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || !supabase) {
      setNotice({
        tone: "info",
        title: "Demo mode",
        message: "Supabase env is missing, so Donezo is running with local demo data.",
      });
    }

    void getRememberMePreference()
      .then(setRememberMe)
      .catch(() => {
        // Keep the friendly default if local preference storage is unavailable.
      });
  }, []);

  useEffect(() => {
    setStep(initialStep);
    if (recoveryEmail) setEmail(recoveryEmail);
  }, [initialStep, recoveryEmail]);

  const copy = useMemo(() => getStepCopy(step), [step]);
  const normalizedEmail = email.trim().toLowerCase();
  const isBusy = Boolean(busy);

  function showNotice(tone: NonNullable<Notice>["tone"], title: string, message: string) {
    setNotice({ tone, title, message });
  }

  function moveTo(nextStep: AuthStep) {
    setNotice(null);
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStep(nextStep);
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

  function getSignInCredentials() {
    const value = getValidatedEmail();
    if (!value) return null;

    if (!password) {
      showNotice("error", "Password needed", "Enter your Donezo password.");
      return null;
    }

    return { email: value, password };
  }

  function getSignupCredentials() {
    const value = getValidatedEmail();
    if (!value) return null;

    const passwordError = getNewPasswordError(password);
    if (passwordError) {
      showNotice("error", "Password needs work", passwordError);
      return null;
    }

    return { email: value, password };
  }

  async function signIn() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so account login is disabled in this preview.");
      return;
    }

    const credentials = getSignInCredentials();
    if (!credentials) return;

    setBusy("signin");
    try {
      await setRememberMePreference(rememberMe);
      const result = await supabase.auth.signInWithPassword(credentials);

      if (result.error) {
        const message = result.error.message;

        if (isEmailNotConfirmedError(message)) {
          setEmail(credentials.email);
          setStep("code");
          showNotice(
            "info",
            "Verification needed",
            "This Donezo account still needs the email code. Enter the code from your inbox, or tap Resend code.",
          );
          return;
        }

        if (isInvalidCredentialsError(message)) {
          showNotice(
            "error",
            "Couldn’t sign in",
            "We couldn’t find a matching account with that email and password. Check the spelling, create an account, or reset your password.",
          );
          return;
        }

        showNotice("error", "Sign in failed", friendlyAuthMessage(message));
      }
    } catch (error) {
      showNotice("error", "Sign in failed", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function createAccount() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so account creation is disabled in this preview.");
      return;
    }

    const credentials = getSignupCredentials();
    if (!credentials) return;

    setBusy("signup");
    try {
      await setRememberMePreference(rememberMe);
      const redirectTo = getAuthRedirectUrl();
      const result = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (result.error) {
        if (isAlreadyRegisteredError(result.error.message)) {
          await moveExistingSignupToCodeStep(credentials.email);
          return;
        }

        showNotice("error", "Account failed", friendlyAuthMessage(result.error.message));
        return;
      }

      if (isObfuscatedExistingUser(result.data.user)) {
        setStep("signin");
        showNotice(
          "info",
          "Account may already exist",
          "Try signing in with this email, or use Forgot password if you don’t remember the password.",
        );
        return;
      }

      setEmail(credentials.email);

      if (result.data.session) {
        showNotice("success", "Welcome to Donezo", "Your account is ready.");
      } else {
        setStep("code");
        showNotice("success", "Code sent", "Check your email for the Donezo account verification code.");
      }
    } catch (error) {
      showNotice("error", "Account failed", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function moveExistingSignupToCodeStep(value: string) {
    const resendResult = await resendSignupCodeForEmail(value);

    setEmail(value);
    setCode("");

    if (resendResult === "already-confirmed") {
      setStep("signin");
      showNotice(
        "info",
        "Account already ready",
        "That email looks like it may already have a Donezo account. Try signing in, or use Forgot password if you don’t remember it.",
      );
      return;
    }

    setStep("code");

    if (resendResult === "sent") {
      showNotice(
        "success",
        "Check your inbox",
        "If this account is still waiting for verification, we sent the latest Donezo code.",
      );
      return;
    }

    showNotice(
      "info",
      "Check your email",
      "If this account is waiting for verification, enter the existing code or tap Resend code in a minute.",
    );
  }

  async function resendSignupCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so code emails are disabled in this preview.");
      return;
    }

    const value = getValidatedEmail();
    if (!value) return;

    setBusy("resend");
    try {
      const result = await resendSignupCodeForEmail(value);

      if (result === "sent") {
        showNotice(
          "success",
          "Check your inbox",
          "If this account is still waiting for verification, we sent the latest Donezo code.",
        );
      } else if (result === "already-confirmed") {
        setStep("signin");
        showNotice("info", "Already verified", "This email looks verified. Try signing in or reset your password.");
      } else {
        showNotice("error", "Code failed to resend", "Please wait a minute and try again.");
      }
    } catch (error) {
      showNotice("error", "Code failed to resend", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function resendSignupCodeForEmail(value: string): Promise<"sent" | "already-confirmed" | "failed"> {
    if (!supabase) return "failed";

    const result = await supabase.auth.resend({
      type: "signup",
      email: value,
      options: getAuthRedirectUrl() ? { emailRedirectTo: getAuthRedirectUrl() } : undefined,
    });

    if (!result.error) return "sent";

    const message = result.error.message.toLowerCase();
    if (message.includes("already confirmed") || message.includes("already verified")) {
      return "already-confirmed";
    }

    return "failed";
  }

  async function verifySignupCode() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so verification is disabled in this preview.");
      return;
    }

    const value = getValidatedEmail();
    if (!value) return;

    const normalizedCode = code.trim();

    if (normalizedCode.length < 6) {
      showNotice("error", "Code needed", "Enter the 6-digit code from your Donezo email.");
      return;
    }

    setBusy("verify");
    try {
      const result = await supabase.auth.verifyOtp({
        email: value,
        token: normalizedCode,
        type: "signup",
      });

      if (result.error) {
        showNotice("error", "Code did not work", friendlyAuthMessage(result.error.message));
      }
    } catch (error) {
      showNotice("error", "Code did not work", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function requestPasswordReset() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so password reset is disabled in this preview.");
      return;
    }

    const value = getValidatedEmail();
    if (!value) return;

    setBusy("forgot");
    try {
      const redirectTo = getAuthRedirectUrl();
      const result = await supabase.auth.resetPasswordForEmail(
        value,
        redirectTo ? { redirectTo } : undefined,
      );

      if (result.error) {
        showNotice("error", "Reset email failed", friendlyAuthMessage(result.error.message));
        return;
      }

      setEmail(value);
      setStep("resetSent");
      showNotice("success", "Reset email sent", "If that email has a Donezo account, a password reset email is on the way.");
    } catch (error) {
      showNotice("error", "Reset email failed", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function updateRecoveredPassword() {
    if (busy) return;

    if (!hasSupabaseEnv() || !supabase) {
      showNotice("info", "Demo mode", "Supabase env is missing, so password reset is disabled in this preview.");
      return;
    }

    const passwordError = getNewPasswordError(newPassword);
    if (passwordError) {
      showNotice("error", "Password needs work", passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotice("error", "Passwords don’t match", "Type the same new password in both fields.");
      return;
    }

    setBusy("reset");
    try {
      const result = await supabase.auth.updateUser({ password: newPassword });

      if (result.error) {
        showNotice("error", "Password failed", friendlyAuthMessage(result.error.message));
        return;
      }

      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showNotice("success", "Password updated", "You’re back in Donezo.");
      onRecoveryComplete?.();
    } catch (error) {
      showNotice("error", "Password failed", getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>D</Text>
          </View>
          <Text style={styles.eyebrow}>DONEZO</Text>
          <Text style={styles.title}>{copy.heroTitle}</Text>
          <Text style={styles.subcopy}>{copy.heroCopy}</Text>

          <View style={styles.form}>
            {(step === "signin" || step === "signup") && (
              <View style={styles.switcher}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => moveTo("signin")}
                  style={[styles.switchItem, step === "signin" && styles.switchItemActive]}
                >
                  <Text style={[styles.switchText, step === "signin" && styles.switchTextActive]}>Sign in</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => moveTo("signup")}
                  style={[styles.switchItem, step === "signup" && styles.switchItemActive]}
                >
                  <Text style={[styles.switchText, step === "signup" && styles.switchTextActive]}>Create account</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.cardTitle}>{copy.cardTitle}</Text>
            <Text style={styles.helper}>{copy.cardCopy}</Text>

            {notice && (
              <View style={[styles.notice, styles[`${notice.tone}Notice`]]}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeMessage}>{notice.message}</Text>
              </View>
            )}

            {step === "signin" && (
              <>
                {renderEmailInput(email, setEmail)}
                {renderPasswordInput({
                  label: "PASSWORD",
                  value: password,
                  onChangeText: setPassword,
                  autoComplete: "current-password",
                  placeholder: "Your password",
                })}
                {renderRememberMe(rememberMe, setRememberMe)}
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "signin" ? "Signing in..." : "Sign in"}
                    onPress={signIn}
                  />
                </View>
                <View style={styles.linkRow}>
                  <AuthLink label="Forgot password?" onPress={() => moveTo("forgot")} />
                </View>
              </>
            )}

            {step === "signup" && (
              <>
                {renderEmailInput(email, setEmail)}
                {renderPasswordInput({
                  label: "PASSWORD",
                  value: password,
                  onChangeText: setPassword,
                  autoComplete: "new-password",
                  placeholder: "At least 8 characters",
                })}
                <Text style={styles.passwordHint}>Use 8+ characters. Longer is better; password managers are elite little goblins.</Text>
                {renderRememberMe(rememberMe, setRememberMe)}
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "signup" ? "Creating account..." : "Create account"}
                    onPress={createAccount}
                  />
                </View>
              </>
            )}

            {step === "code" && (
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
                </View>
                <View style={styles.linkRow}>
                  <AuthLink label="Back to sign in" onPress={() => moveTo("signin")} />
                </View>
              </>
            )}

            {step === "forgot" && (
              <>
                {renderEmailInput(email, setEmail)}
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "forgot" ? "Sending..." : "Send reset email"}
                    onPress={requestPasswordReset}
                  />
                </View>
                <View style={styles.linkRow}>
                  <AuthLink label="Back to sign in" onPress={() => moveTo("signin")} />
                </View>
              </>
            )}

            {step === "resetSent" && (
              <>
                <Text style={styles.emailPill}>{normalizedEmail || "your email"}</Text>
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "forgot" ? "Sending again..." : "Send again"}
                    onPress={requestPasswordReset}
                    tone="ghost"
                  />
                </View>
                <View style={styles.linkRow}>
                  <AuthLink label="Back to sign in" onPress={() => moveTo("signin")} />
                </View>
              </>
            )}

            {step === "resetPassword" && (
              <>
                {normalizedEmail ? <Text style={styles.emailPill}>{normalizedEmail}</Text> : null}
                {renderPasswordInput({
                  label: "NEW PASSWORD",
                  value: newPassword,
                  onChangeText: setNewPassword,
                  autoComplete: "new-password",
                  placeholder: "At least 8 characters",
                })}
                {renderPasswordInput({
                  label: "CONFIRM PASSWORD",
                  value: confirmPassword,
                  onChangeText: setConfirmPassword,
                  autoComplete: "new-password",
                  placeholder: "Type it again",
                })}
                <View style={styles.actions}>
                  <AppButton
                    disabled={isBusy}
                    label={busy === "reset" ? "Saving..." : "Save new password"}
                    onPress={updateRecoveredPassword}
                  />
                </View>
              </>
            )}
          </View>

          <Text style={styles.footer}>Donezo keeps your tasks, routines, and projects synced across devices.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function renderEmailInput(email: string, setEmail: (value: string) => void) {
  return (
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
    </>
  );
}

function renderPasswordInput({
  label,
  value,
  onChangeText,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label.toLowerCase()}
        autoComplete={autoComplete}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
        value={value}
      />
    </>
  );
}

function renderRememberMe(rememberMe: boolean, setRememberMe: (value: (current: boolean) => boolean) => void) {
  return (
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
  switch (step) {
    case "signup":
      return {
        heroTitle: "Make it Donezo.",
        heroCopy: "Create your personal account. One email code, then your tasks sync everywhere.",
        cardTitle: "Create account",
        cardCopy: "Use an email and password. We’ll verify your email with a quick code.",
      };
    case "code":
      return {
        heroTitle: "Tiny code. Big entrance.",
        heroCopy: "Enter the 6-digit code from your email to activate Donezo.",
        cardTitle: "Verify your email",
        cardCopy: "No link clicking required. Just type the code and you’re in.",
      };
    case "forgot":
      return {
        heroTitle: "Password went poof?",
        heroCopy: "It happens. Send yourself a reset email and get back to your lists.",
        cardTitle: "Reset password",
        cardCopy: "Enter your email and we’ll send a secure reset link.",
      };
    case "resetSent":
      return {
        heroTitle: "Check your inbox.",
        heroCopy: "Open the Donezo reset email, then choose a fresh password.",
        cardTitle: "Reset email sent",
        cardCopy: "If that email has a Donezo account, the reset email should arrive soon.",
      };
    case "resetPassword":
      return {
        heroTitle: "Pick a fresh password.",
        heroCopy: "Make it strong enough that chaos itself gives up.",
        cardTitle: "Set new password",
        cardCopy: "Choose a new password for your Donezo account.",
      };
    case "signin":
    default:
      return {
        heroTitle: "Tasks? Donezo.",
        heroCopy: "Sign in to sync your daily tasks, streaks, and projects across devices.",
        cardTitle: "Welcome back",
        cardCopy: "Use your email and password. New accounts verify once with an email code.",
      };
  }
}

function getNewPasswordError(value: string): string | null {
  if (value.length < 8) {
    return "Use at least 8 characters for the password.";
  }

  return null;
}

function getAuthRedirectUrl(): string | undefined {
  if (Platform.OS !== "web") return undefined;

  const maybeGlobal = globalThis as typeof globalThis & {
    location?: { origin?: string };
  };

  return maybeGlobal.location?.origin;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

function friendlyAuthMessage(message: string): string {
  if (message.toLowerCase().includes("rate limit")) {
    return "Too many tries too fast. Give it a minute, then try again.";
  }

  return message;
}

function isEmailNotConfirmedError(message: string): boolean {
  const value = message.toLowerCase();
  return value.includes("email not confirmed") || value.includes("not confirmed");
}

function isInvalidCredentialsError(message: string): boolean {
  const value = message.toLowerCase();
  return value.includes("invalid login credentials") || value.includes("invalid credentials");
}

function isAlreadyRegisteredError(message: string): boolean {
  const value = message.toLowerCase();
  return value.includes("already registered") || value.includes("already exists") || value.includes("user exists");
}

function isObfuscatedExistingUser(user: { identities?: unknown[] } | null): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
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
  form: {
    marginTop: 32,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 16,
  },
  switcher: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    padding: 4,
  },
  switchItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    borderRadius: 6,
  },
  switchItemActive: {
    backgroundColor: colors.accent,
  },
  switchText: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  switchTextActive: {
    color: colors.black,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 19,
  },
  label: { marginBottom: 7, color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  helper: { marginTop: 6, marginBottom: 14, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
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
  passwordHint: {
    marginTop: -8,
    marginBottom: 14,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
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
  notice: {
    marginBottom: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
  },
  infoNotice: {
    borderColor: colors.lineStrong,
    backgroundColor: "rgba(157,183,255,0.09)",
  },
  successNotice: {
    borderColor: "rgba(216,183,106,0.45)",
    backgroundColor: colors.accentTint,
  },
  errorNotice: {
    borderColor: "rgba(242,109,95,0.45)",
    backgroundColor: "rgba(242,109,95,0.1)",
  },
  noticeTitle: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  noticeMessage: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
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
  linkRow: {
    alignItems: "center",
    marginTop: 14,
  },
  linkText: {
    color: colors.accentSoft,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  pressed: { opacity: 0.78 },
  footer: { marginTop: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

export default AuthScreen;
