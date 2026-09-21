import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  onContinue: (objectId: string) => void;
};

export function SignInScreen({ onContinue }: Props) {
  const [objectId, setObjectId] = useState("employee-a");

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow} accessibilityRole="header">
        BorrowHub · employee
      </Text>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.copy}>
        Local demo identity. Microsoft Entra PKCE needs an Entra tenant (P0-01).
      </Text>
      <TextInput
        accessibilityLabel="Demo object id"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setObjectId}
        onSubmitEditing={() => {
          const next = objectId.trim();
          if (next.length > 0) {
            onContinue(next);
          }
        }}
        placeholder="employee-a"
        style={styles.input}
        value={objectId}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const next = objectId.trim();
          if (next.length > 0) {
            onContinue(next);
          }
        }}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 12 },
  eyebrow: { fontSize: 13, letterSpacing: 0.4, color: "#6b6358" },
  title: { fontSize: 28, fontWeight: "600", color: "#1c1916" },
  copy: { fontSize: 16, lineHeight: 22, color: "#3f3a34" },
  input: {
    borderWidth: 1,
    borderColor: "#cfc6b8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: { backgroundColor: "#1c1916", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
