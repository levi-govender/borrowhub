import { useCallback, useEffect, useMemo, useState } from "react";
import { SignIn } from "./SignIn";
import { AppShell, type Tab } from "./components/AppShell";
import { Icon } from "./components/Icon";
import { useToast } from "./components/Toast";
import { DashboardView } from "./views/DashboardView";
import { InventoryView, type AssetPayload } from "./views/InventoryView";
import { BookingsView } from "./views/BookingsView";
import { CalendarView } from "./views/CalendarView";
import { useTheme } from "./theme";
import { officeWeek, shiftOfficeWeek } from "./calendar";
import {
  InventoryApiError,
  createInventoryApi,
  resolveBffBaseUrl,
  dashboardBookingFilter,
  type AdminSummary,
  type BookingDetail,
  type BookingListItem,
  type DemoIdentity,
  type EquipmentDetail,
  type EquipmentListItem,
  type Me,
} from "./api";

const CATEGORIES = ["phone", "monitor", "adapter", "camera"] as const;
const PAGE_SIZE = 20;
const OVERDUE_PREVIEW_SIZE = 5;

const TITLES: Record<Tab, { title: string; blurb: string }> = {
  dashboard: { title: "Office dashboard", blurb: "Live view of reservations, loans and the asset fleet." },
  inventory: { title: "Inventory", blurb: "Every physical asset, archived items included." },
  bookings: { title: "Bookings", blurb: "Reservations, collections, returns and the overdue queue." },
  calendar: { title: "Calendar", blurb: "Office-week view of overlapping loans in Africa/Johannesburg." },
};

function describeFailure(caught: unknown, fallback: string): string {
  return caught instanceof InventoryApiError ? caught.message : fallback;
}

