import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  BackendHttpError,
  BackendTimeoutError,
  BackendUnavailableError,
  createBackendClient,
  type BackendClient,
  type FetchLike,
} from "./backendClient.js";
import { OboError, createOboExchanger, type OboExchanger } from "./obo.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AppOptions = {
  javaBaseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  allowedWebOrigins?: string[];
  backend?: BackendClient;
  obo?: OboExchanger;
  entraTenantId?: string;
  entraBffClientId?: string;
  entraBffClientSecret?: string;
  entraJavaScope?: string;
  entraTokenUrl?: string;
  logger?: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    traceId: string;
  }
}

function correlationId(request: FastifyRequest): string {
  const header = request.headers["x-correlation-id"];
  const value = Array.isArray(header) ? header[0] : header;
  return value && value.length > 0 ? value : randomUUID();
}

function applyCors(reply: FastifyReply, origin: string | undefined, allowed: string[]): void {
  if (origin && allowed.includes(origin)) {
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "origin");
  }
}

function demoHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const objectId = request.headers["x-demo-object-id"];
  const tenantId = request.headers["x-demo-tenant-id"];
  if (typeof objectId === "string" && objectId.length > 0) {
    headers["x-demo-object-id"] = objectId;
  }
  if (typeof tenantId === "string" && tenantId.length > 0) {
    headers["x-demo-tenant-id"] = tenantId;
  }
  const role = request.headers["x-demo-role"];
  if (typeof role === "string" && role.length > 0) {
    headers["x-demo-role"] = role;
  }
  return headers;
}

function requireIdempotencyKey(request: FastifyRequest, reply: FastifyReply, traceId: string): string | undefined {
  const idempotencyKey = request.headers["idempotency-key"];
  if (typeof idempotencyKey !== "string" || !UUID_PATTERN.test(idempotencyKey)) {
    reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: "Idempotency-Key must be a UUID.",
      traceId,
      fieldErrors: { idempotencyKey: "uuid" },
    });
    return undefined;
  }
  return idempotencyKey;
}

