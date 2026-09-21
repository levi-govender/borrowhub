# Azure Bicep

Resource-group templates for network, registry, identity, Key Vault, Log Analytics, private PostgreSQL 16 (`DEC-06`), Container Apps (Java internal, BFF external, manual Flyway job), and a **Free** Azure Static Web App for the admin UI.

This folder is compile-ready configuration. It is **not** a deployed environment. Do not treat template outputs as live hostnames until an operator deploys them. Images tagged `:unpushed` are placeholders until ACR has real tags.

## Layout

```
infra/main.bicep
infra/parameters.example.bicepparam
infra/modules/network.bicep
infra/modules/identity.bicep
infra/modules/registry.bicep
infra/modules/secrets.bicep
infra/modules/monitoring.bicep
infra/modules/database.bicep
infra/modules/container-environment.bicep
infra/modules/apps.bicep
infra/modules/migration-job.bicep
infra/modules/web.bicep
infra/modules/budget.bicep
```

## What it defines

| Piece | Intent |
| --- | --- |
| VNet `10.20.0.0/16` | `snet-apps`, `snet-data`, `snet-private-endpoints` |
| User-assigned identity | AcrPull + Key Vault Secrets User |
| ACR / Key Vault / Log Analytics | Registry, secrets, Container Apps logs (30-day, 1 GB/day cap) |
| Application Insights | Workspace-based; connection string on Java and BFF |
| Monthly cost budget | Optional; created when `budgetContactEmail` is set (default 40, 80%/100% actual alerts) |
| PostgreSQL 16 Flexible Server | Private; public access disabled |
| Container Apps | Java internal, BFF external, manual Flyway job |
| Static Web App (Free) | Admin Vite host. Default location `westeurope` because Free SKU is not in every region. BFF CORS includes `http://localhost:5173` plus the SWA origin |

Admin `VITE_BFF_BASE_URL` is a **build-time** Vite variable (see `apps/web/.env.example`). It is not injected by this template. GitHub `Release` uploads `apps/web/dist` when `STATIC_WEB_APP_TOKEN` and `VITE_BFF_BASE_URL` are set.

Employee mobile stays Expo (`DEC-01`). Cloud BFF URL is `EXPO_PUBLIC_BFF_BASE_URL` / EAS preview env (`apps/mobile/.env.example`, `apps/mobile/eas.json`). No app-store listing.

## Trace lookup

Clients, BFF, Java, and `audit_event.correlation_id` share `X-Correlation-Id` (JSON field `traceId`). After a deploy, in the Log Analytics workspace:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s has "<paste-trace-id>"
| project TimeGenerated, ContainerAppName_s, Log_s
```

Java console logs include `traceId=%X{traceId}`. The BFF logs `{ traceId, method, url }`. Errors already return `traceId` in the body.

## Compile (no Azure account required)

```bash
make bicep-build
```

## Deploy (operator, after P0-01)

Push SHA-tagged images via GitHub Actions **Release** (see `.github/workflows/release.yml`) or the CLI below. The Flyway job must succeed before Java `ddl-auto=validate` will pass.

Repository secrets (no values in git):

| Secret | Purpose |
| --- | --- |
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | Federated OIDC for `azure/login` |
| `ACR_LOGIN_SERVER` | e.g. leftover from a real ACR deploy output |
| `AZURE_RESOURCE_GROUP` | Resource group of the Container Apps |
| `CONTAINER_APP_JAVA` / `CONTAINER_APP_BFF` / `CONTAINER_APP_JOB` | App and job names |
| `STATIC_WEB_APP_TOKEN` | Optional SWA deployment token |
| `VITE_BFF_BASE_URL` | Optional; HTTPS BFF origin baked into the admin UI |

```bash
az group create --name <rg> --location southafricanorth
az deployment group create \
  --resource-group <rg> \
  --template-file infra/main.bicep \
  --parameters postgresAdminPassword='<not committed>' \
  --parameters budgetContactEmail='<ops-email>'
az containerapp job start --name <flyway-job> --resource-group <rg>
```
