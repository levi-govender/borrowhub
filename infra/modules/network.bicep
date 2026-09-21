@description('Azure region for the virtual network.')
param location string

@description('Short name used in VNet and subnet resource names.')
param namePrefix string

@description('VNet address space. Apps, data, and private-endpoint subnets must sit inside it.')
param vnetAddressPrefix string

@description('Subnet for Container Apps environment (P3-04).')
param appsSubnetPrefix string

@description('Delegated subnet for PostgreSQL Flexible Server.')
param dataSubnetPrefix string

@description('Subnet for private endpoints (Key Vault / ACR later).')
param privateEndpointSubnetPrefix string

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${namePrefix}-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        name: 'snet-apps'
        properties: {
          addressPrefix: appsSubnetPrefix
        }
      }
      {
        name: 'snet-data'
        properties: {
          addressPrefix: dataSubnetPrefix
          delegations: [
            {
              name: 'postgres-flexible'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetName string = vnet.name
output appsSubnetId string = '${vnet.id}/subnets/snet-apps'
output dataSubnetId string = '${vnet.id}/subnets/snet-data'
output privateEndpointSubnetId string = '${vnet.id}/subnets/snet-private-endpoints'
