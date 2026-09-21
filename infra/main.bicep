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

var suffix = uniqueString(resourceGroup().id)
var acrName = take('bh${replace(namePrefix, '-', '')}${suffix}', 50)
var keyVaultName = take('bh${suffix}', 24)
var postgresServerName = take('${namePrefix}-pg-${suffix}', 63)
var identityName = '${namePrefix}-uami'
var logAnalyticsName = take('${namePrefix}-law-${suffix}', 63)

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
