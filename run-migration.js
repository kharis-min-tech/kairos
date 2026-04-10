const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { readFileSync } = require('fs');
const postgres = require('postgres');

async function runMigration() {
  // Get database credentials
  const client = new SecretsManagerClient({ region: 'eu-west-2' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'kairos-staging/aurora/master-credentials' })
  );
  const credentials = JSON.parse(response.SecretString);

  // Connect to database
  const sql = postgres({
    host: credentials.host,
    port: credentials.port,
    database: 'kairos',
    username: credentials.username,
    password: credentials.password,
    ssl: 'require',
  });

  try {
    // Read and execute migration
    const migrationSql = readFileSync('packages/database/drizzle/0003_add_fellowship_type.sql', 'utf8');
    
    console.log('Running migration...');
    await sql.unsafe(migrationSql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
