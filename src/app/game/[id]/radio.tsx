import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ErrorText } from "@/components/error-text";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatClock } from "@/lib/format";

type Message = FunctionReturnType<typeof api.messages.list>[number];

export default function Radio() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const messages = useQuery(api.messages.list, { gameId });
  const game = useQuery(api.games.byId, { gameId });
  const send = useMutation(api.messages.send);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const me = game?.me;
  const color = teamColor(me?.team);
  const readOnly = !me?.team || me.status !== "active" || game?.phase === "over";

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError(null);
    try {
      await send({ gameId, text: t });
      setText("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <AppText variant="caption" style={styles.note}>
          Sadece {teamLabel(me?.team).toLowerCase()} takımı bu mesajları görür.
        </AppText>
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <Bubble m={item} color={color} />}
          ListEmptyComponent={
            <AppText variant="caption" style={styles.empty}>
              Telsiz sessiz. İlk mesajı sen at.
            </AppText>
          }
        />
        <ErrorText message={error} />
        {readOnly ? (
          <View style={styles.readOnly}>
            <AppText variant="caption">
              {game?.phase === "over"
                ? "Oyun bitti; telsiz kapandı."
                : "Yakalandığın için sadece okuyabilirsin."}
            </AppText>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Takımına yaz…"
              placeholderTextColor={Colors.textFaint}
              maxLength={500}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gönder"
              disabled={!text.trim() || sending}
              onPress={submit}
              style={[styles.send, { backgroundColor: color, opacity: !text.trim() || sending ? 0.4 : 1 }]}
            >
              <AppText style={styles.sendText} color={Colors.onAccent}>
                Gönder
              </AppText>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ m, color }: { m: Message; color: string }) {
  return (
    <View style={[styles.bubble, m.isMe ? [styles.mine, { backgroundColor: color }] : styles.theirs]}>
      {!m.isMe ? (
        <AppText style={styles.name} color={color}>
          {m.name}
        </AppText>
      ) : null}
      <AppText color={m.isMe ? Colors.onAccent : Colors.text}>{m.text}</AppText>
      <AppText style={styles.time} color={m.isMe ? Colors.onAccent : Colors.textMuted}>
        {formatClock(m.at)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  note: { textAlign: "center", paddingVertical: Spacing.sm },
  list: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: Spacing.xl },
  bubble: { maxWidth: "80%", borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", backgroundColor: Colors.surfaceRaised, borderBottomLeftRadius: 4 },
  name: { fontSize: 12, fontWeight: "800" },
  time: { fontSize: 10, alignSelf: "flex-end", opacity: 0.7 },
  readOnly: { padding: Spacing.md, alignItems: "center", backgroundColor: Colors.surface },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm, padding: Spacing.md },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  send: { height: 44, paddingHorizontal: Spacing.md, borderRadius: Radius.md, justifyContent: "center" },
  sendText: { fontWeight: "800" },
});
