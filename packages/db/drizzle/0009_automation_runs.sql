CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule" text NOT NULL,
	"subject" text NOT NULL,
	"detail" text NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"subject_key" text,
	"order_id" uuid,
	"contact" text,
	"product_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_runs_created_at_index" ON "automation_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_runs_rule_subject_key_index" ON "automation_runs" USING btree ("rule","subject_key");