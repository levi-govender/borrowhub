import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";
import { createCatalogueApi, resolveBffBaseUrl } from "./src/api";
import { CatalogueScreen } from "./src/screens/CatalogueScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { MyBookingsScreen } from "./src/screens/MyBookingsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SignInScreen } from "./src/screens/SignInScreen";

export default function App() {
  const [objectId, setObjectId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const api = useMemo(
    () =>
      createCatalogueApi(
        resolveBffBaseUrl(process.env as Record<string, string | undefined>, Platform.OS),
        fetch,
        objectId ? { objectId } : undefined,
      ),
    [objectId],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {!objectId ? (
        <SignInScreen onContinue={setObjectId} />
      ) : showProfile ? (
        <ProfileScreen
          api={api}
          onBack={() => setShowProfile(false)}
          onSignOut={() => {
            setShowProfile(false);
            setShowBookings(false);
            setSelectedId(null);
            setObjectId(null);
          }}
        />
      ) : showBookings ? (
        <MyBookingsScreen api={api} onBack={() => setShowBookings(false)} />
      ) : selectedId ? (
        <DetailScreen api={api} id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <CatalogueScreen
          api={api}
          onOpen={setSelectedId}
          onOpenProfile={() => setShowProfile(true)}
          onOpenBookings={() => setShowBookings(true)}
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
