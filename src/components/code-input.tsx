import { useRef } from "react";
import { StyleSheet, TextInput, View, type TextInputInstance } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { GAME_CODE_LENGTH } from "@/engine";

const clean = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * One box per character. Typing advances, backspace on an empty box goes back,
 * and pasting a whole code into any box fills the rest.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  editable = true,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  editable?: boolean;
}) {
  const refs = useRef<(TextInputInstance | null)[]>([]);
  const chars = Array.from({ length: GAME_CODE_LENGTH }, (_, i) => value[i] ?? "");

  const setAt = (index: number, text: string) => {
    const incoming = clean(text);
    const next = chars.slice();
    if (incoming.length === 0) {
      next[index] = "";
    } else if (incoming.length >= GAME_CODE_LENGTH) {
      // Whole code pasted (possibly after an existing char): keep the last 6.
      incoming.slice(-GAME_CODE_LENGTH).split("").forEach((c, i) => (next[i] = c));
    } else {
      // Typed one char (box may already hold one, so take the last) or pasted a fragment.
      const fill = incoming.length === 2 && chars[index] ? incoming.slice(1) : incoming;
      fill.split("").forEach((c, i) => {
        if (index + i < GAME_CODE_LENGTH) next[index + i] = c;
      });
    }
    const code = next.join("");
    onChange(code);
    const firstEmpty = next.findIndex((c) => !c);
    if (firstEmpty === -1) {
      refs.current[GAME_CODE_LENGTH - 1]?.blur();
      onComplete?.(code);
    } else if (incoming.length > 0) {
      refs.current[firstEmpty]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {chars.map((c, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          accessibilityLabel={`Kod ${i + 1}. karakter`}
          style={[styles.box, c ? styles.filled : null]}
          value={c}
          onChangeText={(t) => setAt(i, t)}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === "Backspace" && !chars[i] && i > 0) {
              refs.current[i - 1]?.focus();
              setAt(i - 1, "");
            }
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          selectTextOnFocus
          autoFocus={i === 0}
          editable={editable}
          textAlign="center"
          returnKeyType="go"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.8,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  filled: { borderColor: Colors.runner },
});
