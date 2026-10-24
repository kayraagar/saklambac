import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";

export function Loading() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={Colors.hunter} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
});
