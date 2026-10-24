import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/button";
import { CodeInput } from "@/components/code-input";
import { ErrorText } from "@/components/error-text";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { GAME_CODE_LENGTH } from "@/engine";
import { errorMessage } from "@/lib/errors";

export default function Join() {
  const join = useMutation(api.games.join);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (c = code) => {
    if (c.length !== GAME_CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { gameId } = await join({ code: c });
      router.replace(`/game/${gameId}/lobby`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <Button
          title="Katıl"
          variant="runner"
          onPress={() => submit()}
          loading={busy}
          disabled={code.length !== GAME_CODE_LENGTH}
        />
      }
    >
      <AppText variant="heading">Oyun kodunu gir</AppText>
      <AppText variant="caption">Kodu oyunu kuran arkadaşından al. Yapıştırabilirsin de.</AppText>
      <CodeInput
        value={code}
        onChange={(c) => {
          setCode(c);
          setError(null);
        }}
        onComplete={submit}
        editable={!busy}
      />
      <ErrorText message={error} />
    </Screen>
  );
}
