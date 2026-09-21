using 'main.bicep'

// Copy to a gitignored *.bicepparam.local file before filling secrets.
// Do not put passwords or subscription IDs in git.

param location = 'southafricanorth'
param namePrefix = 'borrowhub'
param postgresAdminLogin = 'bhpgadmin'
// param postgresAdminPassword = '<supply at deploy; never commit>'
