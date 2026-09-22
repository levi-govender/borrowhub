import { useCallback, useEffect, useMemo, useState } from "react";
import { SignIn } from "./SignIn";
import {
  InventoryApiError,
  createInventoryApi,
  resolveBffBaseUrl,
  dashboardBookingFilter,
  formatAuditChange,
  type AdminSummary,
  type BookingDetail,
  type BookingListItem,
  type DemoIdentity,
  type EquipmentDetail,
  type EquipmentListItem,
  type Me,
  type OperationalStatus,
} from "./api";

const CATEGORIES = ["phone", "monitor", "adapter", "camera"] as const;
const PAGE_SIZE = 20;

type Tab = "dashboard" | "inventory" | "bookings";

function formatInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function App() {
  const [identity, setIdentity] = useState<DemoIdentity | null>(null);
  const api = useMemo(
    () => (identity ? createInventoryApi(resolveBffBaseUrl(), fetch, identity) : null),
    [identity],
  );
  const [tab, setTab] = useState<Tab>("dashboard");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EquipmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [equipmentDetailError, setEquipmentDetailError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [bookingQuery, setBookingQuery] = useState("");
  const [submittedBookingQuery, setSubmittedBookingQuery] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadSummary = useCallback(async () => {
    if (!api) {
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [nextSummary, nextMe] = await Promise.all([api.summary(), api.me()]);
      setSummary(nextSummary);
      setMe(nextMe);
    } catch (caught) {
      setSummary(null);
      setMe(null);
      setSummaryError(caught instanceof InventoryApiError ? caught.message : "Could not load the dashboard.");
    } finally {
      setSummaryLoading(false);
    }
  }, [api]);

  const loadInventory = useCallback(async () => {
    if (!api) {
      return;
    }
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

  const loadBookings = useCallback(async () => {
    if (!api) {
      return;
    }
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const result = await api.listBookings({
        query: submittedBookingQuery || undefined,
        status: bookingStatus || undefined,
        overdue: overdueOnly,
        page: bookingPage,
        pageSize: PAGE_SIZE,
      });
      setBookings(result.items);
      setBookingTotal(result.total);
    } catch (caught) {
      setBookings([]);
      setBookingTotal(0);
      setBookingsError(caught instanceof InventoryApiError ? caught.message : "Could not load bookings.");
    } finally {
      setBookingsLoading(false);
    }
  }, [api, bookingPage, bookingStatus, overdueOnly, submittedBookingQuery]);

  useEffect(() => {
    if (!identity) {
      return;
    }
    void loadSummary();
  }, [identity, loadSummary]);

  useEffect(() => {
    if (tab === "inventory") {
      void loadInventory();
    }
  }, [loadInventory, tab]);

  useEffect(() => {
    if (tab === "bookings") {
      void loadBookings();
    }
  }, [loadBookings, tab]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const bookingPageCount = Math.max(1, Math.ceil(bookingTotal / PAGE_SIZE));
  const isAdmin = me?.role === "ADMIN";

  const openBookings = (card: "reserved" | "checkedOut" | "overdue") => {
    const filter = dashboardBookingFilter(card);
    setBookingQuery("");
    setSubmittedBookingQuery("");
    setBookingStatus(filter.status ?? "");
    setOverdueOnly(Boolean(filter.overdue));
    setBookingPage(1);
    setSelected(null);
    setTab("bookings");
  };

  if (!identity || !api) {
    return <SignIn onContinue={setIdentity} />;
  }

  return (
    <main className="inventory">
      <p className="eyebrow">BorrowHub · admin</p>
      <h1>Office dashboard</h1>
      <p>
        Signed in as {me ? `${me.displayName} (${me.role})` : "…"}. Demo identity until Entra (`P0-01`).
        <button
          type="button"
          onClick={() => {
            setIdentity(null);
            setMe(null);
            setSummary(null);
            setTab("dashboard");
          }}
        >
          Sign out
        </button>
      </p>
      <nav className="tabs" aria-label="Admin sections">
        <button type="button" aria-current={tab === "dashboard" ? "page" : undefined} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button type="button" aria-current={tab === "inventory" ? "page" : undefined} onClick={() => setTab("inventory")}>
          Inventory
        </button>
        <button type="button" aria-current={tab === "bookings" ? "page" : undefined} onClick={() => setTab("bookings")}>
          Bookings
        </button>
      </nav>

      {tab === "dashboard" ? (
        summaryLoading ? (
          <p role="status">Loading dashboard…</p>
        ) : summaryError ? (
          <div role="alert">
            <p>{summaryError}</p>
            <button type="button" onClick={() => void loadSummary()}>
              Retry
            </button>
          </div>
        ) : summary ? (
          <section className="summary" aria-label="Booking summary">
            <button type="button" onClick={() => openBookings("reserved")}>
              <p>Reserved</p>
              <p>{summary.reserved}</p>
            </button>
            <button type="button" onClick={() => openBookings("checkedOut")}>
              <p>Checked out</p>
              <p>{summary.checkedOut}</p>
            </button>
            <button type="button" onClick={() => openBookings("overdue")} aria-label="View overdue loans">
              <p>Overdue</p>
              <p>{summary.overdue}</p>
            </button>
            <button type="button" onClick={() => setTab("inventory")}>
              <p>Active equipment</p>
              <p>{summary.activeEquipment}</p>
            </button>
          </section>
        ) : null
      ) : null}

      {tab === "inventory" ? (
        <>
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
              <input name="query" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
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
          {isAdmin ? (
          <form
            className="create"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              setCreateError(null);
              void api
                .create({
                  assetTag: String(data.get("assetTag") ?? "").trim(),
                  name: String(data.get("name") ?? "").trim(),
                  category: String(data.get("newCategory") ?? "adapter"),
                  description: String(data.get("description") ?? "").trim(),
                  location: String(data.get("location") ?? "").trim(),
                  operationalStatus: String(data.get("operationalStatus") ?? "ACTIVE") as OperationalStatus,
                })
                .then(() => {
                  form.reset();
                  return loadInventory();
                })
                .catch((caught: unknown) => {
                  setCreateError(caught instanceof InventoryApiError ? caught.message : "Could not create the asset.");
                });
            }}
          >
            <h2>Add asset</h2>
            <label>
              Tag
              <input name="assetTag" required autoComplete="off" />
            </label>
            <label>
              Name
              <input name="name" required autoComplete="off" />
            </label>
            <label>
              Category
              <select name="newCategory" defaultValue="adapter">
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input name="location" required autoComplete="off" />
            </label>
            <label>
              Status
              <select name="operationalStatus" defaultValue="ACTIVE">
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <label>
              Description
              <input name="description" autoComplete="off" />
            </label>
            <button type="submit">Create</button>
            {createError ? <p role="alert">{createError}</p> : null}
          </form>
          ) : (
            <p>Inventory edits require an ADMIN session. Java still returns 403 for employees.</p>
          )}
          {loading ? (
            <p role="status">Loading inventory…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => void loadInventory()}>
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p>No equipment matches those filters.</p>
          ) : (
            <>
              <table>
                <caption>{total} assets (including archived)</caption>
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
                      <td>
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            setEquipmentDetailError(null);
                            setUpdateError(null);
                            void api
                              .get(item.id)
                              .then(setSelectedEquipment)
                              .catch((caught: unknown) => {
                                setSelectedEquipment(null);
                                setEquipmentDetailError(
                                  caught instanceof InventoryApiError ? caught.message : "Could not load the asset.",
                                );
                              });
                          }}
                        >
                          {item.assetTag}
                        </button>
                      </td>
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
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>
                  Next
                </button>
              </div>
            </>
          )}
          {equipmentDetailError ? <p role="alert">{equipmentDetailError}</p> : null}
          {selectedEquipment && isAdmin ? (
            <section className="detail" aria-label="Edit asset">
              <h2>Edit {selectedEquipment.assetTag}</h2>
              <form
                key={`${selectedEquipment.id}-${selectedEquipment.operationalStatus}-${selectedEquipment.location}`}
                className="create"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  setUpdateError(null);
                  void api
                    .update(selectedEquipment.id, {
                      assetTag: String(data.get("assetTag") ?? "").trim(),
                      name: String(data.get("name") ?? "").trim(),
                      category: String(data.get("category") ?? selectedEquipment.category),
                      description: String(data.get("description") ?? "").trim(),
                      location: String(data.get("location") ?? "").trim(),
                      operationalStatus: String(data.get("operationalStatus") ?? "ACTIVE") as OperationalStatus,
                    })
                    .then((next) => {
                      setSelectedEquipment(next);
                      return loadInventory();
                    })
                    .catch((caught: unknown) => {
                      setUpdateError(
                        caught instanceof InventoryApiError ? caught.message : "Could not update the asset.",
                      );
                    });
                }}
              >
                <label>
                  Tag
                  <input name="assetTag" required defaultValue={selectedEquipment.assetTag} key={`${selectedEquipment.id}-tag`} autoComplete="off" />
                </label>
                <label>
                  Name
                  <input name="name" required defaultValue={selectedEquipment.name} key={`${selectedEquipment.id}-name`} autoComplete="off" />
                </label>
                <label>
                  Category
                  <select name="category" defaultValue={selectedEquipment.category} key={`${selectedEquipment.id}-cat`}>
                    {CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input name="location" required defaultValue={selectedEquipment.location} key={`${selectedEquipment.id}-loc`} autoComplete="off" />
                </label>
                <label>
                  Status
                  <select
                    name="operationalStatus"
                    defaultValue={selectedEquipment.operationalStatus}
                    key={`${selectedEquipment.id}-status`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <label>
                  Description
                  <input
                    name="description"
                    defaultValue={selectedEquipment.description ?? ""}
                    key={`${selectedEquipment.id}-desc`}
                    autoComplete="off"
                  />
                </label>
                <button type="submit">Save</button>
                {updateError ? <p role="alert">{updateError}</p> : null}
              </form>
            </section>
          ) : null}
        </>
      ) : null}

      {tab === "bookings" ? (
        <>
          <form
            className="filters"
            onSubmit={(event) => {
              event.preventDefault();
              setBookingPage(1);
              setSubmittedBookingQuery(bookingQuery.trim());
            }}
          >
            <label>
              Search
              <input
                name="bookingQuery"
                value={bookingQuery}
                onChange={(event) => setBookingQuery(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label>
              Status
              <select
                name="status"
                value={bookingStatus}
                onChange={(event) => {
                  setBookingPage(1);
                  setBookingStatus(event.target.value);
                }}
              >
                <option value="">All</option>
                <option value="RESERVED">RESERVED</option>
                <option value="CHECKED_OUT">CHECKED_OUT</option>
                <option value="RETURNED">RETURNED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) => {
                  setBookingPage(1);
                  setOverdueOnly(event.target.checked);
                }}
              />
              Overdue only
            </label>
            <button type="submit">Search</button>
            <button
              type="button"
              onClick={() => {
                setBookingQuery("");
                setSubmittedBookingQuery("");
                setBookingStatus("");
                setOverdueOnly(false);
                setBookingPage(1);
                setSelected(null);
              }}
            >
              Reset
            </button>
          </form>
          {bookingsLoading ? (
            <p role="status">Loading bookings…</p>
          ) : bookingsError ? (
            <div role="alert">
              <p>{bookingsError}</p>
              <button type="button" onClick={() => void loadBookings()}>
                Retry
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <p>No bookings match those filters.</p>
          ) : (
            <>
              <table>
                <caption>
                  {overdueOnly ? `${bookingTotal} overdue loans` : `${bookingTotal} bookings`}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Borrower</th>
                    <th scope="col">Window</th>
                    <th scope="col">Status</th>
                    <th scope="col">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((item) => (
                    <tr key={item.id} className={item.overdue ? "overdue" : undefined}>
                      <td>
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            setDetailError(null);
                            void api
                              .getBooking(item.id)
                              .then(setSelected)
                              .catch((caught: unknown) => {
                                setSelected(null);
                                setDetailError(
                                  caught instanceof InventoryApiError ? caught.message : "Could not load booking.",
                                );
                              });
                          }}
                        >
                          {item.assetTag}
                        </button>
                      </td>
                      <td>{item.borrower}</td>
                      <td>
                        {formatInstant(item.startAt)} – {formatInstant(item.endAt)}
                      </td>
                      <td>{item.status}</td>
                      <td>{item.overdue ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pager">
                <button
                  type="button"
                  disabled={bookingPage <= 1}
                  onClick={() => setBookingPage((current) => current - 1)}
                >
                  Previous
                </button>
                <p>
                  Page {bookingPage} of {bookingPageCount}
                </p>
                <button
                  type="button"
                  disabled={bookingPage >= bookingPageCount}
                  onClick={() => setBookingPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {detailError ? <p role="alert">{detailError}</p> : null}
          {selected ? (
            <section className="detail" aria-label="Booking detail">
              <h2>
                {selected.assetTag} · {selected.status}
              </h2>
              <p>
                Borrower {selected.borrower}. Window {formatInstant(selected.startAt)} – {formatInstant(selected.endAt)}.
              </p>
              {selected.overdue ? <p role="status">This loan is overdue (CHECKED_OUT past end).</p> : null}
              {isAdmin && selected.allowedActions.includes("CANCEL") ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setDetailError(null);
                    void api
                      .cancelBooking(selected.id, cancelReason)
                      .then((detail) => {
                        setSelected(detail);
                        setCancelReason("");
                        return loadBookings();
                      })
                      .catch((caught: unknown) => {
                        setDetailError(
                          caught instanceof InventoryApiError ? caught.message : "Could not cancel the booking.",
                        );
                      });
                  }}
                >
                  <label>
                    Cancellation reason
                    <textarea
                      required
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                    />
                  </label>
                  <button type="submit">Cancel reservation</button>
                </form>
              ) : null}
              <h3>Audit</h3>
              {selected.audit.length === 0 ? (
                <p>No audit events for this booking.</p>
              ) : (
                <ol>
                  {selected.audit.map((event) => {
                    const change = formatAuditChange(event.changeSummary);
                    return (
                    <li key={event.id}>
                      {formatInstant(event.occurredAt)} · {event.action} · {event.actor}
                      {change ? ` · ${change}` : ""}
                    </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
