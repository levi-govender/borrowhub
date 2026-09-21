import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";
import { createCatalogueApi, resolveBffBaseUrl } from "./src/api";
import { CatalogueScreen } from "./src/screens/CatalogueScreen";
import { DetailScreen } from "./src/screens/DetailScreen";

export default function App() {
  const api = useMemo(
    () => createCatalogueApi(resolveBffBaseUrl(process.env as Record<string, string | undefined>, Platform.OS)),
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      {selectedId ? (
        <DetailScreen api={api} id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <CatalogueScreen api={api} onOpen={setSelectedId} />
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
