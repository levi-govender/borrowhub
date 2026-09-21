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

export type Availability = {
  equipmentId: string;
  available: boolean;
  reason: string | null;
  startAt: string;
  endAt: string;
};

export class CatalogueApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CatalogueApiError";
    this.status = status;
    this.code = code;
  }
}

export type FetchLike = typeof fetch;

export function createCatalogueApi(baseUrl: string, fetchImpl: FetchLike = fetch) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        headers: { accept: "application/json" },
      });
    } catch {
      throw new CatalogueApiError(0, "NETWORK_ERROR", "Could not reach BorrowHub. Check the BFF URL and retry.");
    }
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new CatalogueApiError(
        response.status,
        body.code ?? "UPSTREAM_ERROR",
        body.message ?? "The catalogue request failed.",
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
  };
}

export type CatalogueApi = ReturnType<typeof createCatalogueApi>;

export function defaultAvailabilityWindow(now = new Date()): { startAt: string; endAt: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 7, 0, 0));
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
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
