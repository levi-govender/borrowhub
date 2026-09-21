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
```

## What it defines

| Piece | Intent |
| --- | --- |
| VNet `10.20.0.0/16` | `snet-apps`, `snet-data`, `snet-private-endpoints` |
| User-assigned identity | AcrPull + Key Vault Secrets User |
| ACR / Key Vault / Log Analytics | Registry, secrets, Container Apps logs |
| PostgreSQL 16 Flexible Server | Private; public access disabled |
| Container Apps | Java internal, BFF external, manual Flyway job |
| Static Web App (Free) | Admin Vite host. Default location `westeurope` because Free SKU is not in every region. BFF CORS includes `http://localhost:5173` plus the SWA origin |

Admin `VITE_BFF_BASE_URL` is a **build-time** Vite variable (see `apps/web/.env.example`). It is not injected by this template. GitHub deploy of `apps/web/dist` is P4-01.

Employee mobile stays Expo (`DEC-01`). Cloud BFF URL is `EXPO_PUBLIC_BFF_BASE_URL` / EAS preview env (`apps/mobile/.env.example`, `apps/mobile/eas.json`). No app-store listing.

## Compile (no Azure account required)

```bash
make bicep-build
```

## Deploy (operator, after P0-01)

Push images, set `postgresAdminPassword`, deploy `infra/main.bicep`, run the Flyway job, then build the web app with `VITE_BFF_BASE_URL=https://<bff-fqdn>` and upload `apps/web/dist` to the Static Web App. Point Expo `EXPO_PUBLIC_BFF_BASE_URL` at the same BFF FQDN.
