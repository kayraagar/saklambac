import { StyleSheet, Switch, View } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { AppText } from "./text";

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText style={styles.label}>{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.hunter, false: Colors.surfaceRaised }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md, minHeight: 48 },
  text: { flex: 1, gap: 2 },
  label: { fontWeight: "600" },
});
