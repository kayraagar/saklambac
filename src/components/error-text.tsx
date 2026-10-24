import { StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { AppText } from "./text";

export function ErrorText({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <AppText accessibilityRole="alert" style={styles.text} color={Colors.danger}>
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 14, fontWeight: "600" } });
