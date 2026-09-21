export type FetchLike = typeof fetch;

export class OboError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OboError";
    this.status = status;
    this.code = code;
  }
}

export type OboOptions = {
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  fetchImpl?: FetchLike;
};

export function createOboExchanger(options: OboOptions = {}) {
  const tokenUrl = options.tokenUrl?.trim() ?? "";
  const clientId = options.clientId?.trim() ?? "";
  const clientSecret = options.clientSecret?.trim() ?? "";
  const scope = options.scope?.trim() ?? "";
  const configured = tokenUrl.length > 0 && clientId.length > 0 && clientSecret.length > 0 && scope.length > 0;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    configured,
    async exchange(userAccessToken: string, correlationId: string): Promise<string> {
      if (!configured) {
        throw new OboError(503, "IDENTITY_NOT_CONFIGURED", "On-behalf-of token exchange is not configured.");
      }
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        requested_token_use: "on_behalf_of",
        assertion: userAccessToken,
        scope,
      });
      let response: Response;
      try {
        response = await fetchImpl(tokenUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-correlation-id": correlationId,
          },
          body,
        });
      } catch {
        throw new OboError(503, "IDENTITY_UNAVAILABLE", "Entra token endpoint is unavailable.");
      }
      const payload = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
      if (!response.ok || !payload.access_token) {
        throw new OboError(401, "UNAUTHORIZED", "The delegated token could not be exchanged.");
      }
      return payload.access_token;
    },
  };
}

export type OboExchanger = ReturnType<typeof createOboExchanger>;
