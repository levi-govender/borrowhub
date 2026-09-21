@description('Azure region for the Container Apps environment.')
param location string

@description('Managed environment name.')
param name string

@description('Infrastructure subnet ID (snet-apps, /23). Do not pre-delegate this subnet.')
param infrastructureSubnetId string

@description('Log Analytics workspace name in this resource group.')
param logAnalyticsWorkspaceName string

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: false
    }
    zoneRedundant: false
  }
}

output id string = env.id
output name string = env.name
output defaultDomain string = env.properties.defaultDomain
