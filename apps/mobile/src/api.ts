export type OperationalStatus = "ACTIVE" | "MAINTENANCE" | "ARCHIVED";

export type EquipmentListItem = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  location: string;
  operationalStatus: OperationalStatus;
};

export type EquipmentDetail = EquipmentListItem & {
  description: string | null;
  policy: {
    officeTimezone: string;
    minDurationMinutes: number;
    maxDurationDays: number;
    maxAdvanceDays: number;
    collectionLeadMinutes: number;
  };
};

export type EquipmentPage = {
  items: EquipmentListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type Me = {
  id: string;
  tenantId: string;
  objectId: string;
  displayName: string;
  email: string;
  role: "EMPLOYEE" | "ADMIN";
};

export type Availability = {
  equipmentId: string;
  available: boolean;
  reason: string | null;
  startAt: string;
  endAt: string;
};

export type BookingStatus = "RESERVED" | "CHECKED_OUT" | "RETURNED" | "CANCELLED";

export type Booking = {
  id: string;
  equipmentId: string;
  assetTag: string;
  equipmentName?: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  allowedActions: string[];
  damageNote?: string | null;
  cancellationReason?: string | null;
  reminders?: string[];
};

export type BookingPage = {
  items: Booking[];
  page: number;
  pageSize: number;
  total: number;
};

export class CatalogueApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string | null;

  constructor(status: number, code: string, message: string, traceId: string | null = null) {
    super(formatFailureMessage(code, message, traceId));
    this.name = "CatalogueApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export function formatFailureMessage(code: string, message: string, traceId?: string | null): string {
  const suffix = traceId ? ` [${code}; trace ${traceId}]` : ` [${code}]`;
  return `${message}${suffix}`;
}

export type FetchLike = typeof fetch;

export type DemoIdentity = {
  objectId: string;
};

export function createCatalogueApi(baseUrl: string, fetchImpl: FetchLike = fetch, identity?: DemoIdentity) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown; extraHeaders?: Record<string, string> } = {},
  ): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        ...init.extraHeaders,
      };
      if (identity?.objectId) {
        headers["x-demo-object-id"] = identity.objectId;
      }
      if (init.body !== undefined) {
        headers["content-type"] = "application/json";
      }
      response = await fetchImpl(`${base}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      throw new CatalogueApiError(0, "NETWORK_ERROR", "Could not reach BorrowHub. Check the BFF URL and retry.");
    }
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      traceId?: string;
    };
    if (!response.ok) {
      throw new CatalogueApiError(
        response.status,
        body.code ?? "UPSTREAM_ERROR",
        body.message ?? "The catalogue request failed.",
        body.traceId ?? response.headers.get("x-correlation-id"),
      );
    }
    return body as T;
  }

  return {
    list(params: { query?: string; category?: string; page?: number; pageSize?: number } = {}) {
      const search = new URLSearchParams();
      if (params.query) search.set("query", params.query);
      if (params.category) search.set("category", params.category);
      if (params.page) search.set("page", String(params.page));
      if (params.pageSize) search.set("pageSize", String(params.pageSize));
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<EquipmentPage>(`/api/v1/equipment${suffix}`);
    },
    get(id: string) {
      return request<EquipmentDetail>(`/api/v1/equipment/${id}`);
    },
    availability(id: string, startAt: string, endAt: string) {
      const search = new URLSearchParams({ startAt, endAt });
      return request<Availability>(`/api/v1/equipment/${id}/availability?${search.toString()}`);
    },
    me() {
      return request<Me>("/api/v1/me");
    },
    createBooking(
      body: { equipmentId: string; startAt: string; endAt: string },
      idempotencyKey: string = crypto.randomUUID(),
    ) {
      return request<Booking>("/api/v1/bookings", {
        method: "POST",
        body,
        extraHeaders: { "idempotency-key": idempotencyKey },
      });
    },
    getBooking(id: string) {
      return request<Booking>(`/api/v1/bookings/${id}`);
    },
    listMine(params: { status?: string; page?: number; pageSize?: number } = {}) {
      const search = new URLSearchParams();
      if (params.status) search.set("status", params.status);
      if (params.page) search.set("page", String(params.page));
      if (params.pageSize) search.set("pageSize", String(params.pageSize));
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<BookingPage>(`/api/v1/bookings${suffix}`);
    },
    cancelBooking(id: string, idempotencyKey: string = crypto.randomUUID(), reason: string = "") {
      return request<Booking>(`/api/v1/bookings/${id}/cancel`, {
        method: "POST",
        body: { reason },
        extraHeaders: { "idempotency-key": idempotencyKey },
      });
    },
    collectBooking(id: string, idempotencyKey: string = crypto.randomUUID()) {
      return request<Booking>(`/api/v1/bookings/${id}/collect`, {
        method: "POST",
        extraHeaders: { "idempotency-key": idempotencyKey },
      });
    },
    returnBooking(
      id: string,
      idempotencyKey: string = crypto.randomUUID(),
      damageNote: string = "",
    ) {
      return request<Booking>(`/api/v1/bookings/${id}/return`, {
        method: "POST",
        body: { damageNote },
        extraHeaders: { "idempotency-key": idempotencyKey },
      });
    },
  };
}

export type CatalogueApi = ReturnType<typeof createCatalogueApi>;

const OFFICE_OFFSET = "+02:00";

/** `2026-09-24T09:00` in Africa/Johannesburg → ISO instant. */
export function parseOfficeLocal(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const instant = new Date(`${value}:00${OFFICE_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

export function toOfficeLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function validateReservationWindow(
  startAt: string,
  endAt: string,
  policy: { minDurationMinutes: number; maxDurationDays: number; maxAdvanceDays: number },
  now = Date.now(),
): string | null {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "End must be after start.";
  }
  const durationMs = end - start;
  if (durationMs < policy.minDurationMinutes * 60_000) {
    return `Reservations must last at least ${policy.minDurationMinutes} minutes.`;
  }
  if (durationMs > policy.maxDurationDays * 24 * 60 * 60 * 1000) {
    return `Reservations must last at most ${policy.maxDurationDays} days.`;
  }
  if (start <= now) {
    return "Start must be in the future.";
  }
  if (start > now + policy.maxAdvanceDays * 24 * 60 * 60 * 1000) {
    return `Start must be within ${policy.maxAdvanceDays} days.`;
  }
  return null;
}

export function defaultAvailabilityWindow(now = new Date()): { startAt: string; endAt: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 7, 0, 0));
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function isBookable(status: OperationalStatus): boolean {
  return status === "ACTIVE";
}

