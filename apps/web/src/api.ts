export type OperationalStatus = "ACTIVE" | "MAINTENANCE" | "ARCHIVED";

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

export function createInventoryApi(baseUrl: string, fetchImpl: FetchLike = fetch) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        headers: { accept: "application/json" },
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
    list(params: { query?: string; category?: string; page?: number; pageSize?: number } = {}) {
      const search = new URLSearchParams();
      if (params.query) search.set("query", params.query);
      if (params.category) search.set("category", params.category);
      if (params.page) search.set("page", String(params.page));
      if (params.pageSize) search.set("pageSize", String(params.pageSize));
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<EquipmentPage>(`/api/v1/equipment${suffix}`);
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
