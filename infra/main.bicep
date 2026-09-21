targetScope = 'resourceGroup'

@description('Azure region. South Africa North is the candidate from P0-01; it is not a confirmed deployment.')
param location string = 'southafricanorth'

@description('Short prefix for resource names (lowercase letters and hyphens).')
@minLength(3)
@maxLength(24)
param namePrefix string = 'borrowhub'

@description('VNet CIDR.')
param vnetAddressPrefix string = '10.20.0.0/16'

@description('Container Apps subnet CIDR (wired in P3-04).')
param appsSubnetPrefix string = '10.20.0.0/23'

@description('PostgreSQL delegated subnet CIDR.')
param dataSubnetPrefix string = '10.20.2.0/24'

@description('Private endpoint subnet CIDR.')
param privateEndpointSubnetPrefix string = '10.20.3.0/24'

@description('PostgreSQL administrator login. Cannot be a reserved name such as admin or postgres.')
param postgresAdminLogin string = 'bhpgadmin'

@secure()
@description('PostgreSQL administrator password. Pass at deploy time; never commit it.')
param postgresAdminPassword string

@description('Flexible Server SKU name.')
param postgresSkuName string = 'Standard_B2s'

@description('Flexible Server SKU tier.')
param postgresSkuTier string = 'Burstable'

@description('Flexible Server storage in GB.')
param postgresStorageSizeGB int = 32

@description('Application database name.')
param postgresDatabaseName string = 'borrowhub'

@description('Backend image. Empty uses <acr>.azurecr.io/backend:unpushed (push before deploy).')
param backendImage string = ''

@description('BFF image. Empty uses <acr>.azurecr.io/bff:unpushed (push before deploy).')
param bffImage string = ''

@description('Flyway migrate image. Empty uses <acr>.azurecr.io/migrate:unpushed (push before deploy).')
param migrateImage string = ''

@description('Entra JWT issuer URI for Java. Leave empty until P0-01.')
param jwtIssuerUri string = ''

@description('Entra JWT audience for Java. Leave empty until P0-01.')
param jwtAudience string = ''

@description('BFF Entra tenant ID. Leave empty until P0-01.')
param entraTenantId string = ''

@description('BFF application (client) ID. Leave empty until P0-01.')
param entraBffClientId string = ''

@description('OBO scope for the Java API. Leave empty until P0-01.')
param entraJavaScope string = ''

@description('Comma-separated browser origins allowed by the BFF.')
param allowedWebOrigins string = 'http://localhost:5173'

@description('Container Apps minimum replicas (0 reduces idle cost).')
param containerMinReplicas int = 0

var suffix = uniqueString(resourceGroup().id)
var acrName = take('bh${replace(namePrefix, '-', '')}${suffix}', 50)
var keyVaultName = take('bh${suffix}', 24)
var postgresServerName = take('${namePrefix}-pg-${suffix}', 63)
var identityName = '${namePrefix}-uami'
var logAnalyticsName = take('${namePrefix}-law-${suffix}', 63)
var containerEnvName = take('${namePrefix}-cae', 32)
var javaAppName = take('${namePrefix}-java', 32)
var bffAppName = take('${namePrefix}-bff', 32)
var flywayJobName = take('${namePrefix}-flyway', 32)
var acrLoginHost = '${acrName}.azurecr.io'
var managedIdentityId = resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', identityName)
var postgresJdbcUrl = 'jdbc:postgresql://${postgresServerName}.postgres.database.azure.com:5432/${postgresDatabaseName}?sslmode=require'
var backendImageRef = !empty(backendImage) ? backendImage : '${acrLoginHost}/backend:unpushed'
var bffImageRef = !empty(bffImage) ? bffImage : '${acrLoginHost}/bff:unpushed'
var migrateImageRef = !empty(migrateImage) ? migrateImage : '${acrLoginHost}/migrate:unpushed'

// Well-known Azure role definition IDs (platform-wide, not subscription-specific resources).
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

module network 'modules/network.bicep' = {
  name: 'network'
  params: {
    location: location
    namePrefix: namePrefix
    vnetAddressPrefix: vnetAddressPrefix
    appsSubnetPrefix: appsSubnetPrefix
    dataSubnetPrefix: dataSubnetPrefix
    privateEndpointSubnetPrefix: privateEndpointSubnetPrefix
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
    name: identityName
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    name: acrName
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    name: logAnalyticsName
  }
}

