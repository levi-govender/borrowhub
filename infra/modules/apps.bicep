@description('Azure region for Container Apps.')
param location string

@description('Container Apps environment resource ID.')
param environmentId string

@description('Java Container App name.')
param javaAppName string

@description('BFF Container App name.')
param bffAppName string

@description('ACR login server, e.g. myregistry.azurecr.io.')
param acrLoginServer string

@description('User-assigned identity resource ID (ACR pull + Key Vault).')
param managedIdentityId string

@description('Key Vault URI, including trailing slash.')
param keyVaultUri string

@description('Backend image (must already exist in ACR for a real deploy).')
param backendImage string

@description('BFF image (must already exist in ACR for a real deploy).')
param bffImage string

@description('JDBC URL for private Flexible Server.')
param postgresJdbcUrl string

@description('PostgreSQL administrator login.')
param postgresAdminLogin string

@description('Entra JWT issuer URI for Java. Empty until P0-01.')
param jwtIssuerUri string

@description('Entra JWT audience for Java. Empty until P0-01.')
param jwtAudience string

@description('BFF Entra tenant ID. Empty until P0-01.')
param entraTenantId string

@description('BFF application (client) ID. Empty until P0-01.')
param entraBffClientId string

@description('Scope the BFF requests when exchanging OBO tokens. Empty until P0-01.')
param entraJavaScope string

@description('Allowed browser origins for the BFF (comma-separated).')
param allowedWebOrigins string

@description('Minimum replicas (0 is cheaper for learning; cold start).')
param minReplicas int = 0

@description('Maximum replicas.')
param maxReplicas int = 1

@description('Workspace-based Application Insights connection string.')
param applicationInsightsConnectionString string

var postgresPasswordSecretName = 'postgres-password'
var kvSecretUri = '${keyVaultUri}secrets/postgres-admin-password'

resource javaApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: javaAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8080
        transport: 'http'
        allowInsecure: true
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
          name: 'backend'
          image: backendImage
          env: [
            { name: 'SPRING_DATASOURCE_URL', value: postgresJdbcUrl }
            { name: 'SPRING_DATASOURCE_USERNAME', value: postgresAdminLogin }
            { name: 'SPRING_DATASOURCE_PASSWORD', secretRef: postgresPasswordSecretName }
            { name: 'SPRING_FLYWAY_ENABLED', value: 'false' }
            { name: 'BORROWHUB_DEMO_IDENTITY_ENABLED', value: 'false' }
            { name: 'SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI', value: jwtIssuerUri }
            { name: 'SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_AUDIENCES', value: jwtAudience }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/actuator/health/liveness'
                port: 8080
              }
              initialDelaySeconds: 20
              periodSeconds: 10
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/actuator/health/readiness'
                port: 8080
              }
              initialDelaySeconds: 15
              periodSeconds: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

resource bffApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: bffAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'bff'
          image: bffImage
          env: [
            { name: 'HOST', value: '0.0.0.0' }
            { name: 'PORT', value: '3000' }
            { name: 'JAVA_BASE_URL', value: 'http://${javaAppName}' }
            { name: 'ALLOWED_WEB_ORIGINS', value: allowedWebOrigins }
            { name: 'ENTRA_TENANT_ID', value: entraTenantId }
            { name: 'ENTRA_BFF_CLIENT_ID', value: entraBffClientId }
            { name: 'ENTRA_JAVA_SCOPE', value: entraJavaScope }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health/live'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health/ready'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output javaAppName string = javaApp.name
output javaFqdn string = javaApp.properties.configuration.ingress.fqdn
output bffAppName string = bffApp.name
output bffFqdn string = bffApp.properties.configuration.ingress.fqdn
