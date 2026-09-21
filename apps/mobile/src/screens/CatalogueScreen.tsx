import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CatalogueApiError,
  type CatalogueApi,
  type EquipmentListItem,
} from "../api";

const CATEGORIES = ["phone", "monitor", "adapter", "camera"] as const;

type Props = {
  api: CatalogueApi;
  onOpen: (id: string) => void;
};

export function CatalogueScreen({ api, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [items, setItems] = useState<EquipmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(
    async (nextQuery: string, nextCategory: string | undefined) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.list({
          query: nextQuery.trim() || undefined,
          category: nextCategory,
          page: 1,
          pageSize: 20,
        });
        setItems(page.items);
        setTotal(page.total);
      } catch (caught) {
        setItems([]);
        setTotal(0);
        setError(caught instanceof CatalogueApiError ? caught.message : "Could not load equipment.");
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void load(queryRef.current, category);
  }, [category, load]);

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow} accessibilityRole="header">
        BorrowHub · catalogue
      </Text>
      <Text style={styles.title}>Find a specific asset</Text>
      <TextInput
        accessibilityLabel="Search by name or asset tag"
        placeholder="Search name or tag"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void load(query, category)}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />
      <View style={styles.chips} accessibilityRole="tablist">
        <Chip label="All" selected={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setQuery("");
          setCategory(undefined);
          void load("", undefined);
        }}
        style={styles.reset}
      >
        <Text style={styles.resetLabel}>Reset filters</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading equipment" style={styles.center} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load(query, category)} style={styles.retry}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.message}>No equipment matches those filters.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          accessibilityLabel={`${total} assets`}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.assetTag}`}
              onPress={() => onOpen(item.id)}
              style={styles.row}
            >
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.assetTag} · {item.category} · {item.location} · {item.operationalStatus}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f1ea",
    paddingHorizontal: 24,
    paddingTop: 64,
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
  search: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: "#1a1a1a",
  },
  chipLabel: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  chipLabelSelected: {
    color: "#f4f1ea",
  },
  reset: {
    marginBottom: 16,
  },
  resetLabel: {
    fontSize: 14,
    textDecorationLine: "underline",
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
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  center: {
    marginTop: 24,
    alignItems: "flex-start",
    gap: 12,
  },
  retry: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryLabel: {
    fontSize: 16,
  },
});
