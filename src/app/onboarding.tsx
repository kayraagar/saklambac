import { useMutation } from "convex/react";
import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/button";
import { ErrorText } from "@/components/error-text";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export default function Onboarding() {
  const upsert = useMutation(api.profiles.upsert);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const n = name.trim();
    const u = username.trim().toLowerCase();
    if (n.length < 1 || n.length > 30) return setError("Ad soyad 1-30 karakter olmalı.");
    if (!USERNAME_RE.test(u)) {
      return setError("Kullanıcı adı 3-20 karakter olmalı; sadece harf (a-z), rakam, nokta ve alt çizgi.");
    }
    setBusy(true);
    setError(null);
    try {
      await upsert({ name: n, username: u });
      // profiles.me updates reactively; the auth gate moves us to home.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Devam" onPress={save} loading={busy} />}>
      <AppText variant="title" style={styles.title}>
        Seni tanıyalım
      </AppText>
      <AppText variant="caption">Oyunda diğer oyuncular bu ismi görecek.</AppText>

      <AppText variant="label">Ad Soyad</AppText>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        maxLength={30}
        autoComplete="name"
        textContentType="name"
      />
      <AppText variant="label">Kullanıcı Adı</AppText>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ""))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        textContentType="username"
      />
      <ErrorText message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.xl },
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
});
