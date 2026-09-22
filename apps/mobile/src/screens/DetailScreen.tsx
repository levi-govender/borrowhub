import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  CatalogueApiError,
  defaultAvailabilityWindow,
  formatOfficeWindow,
  isBookable,
  type Availability,
  type Booking,
  type CatalogueApi,
  type EquipmentDetail,
} from "../api";

type Props = {
  api: CatalogueApi;
  id: string;
  onBack: () => void;
};

export function DetailScreen({ api, id, onBack }: Props) {
  const [detail, setDetail] = useState<EquipmentDetail | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const window = defaultAvailabilityWindow();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAvailability(null);
    setBooking(null);
    try {
      setDetail(await api.get(id));
    } catch (caught) {
      setDetail(null);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not load this asset.");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkAvailability = async () => {
    setChecking(true);
    setError(null);
    try {
      setAvailability(await api.availability(id, window.startAt, window.endAt));
    } catch (caught) {
      setAvailability(null);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not check availability.");
    } finally {
      setChecking(false);
    }
  };

  const reserve = async () => {
    setReserving(true);
    setError(null);
    try {
      setBooking(await api.createBooking({ equipmentId: id, startAt: window.startAt, endAt: window.endAt }));
    } catch (caught) {
      setBooking(null);
      setError(caught instanceof CatalogueApiError ? caught.message : "Could not create the reservation.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to catalogue" onPress={onBack}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading asset" />
      ) : error && !detail ? (
        <View style={styles.block}>
          <Text style={styles.body}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}>
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : detail ? (
        <View>
          <Text style={styles.eyebrow}>{detail.assetTag}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {detail.name}
          </Text>
          <Text style={styles.body}>
            {detail.category} · {detail.location} · {detail.operationalStatus}
          </Text>
          <Text style={styles.body}>{detail.description ?? "No description."}</Text>
          <Text style={styles.section}>Booking policy</Text>
          <Text style={styles.body}>
            Office timezone {detail.policy.officeTimezone}. Reservations last at least{" "}
            {detail.policy.minDurationMinutes} minutes and at most {detail.policy.maxDurationDays}{" "}
            days, must start within {detail.policy.maxAdvanceDays} days, and collection opens{" "}
            {detail.policy.collectionLeadMinutes} minutes before start.
          </Text>
          <Text style={styles.section}>Availability check</Text>
          <Text style={styles.body}>
            Default window {formatOfficeWindow(window.startAt, window.endAt)}. This is a snapshot; creating a booking
            will revalidate.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void checkAvailability()}
            style={styles.button}
            disabled={checking}
          >
            <Text style={styles.buttonLabel}>{checking ? "Checking…" : "Check this window"}</Text>
          </Pressable>
          {availability ? (
            <Text style={styles.body}>
              {availability.available
                ? "That window looks free."
                : `Not available (${availability.reason ?? "conflict"}).`}
            </Text>
          ) : null}
          <Text style={styles.section}>Reserve</Text>
          <Text style={styles.body}>
            Creates a RESERVED booking for the same window. Java re-checks overlap. Requires you to be signed in
            (demo object id).
            {isBookable(detail.operationalStatus) ? "" : " This asset is not ACTIVE, so Reserve is disabled."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reserve this window"
            onPress={() => void reserve()}
            style={styles.button}
            disabled={reserving || !isBookable(detail.operationalStatus)}
          >
            <Text style={styles.buttonLabel}>
              {reserving ? "Reserving…" : "Reserve this window"}
            </Text>
          </Pressable>
          {booking ? (
            <Text style={styles.body} accessibilityLiveRegion="polite">
              Reserved. Booking {booking.id} is {booking.status}.
            </Text>
          ) : null}
          {error ? <Text style={styles.body}>{error}</Text> : null}
        </View>
      ) : null}
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
    paddingBottom: 48,
    gap: 12,
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
    marginBottom: 12,
  },
  section: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  block: {
    gap: 12,
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
});
