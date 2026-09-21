@description('Static Web Apps region. This SKU is not offered in every Azure region (including some data-plane regions).')
param location string

@description('Static Web App name (globally unique).')
param name string

resource site 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Disabled'
    provider: 'None'
  }
}

output name string = site.name
output defaultHostname string = site.properties.defaultHostname
output origin string = 'https://${site.properties.defaultHostname}'
