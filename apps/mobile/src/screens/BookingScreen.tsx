import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CatalogueApiError,
  formatBookingReminder,
  formatBookingStatus,
  formatOfficeWindow,
  type Booking,
  type CatalogueApi,
} from "../api";

type Props = {
  api: CatalogueApi;
  id: string;
  onBack: () => void;
};

export function BookingScreen({ api, id, onBack }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [damageNote, setDamageNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooking(await api.getBooking(id));
    } catch (caught) {
      setBooking(null);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not load this booking.");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (run: () => Promise<Booking>, failed: string) => {
    setBusy(true);
    setError(null);
    try {
      setBooking(await run());
    } catch (caught) {
      setError(caught instanceof CatalogueApiError ? caught.message : failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to my bookings" onPress={onBack}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading booking" />
      ) : error && !booking ? (
        <View>
          <Text style={styles.body}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}>
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : booking ? (
        <View>
          <Text style={styles.eyebrow}>{formatBookingStatus(booking.status)}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {booking.equipmentName || booking.assetTag}
          </Text>
          <Text style={styles.body}>{booking.assetTag}</Text>
          <Text style={styles.body}>{formatOfficeWindow(booking.startAt, booking.endAt)}</Text>
          {booking.cancellationReason ? <Text style={styles.body}>Cancelled: {booking.cancellationReason}</Text> : null}
          {booking.damageNote ? <Text style={styles.body}>Damage: {booking.damageNote}</Text> : null}
          {booking.reminders?.map((kind) => (
            <Text key={kind} style={styles.body}>
              {formatBookingReminder(kind)}
            </Text>
          ))}
          {error ? <Text style={styles.body}>{error}</Text> : null}
          {booking.allowedActions.includes("CANCEL") ? (
            <>
              <TextInput
                accessibilityLabel="Cancellation reason"
                placeholder="Cancellation reason (optional)"
                value={reason}
                onChangeText={setReason}
                style={styles.note}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cancel booking ${booking.assetTag}`}
                disabled={busy}
                onPress={() => void act(() => api.cancelBooking(booking.id, undefined, reason), "Could not cancel this booking.")}
                style={styles.button}
              >
                <Text style={styles.buttonLabel}>{busy ? "Working…" : "Cancel"}</Text>
              </Pressable>
            </>
          ) : null}
          {booking.allowedActions.includes("COLLECT") ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Collect booking ${booking.assetTag}`}
              disabled={busy}
              onPress={() => void act(() => api.collectBooking(booking.id), "Could not collect this booking.")}
              style={styles.button}
            >
              <Text style={styles.buttonLabel}>{busy ? "Working…" : "Collect"}</Text>
            </Pressable>
          ) : null}
          {booking.allowedActions.includes("RETURN") ? (
            <>
              <TextInput
                accessibilityLabel="Damage note"
                placeholder="Damage note (optional)"
                value={damageNote}
                onChangeText={setDamageNote}
                style={styles.note}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Return booking ${booking.assetTag}`}
                disabled={busy}
                onPress={() =>
                  void act(() => api.returnBooking(booking.id, undefined, damageNote), "Could not return this booking.")
                }
                style={styles.button}
              >
                <Text style={styles.buttonLabel}>{busy ? "Working…" : "Return"}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f1ea" },
  content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  back: { fontSize: 16, marginBottom: 16 },
  eyebrow: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 28, marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  note: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  buttonLabel: { fontSize: 16 },
});