const OFFICE_TIME_ZONE = "Africa/Johannesburg";

function officeDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: OFFICE_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}

function officeDayKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatOfficeWindow(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const time = new Intl.DateTimeFormat("en-ZA", {
    timeZone: OFFICE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const startLabel = `${officeDateLabel(start)}, ${time.format(start)}`;
  const endLabel =
    officeDayKey(start) === officeDayKey(end) ? time.format(end) : `${officeDateLabel(end)}, ${time.format(end)}`;
  return `${startLabel}–${endLabel} (Africa/Johannesburg)`;
}

export function formatBookingStatus(status: string): string {
  if (status === "RESERVED") {
    return "Reserved";
  }
  if (status === "CHECKED_OUT") {
    return "Checked out";
  }
  if (status === "RETURNED") {
    return "Returned";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  return status;
}

export function formatBookingReminder(kind: string): string {
  if (kind === "COLLECT_NOW") {
    return "Collection is open.";
  }
  if (kind === "RETURN_NOW") {
    return "Please return this asset.";
  }
  if (kind === "OVERDUE") {
    return "This loan is overdue.";
  }
  return kind;
}

export function formatOperationalStatus(status: string): string {
  if (status === "ACTIVE") {
    return "Available to book";
  }
  if (status === "MAINTENANCE") {
    return "In maintenance";
  }
  if (status === "ARCHIVED") {
    return "Archived";
  }
  return status;
}

export function formatAvailabilityReason(reason: string | null): string {
  if (reason === "BOOKING_CONFLICT") {
    return "That window overlaps another reservation.";
  }
  if (reason === "EQUIPMENT_NOT_ACTIVE") {
    return "This asset is not available to book.";
  }
  return "That window is not available.";
}

export function resolveBffBaseUrl(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  platform: "ios" | "android" | "web" | string = "ios",
): string {
  const fromEnv = env.EXPO_PUBLIC_BFF_BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (platform === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://localhost:3000";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EquipmentQr = { kind: "id"; equipmentId: string } | { kind: "query"; query: string };

export function parseEquipmentQr(raw: string): EquipmentQr | null {
  const text = raw.trim();
  if (text.length === 0) {
    return null;
  }
  const prefixed = /^borrowhub:equipment:(.+)$/i.exec(text);
  const candidate = (prefixed ? prefixed[1] : text).trim();
  if (UUID_PATTERN.test(candidate)) {
    return { kind: "id", equipmentId: candidate };
  }
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("equipmentId");
    if (fromQuery && UUID_PATTERN.test(fromQuery)) {
      return { kind: "id", equipmentId: fromQuery };
    }
    const last = url.pathname.split("/").filter(Boolean).pop();
    if (last && UUID_PATTERN.test(last)) {
      return { kind: "id", equipmentId: last };
    }
  } catch {
    /* wedge scanners often send a tag, not a URL */
  }
  return { kind: "query", query: text };
}
