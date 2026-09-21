@description('Azure region for Log Analytics.')
param location string

@description('Workspace name.')
param name string

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

output id string = workspace.id
output name string = workspace.name
output customerId string = workspace.properties.customerId
