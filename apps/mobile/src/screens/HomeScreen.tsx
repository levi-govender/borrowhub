import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CatalogueApiError,
  formatBookingReminder,
  formatOfficeWindow,
  type Booking,
  type CatalogueApi,
  type Me,
} from "../api";
import { bookingsNeedingAttention, nextUpcomingReservation } from "../home";

type Props = {
  api: CatalogueApi;
  onOpenCatalogue: () => void;
  onOpenBookings: () => void;
  onOpenProfile: () => void;
};

export function HomeScreen({ api, onOpenCatalogue, onOpenBookings, onOpenProfile }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, page] = await Promise.all([api.me(), api.listMine({ page: 1, pageSize: 20 })]);
      setMe(profile);
      setItems(page.items);
    } catch (caught) {
      setMe(null);
      setItems([]);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not load home.");
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

  const due = bookingsNeedingAttention(items);
  const next = nextUpcomingReservation(items);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow} accessibilityRole="header">
        Home
      </Text>
      <Text style={styles.title}>{me ? `Hi, ${me.displayName}` : "Your office loans"}</Text>
      <Text style={styles.body}>Africa/Johannesburg · collect and return from here when Java says it is time.</Text>

      <View style={styles.nav}>
        <Pressable accessibilityRole="button" onPress={onOpenCatalogue} style={styles.button}>
          <Text style={styles.buttonLabel}>Browse catalogue</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenBookings} style={styles.button}>
          <Text style={styles.buttonLabel}>My bookings</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenProfile} style={styles.button}>
          <Text style={styles.buttonLabel}>Profile</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading home" />
      ) : error && items.length === 0 && !me ? (
        <View style={styles.block}>
          <Text style={styles.body}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}>
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.body}>{error}</Text> : null}

          <Text style={styles.section}>Due now</Text>
          {due.length === 0 ? (
            <Text style={styles.body}>Nothing to collect or return right now.</Text>
          ) : (
            due.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowTitle}>{item.assetTag}</Text>
                <Text style={styles.rowMeta}>{formatOfficeWindow(item.startAt, item.endAt)}</Text>
                {item.reminders?.map((kind) => (
                  <Text key={kind} style={styles.reminder} accessibilityLiveRegion="polite">
                    {formatBookingReminder(kind)}
                  </Text>
                ))}
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
            ))
          )}

          <Text style={styles.section}>Up next</Text>
          {next ? (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>{next.assetTag}</Text>
              <Text style={styles.rowMeta}>
                {next.status} · {formatOfficeWindow(next.startAt, next.endAt)}
              </Text>
              {next.allowedActions.includes("CANCEL") ? (
                <>
                  <TextInput
                    accessibilityLabel={`Cancellation reason for ${next.assetTag}`}
                    placeholder="Cancellation reason (optional)"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    autoCapitalize="sentences"
                    style={styles.note}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel booking ${next.assetTag}`}
                    onPress={() =>
                      void act(next.id, () => api.cancelBooking(next.id, undefined, cancelReason), "Could not cancel this booking.")
                    }
                    disabled={busyId === next.id}
                    style={styles.button}
                  >
                    <Text style={styles.buttonLabel}>{busyId === next.id ? "Working…" : "Cancel"}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : (
            <Text style={styles.body}>No upcoming reservation. Browse the catalogue to book an asset.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f1ea",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  nav: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 16,
  },
  section: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
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
    marginVertical: 4,
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