module secrets 'modules/secrets.bicep' = {
  name: 'secrets'
  params: {
    location: location
    name: keyVaultName
  }
}

module database 'modules/database.bicep' = {
  name: 'database'
  params: {
    location: location
    serverName: postgresServerName
    databaseName: postgresDatabaseName
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    delegatedSubnetId: network.outputs.dataSubnetId
    vnetId: network.outputs.vnetId
    skuName: postgresSkuName
    skuTier: postgresSkuTier
    storageSizeGB: postgresStorageSizeGB
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrName, identityName, acrPullRoleId)
  scope: acr
  properties: {
    principalId: identity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
  dependsOn: [
    registry
  ]
}

resource vaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, identityName, keyVaultSecretsUserRoleId)
  scope: vault
  properties: {
    principalId: identity.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
  }
  dependsOn: [
    secrets
  ]
}

resource postgresAdminPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'postgres-admin-password'
  properties: {
    value: postgresAdminPassword
  }
  dependsOn: [
    secrets
  ]
}

module containerEnvironment 'modules/container-environment.bicep' = {
  name: 'container-environment'
  params: {
    location: location
    name: containerEnvName
    infrastructureSubnetId: network.outputs.appsSubnetId
    logAnalyticsWorkspaceName: logAnalyticsName
  }
  dependsOn: [
    monitoring
  ]
}

module apps 'modules/apps.bicep' = {
  name: 'apps'
  params: {
    location: location
    environmentId: containerEnvironment.outputs.id
    javaAppName: javaAppName
    bffAppName: bffAppName
    acrLoginServer: acrLoginHost
    managedIdentityId: managedIdentityId
    keyVaultUri: secrets.outputs.uri
    backendImage: backendImageRef
    bffImage: bffImageRef
    postgresJdbcUrl: postgresJdbcUrl
    postgresAdminLogin: postgresAdminLogin
    jwtIssuerUri: jwtIssuerUri
    jwtAudience: jwtAudience
    entraTenantId: entraTenantId
    entraBffClientId: entraBffClientId
    entraJavaScope: entraJavaScope
    allowedWebOrigins: allowedWebOrigins
    minReplicas: containerMinReplicas
  }
  dependsOn: [
    acrPull
    vaultSecretsUser
    postgresAdminPasswordSecret
    database
  ]
}

module migrationJob 'modules/migration-job.bicep' = {
  name: 'migration-job'
  params: {
    location: location
    jobName: flywayJobName
    environmentId: containerEnvironment.outputs.id
    acrLoginServer: acrLoginHost
    managedIdentityId: managedIdentityId
    keyVaultUri: secrets.outputs.uri
    migrateImage: migrateImageRef
    flywayUrl: postgresJdbcUrl
    postgresAdminLogin: postgresAdminLogin
  }
  dependsOn: [
    acrPull
    vaultSecretsUser
    postgresAdminPasswordSecret
    database
  ]
}

output location string = location
output vnetName string = network.outputs.vnetName
output appsSubnetId string = network.outputs.appsSubnetId
output dataSubnetId string = network.outputs.dataSubnetId
output privateEndpointSubnetId string = network.outputs.privateEndpointSubnetId
output managedIdentityName string = identity.outputs.name
output managedIdentityClientId string = identity.outputs.clientId
output acrName string = registry.outputs.name
output acrLoginServer string = registry.outputs.loginServer
output keyVaultName string = secrets.outputs.name
output logAnalyticsWorkspaceName string = monitoring.outputs.name
output postgresServerName string = database.outputs.serverName
output postgresFqdn string = database.outputs.fullyQualifiedDomainName
output postgresDatabaseName string = database.outputs.databaseName
output containerAppsEnvironmentName string = containerEnvironment.outputs.name
output javaAppName string = apps.outputs.javaAppName
output bffAppName string = apps.outputs.bffAppName
output bffFqdn string = apps.outputs.bffFqdn
output flywayJobName string = migrationJob.outputs.jobName
