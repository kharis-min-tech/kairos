# Fellowship Creation Fix - Database Migration Needed

## Issue
The fellowship creation is failing because the database table `fellowships` is missing the `fellowship_type` column.

## Error
```
Failed query: insert into "fellowships" ... 
Error: column "fellowship_type" does not exist
```

## Solution
Run the following SQL migration against the database:

```sql
-- Add fellowship_type column with default value
ALTER TABLE "fellowships" 
ADD COLUMN IF NOT EXISTS "fellowship_type" VARCHAR(100) NOT NULL DEFAULT 'K-Groups';

-- Add check constraint for valid fellowship types
ALTER TABLE "fellowships"
DROP CONSTRAINT IF EXISTS "chk_fellowships_type";

ALTER TABLE "fellowships"
ADD CONSTRAINT "chk_fellowships_type" 
CHECK ("fellowship_type" IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'));
```

## How to Run the Migration

### Option 1: Via AWS Console (RDS Query Editor)
1. Go to AWS RDS Console
2. Select the `kairos-staging-aurora-cluster`
3. Click "Query Editor"
4. Connect using the secret: `kairos-staging/aurora/master-credentials`
5. Select database: `kairos`
6. Run the SQL above

### Option 2: Via psql (if you have VPN/bastion access)
```bash
psql -h kairos-staging-aurora-cluster.cluster-chg6wk8qanwm.eu-west-2.rds.amazonaws.com \
     -U <username> \
     -d kairos \
     -f packages/database/drizzle/0003_add_fellowship_type.sql
```

### Option 3: Enable RDS Data API
1. Enable Data API on the Aurora cluster
2. Run:
```bash
aws rds-data execute-statement \
  --resource-arn "arn:aws:rds:eu-west-2:742213192328:cluster:kairos-staging-aurora-cluster" \
  --secret-arn "arn:aws:secretsmanager:eu-west-2:742213192328:secret:kairos-staging/aurora/master-credentials-C8dQO6" \
  --database "kairos" \
  --sql "ALTER TABLE fellowships ADD COLUMN IF NOT EXISTS fellowship_type VARCHAR(100) NOT NULL DEFAULT 'K-Groups';" \
  --region eu-west-2
```

## After Running Migration
1. Refresh your browser at http://localhost:3000/fellowships
2. Try creating a fellowship again
3. It should work!

## Files Updated
- `packages/database/src/schema/fellowships.ts` - Added fellowship_type column
- `packages/database/drizzle/0003_add_fellowship_type.sql` - Migration SQL
- `apps/api/src/fellowships/fellowships-create.ts` - Updated to use fellowship_type
- `infrastructure/src/config.ts` - Added localhost to CORS allowed origins

## Status
- ✅ Backend code updated and deployed
- ✅ Frontend code fixed (all TypeScript errors resolved)
- ✅ CORS configured for localhost
- ❌ Database migration NOT YET RUN (needs manual execution)

Once the migration is run, everything will work!
