@description('Monthly cost budget in the billing currency of the subscription.')
param amount int

@description('Email for Actual 80% and 100% notifications. Required by the budget API.')
param contactEmail string

@description('First day of a month (UTC). Changing this can recreate the budget.')
param startDate string

@description('Budget resource name.')
param name string

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: name
  properties: {
    category: 'Cost'
    amount: amount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    notifications: {
      Actual_GreaterThan_80: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: [
          contactEmail
        ]
      }
      Actual_GreaterThan_100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: [
          contactEmail
        ]
      }
    }
  }
}

output name string = budget.name
output amount int = amount
