import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { ErrorText } from "@/components/error-text";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("resend-otp", { email: e });
      setStep("code");
      setNotice(`${e} adresine 6 haneli bir kod gönderdik.`);
    } catch {
      setError("Kod gönderilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Kod 6 haneli olmalı.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("resend-otp", { email: email.trim().toLowerCase(), code });
      // On success the auth gate in the root layout takes over.
      if (!res.signingIn) setError("Kod hatalı ya da süresi dolmuş.");
    } catch {
      setError("Kod hatalı ya da süresi dolmuş.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setCode("");
    await sendCode();
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="title" style={styles.logo}>
          Saklambaç
        </AppText>
        <AppText variant="caption" style={styles.center}>
          Mahallende gerçek saklambaç. Kaç, saklan, avla.
        </AppText>
      </View>

      {step === "email" ? (
        <>
          <AppText variant="label">E-posta</AppText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@eposta.com"
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={sendCode}
            editable={!busy}
          />
          <ErrorText message={error} />
          <Button title="Kod gönder" onPress={sendCode} loading={busy} />
        </>
      ) : (
        <>
          {notice ? <AppText variant="caption">{notice}</AppText> : null}
          <AppText variant="label">Doğrulama kodu</AppText>
          <TextInput
            style={[styles.input, styles.code]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            placeholderTextColor={Colors.textFaint}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            editable={!busy}
            onSubmitEditing={verify}
          />
          <ErrorText message={error} />
          <Button title="Giriş yap" onPress={verify} loading={busy} disabled={code.length !== 6} />
          <Button title="Kodu tekrar gönder" variant="secondary" onPress={resend} disabled={busy} />
          <Button
            title="E-postayı değiştir"
            variant="ghost"
            onPress={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            disabled={busy}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: Spacing.xl * 2, paddingBottom: Spacing.xl, alignItems: "center", gap: Spacing.sm },
  logo: { color: Colors.hunter, fontSize: 44 },
  center: { textAlign: "center" },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 18,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  code: { fontSize: 28, letterSpacing: 12, textAlign: "center", fontWeight: "800" },
});
