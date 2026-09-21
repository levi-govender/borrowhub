import { useCallback, useEffect, useMemo, useState } from "react";
import {
  InventoryApiError,
  createInventoryApi,
  resolveBffBaseUrl,
  type EquipmentListItem,
} from "./api";

const CATEGORIES = ["phone", "monitor", "adapter", "camera"] as const;
const PAGE_SIZE = 20;

export function App() {
  const api = useMemo(() => createInventoryApi(resolveBffBaseUrl()), []);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EquipmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.list({
        query: submittedQuery || undefined,
        category: category || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (caught) {
      setItems([]);
      setTotal(0);
      setError(caught instanceof InventoryApiError ? caught.message : "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }, [api, category, page, submittedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="inventory">
      <p className="eyebrow">BorrowHub · admin</p>
      <h1>Inventory</h1>
      <p>The same seeded assets as the employee catalogue, loaded through the BFF.</p>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSubmittedQuery(query.trim());
        }}
      >
        <label>
          Search
          <input
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Category
          <select
            name="category"
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value);
            }}
          >
            <option value="">All</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Search</button>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setSubmittedQuery("");
            setCategory("");
            setPage(1);
          }}
        >
          Reset
        </button>
      </form>
      {loading ? (
        <p role="status">Loading inventory…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p>No equipment matches those filters.</p>
      ) : (
        <>
          <table>
            <caption>{total} assets</caption>
            <thead>
              <tr>
                <th scope="col">Tag</th>
                <th scope="col">Name</th>
                <th scope="col">Category</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.assetTag}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.location}</td>
                  <td>{item.operationalStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <p>
              Page {page} of {pageCount}
            </p>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
