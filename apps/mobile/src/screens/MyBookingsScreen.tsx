import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CatalogueApiError, formatBookingReminder, type Booking, type CatalogueApi } from "../api";

type Props = {
  api: CatalogueApi;
  onBack: () => void;
};

export function MyBookingsScreen({ api, onBack }: Props) {
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.listMine({ page: 1, pageSize: 20 });
      setItems(page.items);
      setTotal(page.total);
    } catch (caught) {
      setItems([]);
      setTotal(0);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, run: () => Promise<Booking>, failed: string) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await run();
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (caught) {
      setError(caught instanceof CatalogueApiError ? caught.message : failed);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to catalogue" onPress={onBack}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      <Text style={styles.eyebrow} accessibilityRole="header">
        My bookings
      </Text>
      <Text style={styles.title}>Your reservations</Text>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading bookings" />
      ) : error && items.length === 0 ? (
        <View style={styles.block}>
          <Text style={styles.body}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}>
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.body}>You have no bookings yet.</Text>
      ) : (
        <>
          {error ? <Text style={styles.body}>{error}</Text> : null}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            accessibilityLabel={`${total} bookings`}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{item.assetTag}</Text>
                <Text style={styles.rowMeta}>
                  {item.status} · {item.startAt} → {item.endAt}
                  {item.damageNote ? ` · ${item.damageNote}` : ""}
                </Text>
                {item.reminders?.map((kind) => (
                  <Text key={kind} style={styles.reminder} accessibilityLiveRegion="polite">
                    {formatBookingReminder(kind)}
                  </Text>
                ))}
                {item.allowedActions.includes("CANCEL") ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel booking ${item.assetTag}`}
                    onPress={() => void act(item.id, () => api.cancelBooking(item.id), "Could not cancel this booking.")}
                    disabled={busyId === item.id}
                    style={styles.button}
                  >
                    <Text style={styles.buttonLabel}>{busyId === item.id ? "Working…" : "Cancel"}</Text>
                  </Pressable>
                ) : null}
                {item.allowedActions.includes("COLLECT") ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Collect booking ${item.assetTag}`}
                    onPress={() => void act(item.id, () => api.collectBooking(item.id), "Could not collect this booking.")}
                    disabled={busyId === item.id}
                    style={styles.button}
                  >
                    <Text style={styles.buttonLabel}>{busyId === item.id ? "Working…" : "Collect"}</Text>
                  </Pressable>
                ) : null}
                {item.allowedActions.includes("RETURN") ? (
                  <>
                    <TextInput
                      accessibilityLabel={`Damage note for ${item.assetTag}`}
                      placeholder="Damage note (optional)"
                      value={damageNotes[item.id] ?? ""}
                      onChangeText={(value) => setDamageNotes((current) => ({ ...current, [item.id]: value }))}
                      autoCapitalize="none"
                      style={styles.note}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Return booking ${item.assetTag}`}
                      onPress={() =>
                        void act(
                          item.id,
                          () => api.returnBooking(item.id, crypto.randomUUID(), damageNotes[item.id] ?? ""),
                          "Could not return this booking.",
                        )
                      }
                      disabled={busyId === item.id}
                      style={styles.button}
                    >
                      <Text style={styles.buttonLabel}>{busyId === item.id ? "Working…" : "Return"}</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f1ea",
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  back: {
    fontSize: 16,
    textDecorationLine: "underline",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  block: {
    gap: 12,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d2c4",
  },
  rowTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 14,
    marginBottom: 8,
  },
  reminder: {
    fontSize: 14,
    marginBottom: 6,
  },
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  note: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
