import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>BorrowHub · employee</Text>
      <Text style={styles.title}>Reserve workplace equipment</Text>
      <Text style={styles.body}>
        Find a specific asset, pick a time window, then collect and return it.
        This screen is the Phase 0 starter shell.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1ea",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
});
