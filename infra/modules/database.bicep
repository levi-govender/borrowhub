@description('Azure region for PostgreSQL Flexible Server and private DNS.')
param location string

@description('Flexible Server name (lowercase).')
param serverName string

@description('Application database name.')
param databaseName string

@description('Administrator login (not postgres).')
param administratorLogin string

@secure()
@description('Administrator password. Supply at deploy time; do not commit it.')
param administratorLoginPassword string

@description('Delegated data subnet resource ID.')
param delegatedSubnetId string

@description('Virtual network ID for the private DNS zone link.')
param vnetId string

@description('SKU name, e.g. Standard_B2s.')
param skuName string

@description('SKU tier.')
param skuTier string

@description('Storage size in GB.')
param storageSizeGB int

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
}

resource dnsVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDnsZone
  name: '${serverName}-vnet-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnetId
    }
  }
}

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: delegatedSubnetId
      privateDnsZoneArmResourceId: privateDnsZone.id
      publicNetworkAccess: 'Disabled'
    }
  }
  dependsOn: [
    dnsVnetLink
  ]
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

output serverName string = server.name
output fullyQualifiedDomainName string = server.properties.fullyQualifiedDomainName
output databaseName string = database.name
output privateDnsZoneId string = privateDnsZone.id
