CREATE TABLE "service_attendance" (
	"service_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"attendance_status" varchar(20) NOT NULL,
	"arrival_time" timestamp,
	"is_first_time_visitor" boolean DEFAULT false NOT NULL,
	"visitor_name" varchar(200),
	"visitor_phone" varchar(20),
	"visitor_email" varchar(100),
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_attendance_service_id_member_id_pk" PRIMARY KEY("service_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_date" timestamp NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"service_title" varchar(200),
	"preacher_id" uuid,
	"topic" varchar(200),
	"expected_attendance" integer,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_preacher_id_members_id_fk" FOREIGN KEY ("preacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_attendance_service_id" ON "service_attendance" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_member_id" ON "service_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_status" ON "service_attendance" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_first_time" ON "service_attendance" USING btree ("is_first_time_visitor");--> statement-breakpoint
CREATE INDEX "idx_services_branch_id" ON "services" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_services_service_date" ON "services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_services_service_type" ON "services" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_services_preacher_id" ON "services" USING btree ("preacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_services_branch_date_type" ON "services" USING btree ("branch_id","service_date","service_type");