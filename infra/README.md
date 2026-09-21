# Azure Bicep (P3-03 foundation)

Resource-group scoped templates for network, registry, identity, Key Vault, Log Analytics, and **private** PostgreSQL Flexible Server (`DEC-06`). Container Apps, Flyway jobs, Static Web Apps, and budgets are **P3-04 / P4**, not this slice.

This folder is compile-ready configuration. It is **not** a deployed environment. Do not treat template outputs as live resource IDs until an operator deploys them.

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
```

## What it defines

| Piece | Intent |
| --- | --- |
| VNet `10.20.0.0/16` | `snet-apps` (future Container Apps), `snet-data` (Postgres delegation), `snet-private-endpoints` |
| User-assigned identity | AcrPull on the registry; Key Vault Secrets User on the vault |
| ACR Basic | Admin user disabled |
| Key Vault | RBAC authorization; public network left enabled for bootstrap (private endpoints later) |
| Log Analytics | 30-day workspace for later Container Apps / App Insights |
| PostgreSQL 16 Flexible Server | Public access disabled; private DNS `privatelink.postgres.database.azure.com` |

Region parameter defaults to `southafricanorth` (P0-01 **candidate**, not confirmed). Names use `uniqueString(resourceGroup().id)` so they are unique per resource group without hard-coding subscription or resource IDs.

## Compile (no Azure account required)

```bash
make bicep-build
```

That runs `az bicep build --file infra/main.bicep` when Azure CLI is on `PATH`. If `az` is missing, the Makefile tries the `mcr.microsoft.com/azure-cli` image. Success writes `infra/main.json` (gitignored ARM emit).

## Deploy (operator, after P0-01)

Needs a subscription, resource group, and a password that is **not** in git:

```bash
az group create --name <rg> --location southafricanorth
az deployment group create \
  --resource-group <rg> \
  --template-file infra/main.bicep \
  --parameters postgresAdminPassword='<not committed>'
```

Or copy `infra/parameters.example.bicepparam` to `infra/main.bicepparam.local` (gitignored) and pass `--parameters infra/main.bicepparam.local`.

## Out of scope here

- Container Apps environment, Java/BFF apps, migration job (`P3-04`)
- Static Web Apps / mobile env (`P3-05`)
- CI, Application Insights wiring, consumption budgets (`P4`)
- Live Entra app registrations (`P0-01`)
