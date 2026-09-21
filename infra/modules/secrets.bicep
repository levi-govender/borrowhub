@description('Azure region for Key Vault.')
param location string

@description('Vault name: 3-24 characters, globally unique.')
param name string

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

output id string = vault.id
output name string = vault.name
output uri string = vault.properties.vaultUri
