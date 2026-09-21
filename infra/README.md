# Azure Bicep

Resource-group templates for network, registry, identity, Key Vault, Log Analytics, private PostgreSQL 16 (`DEC-06`), a Container Apps environment, Java (internal), BFF (external), and a **manual** Flyway job.

This folder is compile-ready configuration. It is **not** a deployed environment. Do not treat template outputs as live resource IDs until an operator deploys them. Images tagged `:unpushed` are placeholders until ACR has real tags.

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
```

## What it defines

| Piece | Intent |
| --- | --- |
| VNet `10.20.0.0/16` | `snet-apps` (Container Apps infra, /23, not pre-delegated), `snet-data` (Postgres), `snet-private-endpoints` |
| User-assigned identity | AcrPull + Key Vault Secrets User |
| ACR Basic | Admin user disabled |
| Key Vault | RBAC; public network enabled for bootstrap |
| Log Analytics | 30-day workspace for Container Apps logs |
| PostgreSQL 16 Flexible Server | Public access disabled; private DNS |
| Container Apps environment | VNet-joined; BFF external ingress; Java internal HTTP |
| Flyway job | Manual trigger (`DEC-06`). Java sets `SPRING_FLYWAY_ENABLED=false` so schema changes go through the job first |

Region parameter defaults to `southafricanorth` (P0-01 **candidate**). Names use `uniqueString(resourceGroup().id)`.

Java demo identity stays **off**. JWT issuer, audience, and BFF OBO settings are empty parameters until `P0-01`.

## Images

| Image | Dockerfile | Default tag if unset |
| --- | --- | --- |
| Java | `services/backend/Dockerfile` | `<acr>.azurecr.io/backend:unpushed` |
| BFF | `services/bff/Dockerfile` | `<acr>.azurecr.io/bff:unpushed` |
| Flyway | `services/backend/Dockerfile.migrate` | `<acr>.azurecr.io/migrate:unpushed` |

```bash
make docker-build
make docker-build-migrate
```

A deploy fails until those tags exist in ACR. Static Web Apps / mobile env are P3-05.

## Compile (no Azure account required)

```bash
make bicep-build
```

## Deploy (operator, after P0-01)

Needs a subscription, resource group, pushed images, and a password that is **not** in git:

```bash
az group create --name <rg> --location southafricanorth
az deployment group create \
  --resource-group <rg> \
  --template-file infra/main.bicep \
  --parameters postgresAdminPassword='<not committed>'
az containerapp job start --name <flyway-job> --resource-group <rg>
```

Run the Flyway job **before** expecting Java readiness (`ddl-auto=validate`). Copy `infra/parameters.example.bicepparam` to `infra/main.bicepparam.local` (gitignored) for Entra and image tags.
