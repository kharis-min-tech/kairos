-- Add source categorization fields to souls table
ALTER TABLE "souls" ADD COLUMN "source_type" varchar(30) DEFAULT 'Ad Hoc' NOT NULL;
ALTER TABLE "souls" ADD COLUMN "fellowship_id" uuid;
ALTER TABLE "souls" ADD COLUMN "department_name" varchar(100);

-- Update outreach_id to allow NULL (change from cascade to set null)
ALTER TABLE "souls" DROP CONSTRAINT "souls_outreach_id_outreach_programs_id_fk";
ALTER TABLE "souls" ADD CONSTRAINT "souls_outreach_id_outreach_programs_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "outreach_programs"("id") ON DELETE set null ON UPDATE no action;

-- Add foreign key for fellowship_id
ALTER TABLE "souls" ADD CONSTRAINT "souls_fellowship_id_fellowships_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "fellowships"("id") ON DELETE set null ON UPDATE no action;

-- Add indexes
CREATE INDEX "idx_souls_source_type" ON "souls" ("source_type");
CREATE INDEX "idx_souls_fellowship_id" ON "souls" ("fellowship_id");