export function App() {
  const [identity, setIdentity] = useState<DemoIdentity | null>(null);
  const bffBaseUrl = useMemo(() => resolveBffBaseUrl(), []);
  const api = useMemo(
    () => (identity ? createInventoryApi(bffBaseUrl, fetch, identity) : null),
    [bffBaseUrl, identity],
  );
  const toast = useToast();
  const { theme, toggle } = useTheme();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [overduePreview, setOverduePreview] = useState<BookingListItem[]>([]);
  const [overduePreviewLoading, setOverduePreviewLoading] = useState(true);
  const [overduePreviewError, setOverduePreviewError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [checkedOutOnly, setCheckedOutOnly] = useState(false);
  const [loanOverdueOnly, setLoanOverdueOnly] = useState(false);
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
  const [damagedOnly, setDamagedOnly] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [week, setWeek] = useState(() => officeWeek());
  const [includeClosed, setIncludeClosed] = useState(false);
  const [calendarItems, setCalendarItems] = useState<BookingListItem[]>([]);
  const [calendarTotal, setCalendarTotal] = useState(0);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  /**
   * `/me` is loaded on its own so an employee session still knows who it is:
   * the admin summary answers 403 for them, and that must not erase identity.
   */
  const loadMe = useCallback(async () => {
    if (!api) {
      return;
    }
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    }
  }, [api]);

  const loadSummary = useCallback(async () => {
    if (!api) {
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await api.summary());
    } catch (caught) {
      setSummary(null);
      setSummaryError(describeFailure(caught, "Could not load the dashboard."));
    } finally {
      setSummaryLoading(false);
    }
  }, [api]);

  /** Overdue preview for the dashboard's attention list — never blocks the KPIs. */
  const loadOverduePreview = useCallback(async () => {
    if (!api) {
      return;
    }
    setOverduePreviewLoading(true);
    setOverduePreviewError(null);
    try {
      const result = await api.listBookings({
        ...dashboardBookingFilter("overdue"),
        page: 1,
        pageSize: OVERDUE_PREVIEW_SIZE,
      });
      setOverduePreview(result.items);
    } catch (caught) {
      setOverduePreview([]);
      setOverduePreviewError(describeFailure(caught, "Could not load overdue loans."));
    } finally {
      setOverduePreviewLoading(false);
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
        checkedOut: checkedOutOnly,
        loanOverdue: loanOverdueOnly,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (caught) {
      setItems([]);
      setTotal(0);
      setError(describeFailure(caught, "Could not load inventory."));
    } finally {
      setLoading(false);
    }
  }, [api, category, checkedOutOnly, loanOverdueOnly, page, submittedQuery]);

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
        damaged: damagedOnly,
        page: bookingPage,
        pageSize: PAGE_SIZE,
      });
      setBookings(result.items);
      setBookingTotal(result.total);
    } catch (caught) {
      setBookings([]);
      setBookingTotal(0);
      setBookingsError(describeFailure(caught, "Could not load bookings."));
    } finally {
      setBookingsLoading(false);
    }
  }, [api, bookingPage, bookingStatus, damagedOnly, overdueOnly, submittedBookingQuery]);

  const loadCalendar = useCallback(async () => {
    if (!api) {
      return;
    }
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const result = await api.listBookings({
        from: week.from,
        to: week.to,
        page: 1,
        pageSize: 100,
      });
      setCalendarItems(result.items);
      setCalendarTotal(result.total);
    } catch (caught) {
      setCalendarItems([]);
      setCalendarTotal(0);
      setCalendarError(describeFailure(caught, "Could not load the calendar."));
    } finally {
      setCalendarLoading(false);
    }
  }, [api, week.from, week.to]);

  useEffect(() => {
    if (!identity) {
      return;
    }
    void loadMe();
    void loadSummary();
    void loadOverduePreview();
  }, [identity, loadMe, loadOverduePreview, loadSummary]);

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

  useEffect(() => {
    if (tab === "calendar") {
      void loadCalendar();
    }
  }, [loadCalendar, tab]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const bookingPageCount = Math.max(1, Math.ceil(bookingTotal / PAGE_SIZE));
  const isAdmin = me?.role === "ADMIN";

  const openBookings = useCallback((card: "reserved" | "checkedOut" | "overdue") => {
    const filter = dashboardBookingFilter(card);
    setBookingQuery("");
    setSubmittedBookingQuery("");
    setBookingStatus(filter.status ?? "");
    setOverdueOnly(Boolean(filter.overdue));
    setBookingPage(1);
    setSelected(null);
    setTab("bookings");
  }, []);

  const openBookingDetail = useCallback(
    (id: string) => {
      if (!api) {
        return;
      }
      setDetailError(null);
      setCancelError(null);
      setCancelReason("");
      void api
        .getBooking(id)
        .then(setSelected)
        .catch((caught: unknown) => {
          setSelected(null);
          setDetailError(describeFailure(caught, "Could not load booking."));
        });
    },
    [api],
  );

  const openEquipmentDetail = useCallback(
    (id: string) => {
      if (!api) {
        return;
      }
      setEquipmentDetailError(null);
      setUpdateError(null);
      void api
        .get(id)
        .then(setSelectedEquipment)
        .catch((caught: unknown) => {
          setSelectedEquipment(null);
          setEquipmentDetailError(describeFailure(caught, "Could not load the asset."));
        });
    },
    [api],
  );

  const refresh = useCallback(() => {
    if (tab === "dashboard") {
      void loadMe();
      void loadSummary();
      void loadOverduePreview();
      return;
    }
    if (tab === "inventory") {
      void loadInventory();
      return;
    }
    if (tab === "calendar") {
      void loadCalendar();
      return;
    }
    void loadBookings();
  }, [loadBookings, loadCalendar, loadInventory, loadMe, loadOverduePreview, loadSummary, tab]);

  if (!identity || !api) {
    return <SignIn onContinue={setIdentity} theme={theme} onToggleTheme={toggle} />;
  }

  const { title, blurb } = TITLES[tab];

  return (
    <AppShell
      tab={tab}
      onTab={setTab}
      me={me}
      objectId={identity.objectId}
      overdueCount={summary?.overdue ?? null}
      theme={theme}
      onToggleTheme={toggle}
      onSignOut={() => {
        setIdentity(null);
        setMe(null);
        setSummary(null);
        setSelected(null);
        setSelectedEquipment(null);
        setTab("dashboard");
      }}
      title={title}
      subtitle={
        <>
          <p>{me ? `Signed in as ${me.displayName} (${me.role})` : "Connecting to the BFF…"}</p>
          <span className="badge badge--plain">
            <Icon name="user" size={13} />
            Demo identity · P0-01
          </span>
          <span className="muted">{blurb}</span>
        </>
      }
      actions={
        <button type="button" className="btn btn--sm" onClick={refresh}>
          <Icon name="reset" size={14} />
          Refresh
        </button>
      }
    >
      {tab === "dashboard" ? (
        <DashboardView
          summary={summary}
          me={me}
          loading={summaryLoading}
          error={summaryError}
          onRetry={() => {
            void loadSummary();
            void loadOverduePreview();
          }}
          onOpenBookings={openBookings}
          onOpenInventory={() => setTab("inventory")}
          overdue={{ items: overduePreview, loading: overduePreviewLoading, error: overduePreviewError }}
          onOpenBooking={(id) => {
            openBookings("overdue");
            openBookingDetail(id);
          }}
          bffBaseUrl={bffBaseUrl}
        />
      ) : null}

      {tab === "inventory" ? (
        <InventoryView
          isAdmin={isAdmin}
          categories={CATEGORIES}
          query={query}
          onQueryChange={setQuery}
          onSubmitQuery={() => {
            setPage(1);
            setSubmittedQuery(query.trim());
          }}
          category={category}
          onCategoryChange={(value) => {
            setPage(1);
            setCategory(value);
          }}
          checkedOutOnly={checkedOutOnly}
          onCheckedOutChange={(value) => {
            setPage(1);
            setCheckedOutOnly(value);
          }}
          loanOverdueOnly={loanOverdueOnly}
          onLoanOverdueChange={(value) => {
            setPage(1);
            setLoanOverdueOnly(value);
          }}
          onReset={() => {
            setQuery("");
            setSubmittedQuery("");
            setCategory("");
            setCheckedOutOnly(false);
            setLoanOverdueOnly(false);
            setPage(1);
          }}
          items={items}
          total={total}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          loading={loading}
          error={error}
          onRetry={() => void loadInventory()}
          createError={createError}
          onCreate={(payload, form) => {
            setCreateError(null);
            void api
              .create(payload)
              .then(() => {
                form.reset();
                toast.success(`${payload.assetTag} added to the catalogue.`);
                return Promise.all([loadInventory(), loadSummary()]);
              })
              .catch((caught: unknown) => {
                setCreateError(describeFailure(caught, "Could not create the asset."));
              });
          }}
          selected={selectedEquipment}
          detailError={equipmentDetailError}
          updateError={updateError}
          onOpen={openEquipmentDetail}
          onOpenLoan={(bookingId) => {
            setTab("bookings");
            openBookingDetail(bookingId);
          }}
          onCloseDetail={() => {
            setSelectedEquipment(null);
            setUpdateError(null);
          }}
          onUpdate={(id, payload: AssetPayload) => {
            setUpdateError(null);
            void api
              .update(id, payload)
              .then((next) => {
                setSelectedEquipment(next);
                toast.success(`${next.assetTag} updated.`);
                return Promise.all([loadInventory(), loadSummary()]);
              })
              .catch((caught: unknown) => {
                setUpdateError(describeFailure(caught, "Could not update the asset."));
              });
          }}
        />
      ) : null}

      {tab === "bookings" ? (
        <BookingsView
          isAdmin={isAdmin}
          query={bookingQuery}
          onQueryChange={setBookingQuery}
          onSubmitQuery={() => {
            setBookingPage(1);
            setSubmittedBookingQuery(bookingQuery.trim());
          }}
          status={bookingStatus}
          onStatusChange={(value) => {
            setBookingPage(1);
            setBookingStatus(value);
          }}
          overdueOnly={overdueOnly}
          onOverdueChange={(value) => {
            setBookingPage(1);
            setOverdueOnly(value);
          }}
          damagedOnly={damagedOnly}
          onDamagedChange={(value) => {
            setBookingPage(1);
            setDamagedOnly(value);
          }}
          onReset={() => {
            setBookingQuery("");
            setSubmittedBookingQuery("");
            setBookingStatus("");
            setOverdueOnly(false);
            setDamagedOnly(false);
            setBookingPage(1);
            setSelected(null);
          }}
          items={bookings}
          total={bookingTotal}
          page={bookingPage}
          pageCount={bookingPageCount}
          onPageChange={setBookingPage}
          loading={bookingsLoading}
          error={bookingsError}
          onRetry={() => void loadBookings()}
          selected={selected}
          detailError={detailError}
          cancelError={cancelError}
          cancelReason={cancelReason}
          onCancelReasonChange={setCancelReason}
          onCancel={() => {
            if (!selected) {
              return;
            }
            setCancelError(null);
            void api
              .cancelBooking(selected.id, cancelReason)
              .then((detail) => {
                setSelected(detail);
                setCancelReason("");
                toast.success(`${detail.assetTag} reservation cancelled.`);
                return Promise.all([loadBookings(), loadCalendar(), loadSummary(), loadOverduePreview()]);
              })
              .catch((caught: unknown) => {
                setCancelError(describeFailure(caught, "Could not cancel the booking."));
              });
          }}
          onOpen={openBookingDetail}
          onCloseDetail={() => {
            setSelected(null);
            setCancelError(null);
          }}
        />
      ) : null}

      {tab === "calendar" ? (
        <CalendarView
          isAdmin={isAdmin}
          week={week}
          onPrevWeek={() => setWeek((current) => shiftOfficeWeek(current.from, -1))}
          onThisWeek={() => setWeek(officeWeek())}
          onNextWeek={() => setWeek((current) => shiftOfficeWeek(current.from, 1))}
          includeClosed={includeClosed}
          onIncludeClosedChange={setIncludeClosed}
          items={calendarItems}
          total={calendarTotal}
          loading={calendarLoading}
          error={calendarError}
          onRetry={() => void loadCalendar()}
          selected={selected}
          detailError={detailError}
          cancelError={cancelError}
          cancelReason={cancelReason}
          onCancelReasonChange={setCancelReason}
          onCancel={() => {
            if (!selected) {
              return;
            }
            setCancelError(null);
            void api
              .cancelBooking(selected.id, cancelReason)
              .then((detail) => {
                setSelected(detail);
                setCancelReason("");
                toast.success(`${detail.assetTag} reservation cancelled.`);
                return Promise.all([loadBookings(), loadCalendar(), loadSummary(), loadOverduePreview()]);
              })
              .catch((caught: unknown) => {
                setCancelError(describeFailure(caught, "Could not cancel the booking."));
              });
          }}
          onOpen={openBookingDetail}
          onCloseDetail={() => {
            setSelected(null);
            setCancelError(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}
