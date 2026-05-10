ALTER TABLE "services" ADD COLUMN "deleted_by" uuid;
ALTER TABLE "services" ADD CONSTRAINT "services_deleted_by_members_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "members"("id") ON DELETE set null ON UPDATE no action;
