export type FetchLike = typeof fetch;

export type BackendClientOptions = {
  javaBaseUrl: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

export class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export class BackendTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendTimeoutError";
  }
}

export class BackendHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Backend responded with ${status}`);
    this.name = "BackendHttpError";
    this.status = status;
    this.body = body;
  }
}

export function createBackendClient(options: BackendClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const base = options.javaBaseUrl.replace(/\/$/, "");

  async function request(
    path: string,
    search: URLSearchParams,
    correlationId: string,
    init: { method?: string; body?: unknown; extraHeaders?: Record<string, string> } = {},
  ): Promise<unknown> {
    const url = `${base}${path}${search.size > 0 ? `?${search.toString()}` : ""}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        "x-correlation-id": correlationId,
        ...init.extraHeaders,
      };
      if (init.body !== undefined) {
        headers["content-type"] = "application/json";
      }
      const response = await fetchImpl(url, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      const text = await response.text();
      const body = text.length === 0 ? null : (JSON.parse(text) as unknown);
      if (!response.ok) {
        throw new BackendHttpError(response.status, body);
      }
      return body;
    } catch (error) {
      if (error instanceof BackendHttpError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new BackendTimeoutError("Java backend timed out.");
      }
      throw new BackendUnavailableError("Java backend is unavailable.");
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    listEquipment(search: URLSearchParams, correlationId: string) {
      return request("/v1/equipment", search, correlationId);
    },
    getEquipment(id: string, correlationId: string) {
      return request(`/v1/equipment/${id}`, new URLSearchParams(), correlationId);
    },
    getAvailability(id: string, search: URLSearchParams, correlationId: string) {
      return request(`/v1/equipment/${id}/availability`, search, correlationId);
    },
    createBooking(body: unknown, extraHeaders: Record<string, string>, correlationId: string) {
      return request("/v1/bookings", new URLSearchParams(), correlationId, {
        method: "POST",
        body,
        extraHeaders,
      });
    },
    listMine(search: URLSearchParams, extraHeaders: Record<string, string>, correlationId: string) {
      return request("/v1/bookings", search, correlationId, { extraHeaders });
    },
    getBooking(id: string, extraHeaders: Record<string, string>, correlationId: string) {
      return request(`/v1/bookings/${id}`, new URLSearchParams(), correlationId, { extraHeaders });
    },
    cancelBooking(id: string, extraHeaders: Record<string, string>, correlationId: string) {
      return request(`/v1/bookings/${id}/cancel`, new URLSearchParams(), correlationId, {
        method: "POST",
        extraHeaders,
      });
    },
    collectBooking(id: string, extraHeaders: Record<string, string>, correlationId: string) {
      return request(`/v1/bookings/${id}/collect`, new URLSearchParams(), correlationId, {
        method: "POST",
        extraHeaders,
      });
    },
    returnBooking(id: string, extraHeaders: Record<string, string>, correlationId: string) {
      return request(`/v1/bookings/${id}/return`, new URLSearchParams(), correlationId, {
        method: "POST",
        extraHeaders,
      });
    },
    async ready(): Promise<boolean> {
      try {
        const response = await fetchImpl(`${base}/actuator/health/readiness`, {
          method: "GET",
          signal: AbortSignal.timeout(2_000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

export type BackendClient = ReturnType<typeof createBackendClient>;
