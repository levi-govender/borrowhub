export type OperationalStatus = "ACTIVE" | "MAINTENANCE" | "ARCHIVED";

export type BookingStatus = "RESERVED" | "CHECKED_OUT" | "RETURNED" | "CANCELLED";

export type EquipmentListItem = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  location: string;
  operationalStatus: OperationalStatus;
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

export type AdminSummary = {
  reserved: number;
  checkedOut: number;
  overdue: number;
  activeEquipment: number;
};

export type BookingListItem = {
  id: string;
  assetTag: string;
  equipmentName: string;
  borrower: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  overdue: boolean;
};

export type BookingPage = {
  items: BookingListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AuditItem = {
  id: string;
  occurredAt: string;
  action: string;
  actor: string;
  changeSummary: Record<string, unknown>;
};

export type BookingDetail = BookingListItem & {
  equipmentId: string;
  userId: string;
  allowedActions: string[];
  audit: AuditItem[];
};

export class InventoryApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
    this.code = code;
  }
}

export type FetchLike = typeof fetch;

export const DEMO_ADMIN_HEADERS = {
  "x-demo-object-id": "admin-1",
  "x-demo-role": "ADMIN",
} as const;

export function createInventoryApi(baseUrl: string, fetchImpl: FetchLike = fetch) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown; extraHeaders?: Record<string, string> } = {},
  ): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        ...DEMO_ADMIN_HEADERS,
        ...init.extraHeaders,
      };
      if (init.body !== undefined) {
        headers["content-type"] = "application/json";
      }
      response = await fetchImpl(`${base}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      throw new InventoryApiError(0, "NETWORK_ERROR", "Could not reach BorrowHub. Check the BFF URL and retry.");
    }
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new InventoryApiError(
        response.status,
        body.code ?? "UPSTREAM_ERROR",
        body.message ?? "The inventory request failed.",
      );
    }
    return body as T;
  }

  return {
    summary() {
      return request<AdminSummary>("/api/v1/admin/summary");
    },
    me() {
      return request<Me>("/api/v1/me");
    },
    list(params: { query?: string; category?: string; page?: number; pageSize?: number } = {}) {
      const search = new URLSearchParams();
      if (params.query) search.set("query", params.query);
      if (params.category) search.set("category", params.category);
      if (params.page) search.set("page", String(params.page));
      if (params.pageSize) search.set("pageSize", String(params.pageSize));
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<EquipmentPage>(`/api/v1/admin/equipment${suffix}`);
    },
    create(body: {
      assetTag: string;
      name: string;
      category: string;
      description: string;
      location: string;
      operationalStatus: OperationalStatus;
    }) {
      return request<EquipmentListItem>("/api/v1/admin/equipment", { method: "POST", body });
    },
    listBookings(
      params: { query?: string; status?: string; overdue?: boolean; page?: number; pageSize?: number } = {},
    ) {
      const search = new URLSearchParams();
      if (params.query) search.set("query", params.query);
      if (params.status) search.set("status", params.status);
      if (params.overdue) search.set("overdue", "true");
      if (params.page) search.set("page", String(params.page));
      if (params.pageSize) search.set("pageSize", String(params.pageSize));
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<BookingPage>(`/api/v1/admin/bookings${suffix}`);
    },
    getBooking(id: string) {
      return request<BookingDetail>(`/api/v1/admin/bookings/${id}`);
    },
    cancelBooking(id: string, reason: string) {
      return request<BookingDetail>(`/api/v1/admin/bookings/${id}/cancel`, {
        method: "POST",
        body: { reason },
        extraHeaders: { "idempotency-key": crypto.randomUUID() },
      });
    },
  };
}

export type InventoryApi = ReturnType<typeof createInventoryApi>;

export function resolveBffBaseUrl(
  env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>,
): string {
  const fromEnv = env.VITE_BFF_BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
