-- Add 'Tithe' to donation_purpose CHECK constraint
ALTER TABLE "donations" DROP CONSTRAINT "chk_donations_purpose";
ALTER TABLE "donations" ADD CONSTRAINT "chk_donations_purpose" CHECK ("donations"."donation_purpose" IN ('Offering', 'Tithe', 'Building Fund', 'Other'));
