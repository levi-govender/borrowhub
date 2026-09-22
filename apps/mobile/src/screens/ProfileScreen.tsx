import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CatalogueApiError, type CatalogueApi, type Me } from "../api";

type Props = {
  api: CatalogueApi;
  onBack: () => void;
  onSignOut: () => void;
};

export function ProfileScreen({ api, onBack, onSignOut }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .me()
      .then((next) => {
        if (!cancelled) {
          setMe(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setMe(null);
          setError(caught instanceof CatalogueApiError ? caught.message : "Could not load profile.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={onBack}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      <Text style={styles.eyebrow} accessibilityRole="header">
        Profile
      </Text>
      {error ? <Text>{error}</Text> : null}
      {me ? (
        <>
          <Text style={styles.title}>{me.displayName}</Text>
          <Text>Role {me.role}</Text>
          <Text>Object id {me.objectId}</Text>
        </>
      ) : !error ? (
        <Text>Loading profile…</Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.button}>
        <Text style={styles.buttonLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 10 },
  back: { fontSize: 16, color: "#3d5a80" },
  eyebrow: { fontSize: 13, color: "#6b6358" },
  title: { fontSize: 28, fontWeight: "600" },
  button: { marginTop: 16, backgroundColor: "#1c1916", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
