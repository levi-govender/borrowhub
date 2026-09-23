import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";
import { createCatalogueApi, resolveBffBaseUrl } from "./src/api";
import { BookingScreen } from "./src/screens/BookingScreen";
import { CatalogueScreen } from "./src/screens/CatalogueScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MyBookingsScreen } from "./src/screens/MyBookingsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SignInScreen } from "./src/screens/SignInScreen";

type Screen = "home" | "catalogue" | "bookings" | "profile";

export default function App() {
  const [objectId, setObjectId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const api = useMemo(
    () =>
      createCatalogueApi(
        resolveBffBaseUrl(process.env as Record<string, string | undefined>, Platform.OS),
        fetch,
        objectId ? { objectId } : undefined,
      ),
    [objectId],
  );

  const goHome = () => {
    setScreen("home");
    setSelectedId(null);
    setBookingId(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {!objectId ? (
        <SignInScreen
          onContinue={(next) => {
            setScreen("home");
            setSelectedId(null);
            setBookingId(null);
            setObjectId(next);
          }}
        />
      ) : screen === "profile" ? (
        <ProfileScreen
          api={api}
          onBack={goHome}
          onSignOut={() => {
            setScreen("home");
            setSelectedId(null);
            setBookingId(null);
            setObjectId(null);
          }}
        />
      ) : screen === "bookings" && bookingId ? (
        <BookingScreen api={api} id={bookingId} onBack={() => setBookingId(null)} />
      ) : screen === "bookings" ? (
        <MyBookingsScreen api={api} onBack={goHome} onOpen={setBookingId} />
      ) : selectedId ? (
        <DetailScreen api={api} id={selectedId} onBack={() => setSelectedId(null)} />
      ) : screen === "catalogue" ? (
        <CatalogueScreen
          api={api}
          onOpen={setSelectedId}
          onOpenProfile={() => setScreen("profile")}
          onOpenBookings={() => setScreen("bookings")}
          onBack={goHome}
        />
      ) : (
        <HomeScreen
          api={api}
          onOpenCatalogue={() => setScreen("catalogue")}
          onOpenBookings={() => setScreen("bookings")}
          onOpenBooking={(id) => {
            setBookingId(id);
            setScreen("bookings");
          }}
          onOpenProfile={() => setScreen("profile")}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f1ea",
  },
});
