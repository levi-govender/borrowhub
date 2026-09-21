@description('Azure region for the Flyway job.')
param location string

@description('Container Apps Job name.')
param jobName string

@description('Container Apps environment resource ID.')
param environmentId string

@description('ACR login server.')
param acrLoginServer string

@description('User-assigned identity resource ID.')
param managedIdentityId string

@description('Key Vault URI, including trailing slash.')
param keyVaultUri string

@description('Flyway image with SQL copied into /flyway/sql.')
param migrateImage string

@description('JDBC URL Flyway uses (sslmode=require).')
param flywayUrl string

@description('PostgreSQL administrator login.')
param postgresAdminLogin string

var postgresPasswordSecretName = 'postgres-password'
var kvSecretUri = '${keyVaultUri}secrets/postgres-admin-password'

resource job 'Microsoft.App/jobs@2024-03-01' = {
  name: jobName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 1
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: postgresPasswordSecretName
          keyVaultUrl: kvSecretUri
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'flyway'
          image: migrateImage
          env: [
            { name: 'FLYWAY_URL', value: flywayUrl }
            { name: 'FLYWAY_USER', value: postgresAdminLogin }
            { name: 'FLYWAY_PASSWORD', secretRef: postgresPasswordSecretName }
            { name: 'FLYWAY_CONNECT_RETRIES', value: '10' }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

output jobName string = job.name
output jobId string = job.id
