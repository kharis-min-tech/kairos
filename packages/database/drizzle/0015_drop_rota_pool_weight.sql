-- Drop the weight column from rota_pool_members.
-- Weight was a tiebreaker in the fairness algorithm but provided no real
-- bias on schedule frequency and only added confusion for leads.
-- Postgres drops the dependent CHECK constraint (weight > 0) automatically.

ALTER TABLE "rota_pool_members" DROP COLUMN IF EXISTS "weight";
