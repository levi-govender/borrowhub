# Runbooks

Teammate-facing steps. Do not treat Azure hostnames in this file as live; none are recorded until `P0-01` produces a real deploy.

## Local demo (Compose)

Needs Docker, Node >= 22, pnpm 10.28, Java 21 (only if you run Gradle on the host).

```bash
make install
make docker-up
make health
make test-e2e
```

`make health` should print BFF `{"status":"ok"}` and Java `{"status":"UP"}`. Playwright covers the admin dashboard (`admin-1` / `ADMIN`) and inventory search `PHONE-001`.

Host processes instead of containers:

```bash
make db-up
make backend    # Spring `dev` profile, Flyway, seeded catalogue
make bff        # http://localhost:3000
make web        # http://localhost:5173
make mobile     # Expo; BFF URL in apps/mobile/.env.example
```

Local identity: `X-Demo-Object-Id` (required) and `X-Demo-Role: ADMIN` for admin UI/API. Employees omit the admin role. Clients call the BFF only.

Office timezone is `Africa/Johannesburg`. Booking intervals are half-open. Overlap is rejected with `409`.

Stop apps, keep the database volume: `make docker-down` (or `make db-down` for Postgres-only). Wipe the volume: `make db-reset`.

## Rollback

Images are tagged with a **git SHA**. `:latest` is not the release contract.

1. Find the last good SHA (GitHub Actions **Release** run, or `git log`).
2. Re-run workflow **Release** with input `image_sha` set to that commit. That rebuilds/pushes `backend`, `bff`, and `migrate` tags and points Container Apps at them, then starts the Flyway job.
3. CLI equivalent after `az login` (names come from a real resource group, not this repo):

```bash
az containerapp update --name <java-app> --resource-group <rg> \
  --image <acr>.azurecr.io/backend:<previous-sha>
az containerapp update --name <bff-app> --resource-group <rg> \
  --image <acr>.azurecr.io/bff:<previous-sha>
```

Flyway migrations are **forward-only**. Rolling the Java image back does not un-apply SQL. If a release added a migration, restore from a database backup or a documented forward fix; do not invent a down-script at the incident.

Static Web Apps: rebuild `apps/web` with the previous commit and the same `VITE_BFF_BASE_URL`, then upload `dist` (Release workflow or SWA CLI). Expo binaries are not rolled back by this workflow; point `EXPO_PUBLIC_BFF_BASE_URL` at the BFF FQDN you intend.

## Cloud demo (blocked until P0-01)

Required before a real booking in Azure: Entra tenant, subscription, cost approval, region (South Africa North is a **candidate**), GitHub OIDC secrets listed in `infra/README.md`.

Then:

1. `az deployment group create` with `infra/main.bicep` (password not in git).
2. Push SHA images via **Release**.
3. Confirm the Flyway job succeeded before expecting Java readiness.
4. Admin UI: Static Web App; employee app: Expo with HTTPS BFF URL.
5. Failed request: the admin and employee UIs append `[CODE; trace …]` from the BFF body (or `X-Correlation-Id`). Paste that `traceId` into the Kusto query in `infra/README.md`. Booking audit lines on the admin booking detail include `changeSummary` from Java.

`CLOUD_WEB_URL` turns on `apps/web/e2e/cloud.spec.ts`. Until that URL exists, those tests skip.

## What not to do

- Do not point browsers at Java (`:8080`) in production shape; the BFF is the public API.
- Do not enable demo identity in cloud (`BORROWHUB_DEMO_IDENTITY_ENABLED` stays false on the image default).
- Do not commit `.env`, `*.bicepparam.local`, or `postgresAdminPassword`.
