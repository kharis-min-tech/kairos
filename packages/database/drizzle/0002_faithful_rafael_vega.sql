CREATE TABLE "websocket_connections" (
	"connection_id" varchar(128) NOT NULL,
	"member_id" integer NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "websocket_connections_connection_id_pk" PRIMARY KEY("connection_id")
);
--> statement-breakpoint
ALTER TABLE "donations" DROP CONSTRAINT "chk_donations_purpose";--> statement-breakpoint
DROP INDEX "idx_souls_phone_outreach";--> statement-breakpoint
DROP INDEX "idx_souls_email_outreach";--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "currency" SET DEFAULT 'GBP';--> statement-breakpoint
ALTER TABLE "souls" ALTER COLUMN "outreach_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "stripe_payment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "status" varchar(20) DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "is_template" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "websocket_connections" ADD CONSTRAINT "websocket_connections_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ws_connections_member_id" ON "websocket_connections" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_donations_stripe_payment_id" ON "donations" USING btree ("stripe_payment_id");--> statement-breakpoint
CREATE INDEX "idx_souls_assigned_adhoc" ON "souls" USING btree ("assigned_member_id") WHERE outreach_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_phone_outreach" ON "souls" USING btree ("phone","outreach_id") WHERE phone IS NOT NULL AND outreach_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_email_outreach" ON "souls" USING btree ("email","outreach_id") WHERE email IS NOT NULL AND outreach_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "chk_donations_purpose" CHECK ("donations"."donation_purpose" IN ('Offering', 'Tithe', 'Building Fund', 'Other'));