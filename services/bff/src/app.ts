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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AppOptions = {
  javaBaseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  allowedWebOrigins?: string[];
  backend?: BackendClient;
  logger?: boolean;
};

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

function sendBackendError(reply: FastifyReply, error: unknown, traceId: string) {
  if (error instanceof BackendHttpError) {
    const body = error.body;
    if (body && typeof body === "object") {
      return reply.status(error.status).send(body);
    }
    return reply.status(error.status).send({
      code: "UPSTREAM_ERROR",
      message: "The catalogue request failed.",
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

  const app = Fastify({ logger: options.logger ?? false });

  app.addHook("onRequest", async (request, reply) => {
    applyCors(reply, request.headers.origin, allowedWebOrigins);
  });

  app.options("/*", async (request, reply) => {
    applyCors(reply, request.headers.origin, allowedWebOrigins);
    reply.header("access-control-allow-methods", "GET,OPTIONS");
    reply.header("access-control-allow-headers", "content-type,x-correlation-id,authorization");
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

  app.get("/api/v1/equipment", async (request, reply) => {
    const traceId = correlationId(request);
    reply.header("x-correlation-id", traceId);
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
    const traceId = correlationId(request);
    reply.header("x-correlation-id", traceId);
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
    const traceId = correlationId(request);
    reply.header("x-correlation-id", traceId);
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

  return app;
}