function sendBackendError(reply: FastifyReply, error: unknown, traceId: string) {
  if (error instanceof BackendHttpError) {
    const body = error.body;
    if (body && typeof body === "object") {
      return reply.status(error.status).send(body);
    }
    return reply.status(error.status).send({
      code: "UPSTREAM_ERROR",
      message: "The upstream request failed.",
      traceId,
      fieldErrors: {},
    });
  }
  if (error instanceof BackendTimeoutError) {
    return reply.status(504).send({
      code: "UPSTREAM_TIMEOUT",
      message: error.message,
      traceId,
      fieldErrors: {},
    });
  }
  if (error instanceof BackendUnavailableError) {
    return reply.status(503).send({
      code: "UPSTREAM_UNAVAILABLE",
      message: error.message,
      traceId,
      fieldErrors: {},
    });
  }
  if (error instanceof OboError) {
    return reply.status(error.status).send({
      code: error.code,
      message: error.message,
      traceId,
      fieldErrors: {},
    });
  }
  throw error;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const allowedWebOrigins = options.allowedWebOrigins
    ?? (process.env.ALLOWED_WEB_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  const backend =
    options.backend
    ?? createBackendClient({
      javaBaseUrl: options.javaBaseUrl ?? process.env.JAVA_BASE_URL ?? "http://localhost:8080",
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
    });
  const tenantId = options.entraTenantId ?? process.env.ENTRA_TENANT_ID;
  const obo =
    options.obo
    ?? createOboExchanger({
      tokenUrl:
        options.entraTokenUrl
        ?? process.env.ENTRA_TOKEN_URL
        ?? (tenantId ? `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token` : undefined),
      clientId: options.entraBffClientId ?? process.env.ENTRA_BFF_CLIENT_ID,
      clientSecret: options.entraBffClientSecret ?? process.env.ENTRA_BFF_CLIENT_SECRET,
      scope: options.entraJavaScope ?? process.env.ENTRA_JAVA_SCOPE,
      fetchImpl: options.fetchImpl,
    });

  async function identityHeaders(
    request: FastifyRequest,
    reply: FastifyReply,
    traceId: string,
  ): Promise<Record<string, string> | undefined> {
    const authorization = request.headers.authorization;
    if (typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ")) {
      const userToken = authorization.slice("bearer ".length).trim();
      if (userToken.length === 0) {
        reply.status(401).send({
          code: "UNAUTHORIZED",
          message: "Sign-in is required.",
          traceId,
          fieldErrors: {},
        });
        return undefined;
      }
      try {
        const accessToken = await obo.exchange(userToken, traceId);
        return { authorization: `Bearer ${accessToken}` };
      } catch (error) {
        sendBackendError(reply, error, traceId);
        return undefined;
      }
    }
    return demoHeaders(request);
  }

  const app = Fastify({ logger: options.logger ?? false });
  app.decorateRequest("traceId", "");

  app.addHook("onRequest", async (request, reply) => {
    request.traceId = correlationId(request);
    reply.header("x-correlation-id", request.traceId);
    applyCors(reply, request.headers.origin, allowedWebOrigins);
    request.log.info({ traceId: request.traceId, method: request.method, url: request.url }, "request");
  });

  app.options("/*", async (request, reply) => {
    applyCors(reply, request.headers.origin, allowedWebOrigins);
    reply.header("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
    reply.header(
      "access-control-allow-headers",
      "content-type,x-correlation-id,authorization,x-demo-object-id,x-demo-tenant-id,x-demo-role,idempotency-key",
    );
    return reply.status(204).send();
  });

  app.get("/health/live", async () => ({ status: "ok" as const }));

  app.get("/health/ready", async (_request, reply) => {
    const ok = await backend.ready();
    if (!ok) {
      return reply.status(503).send({ status: "unavailable" as const });
    }
    return { status: "ok" as const };
  });

  app.get("/api/v1/me", async (request, reply) => {
    const traceId = request.traceId;
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    try {
      return await backend.getMe(headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/equipment", async (request, reply) => {
    const traceId = request.traceId;
    const query = request.query as Record<string, string | undefined>;
    const search = new URLSearchParams();
    for (const key of ["query", "category", "page", "pageSize"] as const) {
      const value = query[key];
      if (value) {
        search.set(key, value);
      }
    }
    try {
      return await backend.listEquipment(search, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/equipment/:id", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    try {
      return await backend.getEquipment(id, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/equipment/:id/availability", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string | undefined>;
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    const search = new URLSearchParams();
    if (query.startAt) {
      search.set("startAt", query.startAt);
    }
    if (query.endAt) {
      search.set("endAt", query.endAt);
    }
    try {
      return await backend.getAvailability(id, search, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/bookings", async (request, reply) => {
    const traceId = request.traceId;
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    const idempotencyKey = requireIdempotencyKey(request, reply, traceId);
    if (!idempotencyKey) {
      return;
    }
    headers["idempotency-key"] = idempotencyKey;
    try {
      const body = await backend.createBooking(request.body, headers, traceId);
      return reply.status(201).send(body);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/bookings", async (request, reply) => {
    const traceId = request.traceId;
    const query = request.query as Record<string, string | undefined>;
    const search = new URLSearchParams();
    for (const key of ["page", "pageSize"] as const) {
      const value = query[key];
      if (value) {
        search.set(key, value);
      }
    }
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    try {
      return await backend.listMine(search, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/bookings/:id", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.getBooking(id, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/bookings/:id/cancel", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    const idempotencyKey = requireIdempotencyKey(request, reply, traceId);
    if (!idempotencyKey) {
      return;
    }
    headers["idempotency-key"] = idempotencyKey;
    try {
      return await backend.cancelBooking(id, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/bookings/:id/collect", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    const idempotencyKey = requireIdempotencyKey(request, reply, traceId);
    if (!idempotencyKey) {
      return;
    }
    headers["idempotency-key"] = idempotencyKey;
    try {
      return await backend.collectBooking(id, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/bookings/:id/return", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    const idempotencyKey = requireIdempotencyKey(request, reply, traceId);
    if (!idempotencyKey) {
      return;
    }
    headers["idempotency-key"] = idempotencyKey;
    try {
      return await backend.returnBooking(id, headers, traceId, request.body);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/admin/summary", async (request, reply) => {
    const traceId = request.traceId;
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    try {
      return await backend.adminSummary(headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/admin/equipment", async (request, reply) => {
    const traceId = request.traceId;
    const query = request.query as Record<string, string | undefined>;
    const search = new URLSearchParams();
    for (const key of ["query", "category", "checkedOut", "page", "pageSize"] as const) {
      const value = query[key];
      if (value) {
        search.set(key, value);
      }
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.listAdminEquipment(search, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/admin/equipment/:id", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.getAdminEquipment(id, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/admin/equipment", async (request, reply) => {
    const traceId = request.traceId;
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      const body = await backend.createAdminEquipment(request.body, headers, traceId);
      return reply.status(201).send(body);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.patch("/api/v1/admin/equipment/:id", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.updateAdminEquipment(id, request.body, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/admin/bookings", async (request, reply) => {
    const traceId = request.traceId;
    const query = request.query as Record<string, string | undefined>;
    const search = new URLSearchParams();
    for (const key of ["query", "status", "overdue", "damaged", "from", "to", "page", "pageSize"] as const) {
      const value = query[key];
      if (value) {
        search.set(key, value);
      }
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.listAdminBookings(search, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.get("/api/v1/admin/bookings/:id", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    try {
      const headers = await identityHeaders(request, reply, traceId);
      if (!headers) {
        return;
      }
      return await backend.getAdminBooking(id, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  app.post("/api/v1/admin/bookings/:id/cancel", async (request, reply) => {
    const traceId = request.traceId;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "id must be a UUID.",
        traceId,
        fieldErrors: { id: "uuid" },
      });
    }
    const headers = await identityHeaders(request, reply, traceId);
    if (!headers) {
      return;
    }
    const idempotencyKey = requireIdempotencyKey(request, reply, traceId);
    if (!idempotencyKey) {
      return;
    }
    headers["idempotency-key"] = idempotencyKey;
    try {
      return await backend.adminCancelBooking(id, request.body, headers, traceId);
    } catch (error) {
      return sendBackendError(reply, error, traceId);
    }
  });

  return app;
}
