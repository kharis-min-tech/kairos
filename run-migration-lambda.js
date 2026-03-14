// Simple script to run SQL migration via Lambda
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const sql = `
ALTER TABLE "fellowships" 
ADD COLUMN IF NOT EXISTS "fellowship_type" VARCHAR(100);

UPDATE "fellowships" 
SET "fellowship_type" = 'K-Groups' 
WHERE "fellowship_type" IS NULL;

ALTER TABLE "fellowships" 
ALTER COLUMN "fellowship_type" SET NOT NULL;

ALTER TABLE "fellowships"
DROP CONSTRAINT IF EXISTS "chk_fellowships_type";

ALTER TABLE "fellowships"
ADD CONSTRAINT "chk_fellowships_type" 
CHECK ("fellowship_type" IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'));
`;

async function runMigration() {
  const client = new LambdaClient({ region: 'eu-west-2' });
  
  // Invoke the db-seed function with custom SQL
  const command = new InvokeCommand({
    FunctionName: 'kairos-staging-db-seed',
    Payload: JSON.stringify({ customSql: sql }),
  });

  try {
    const response = await client.send(command);
    const result = JSON.parse(Buffer.from(response.Payload).toString());
    console.log('Migration result:', result);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
