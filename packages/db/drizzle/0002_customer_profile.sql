CREATE TYPE "public"."document_type" AS ENUM('DNI', 'CUIT', 'CUIL', 'PAS');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"label" text DEFAULT 'Casa' NOT NULL,
	"street" text NOT NULL,
	"number" varchar(10) NOT NULL,
	"unit" varchar(20),
	"city" text NOT NULL,
	"province" text NOT NULL,
	"postal_code" varchar(8) NOT NULL,
	"country" varchar(2) DEFAULT 'AR' NOT NULL,
	"notes" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"birthday" date,
	"size" text,
	"height_cm" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" varchar(16);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_country" varchar(2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "document_type" "document_type";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "document_number" varchar(15);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "newsletter_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_index" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default";--> statement-breakpoint
CREATE INDEX "children_user_id_index" ON "children" USING btree ("user_id");