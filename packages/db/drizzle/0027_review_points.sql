CREATE TABLE "points_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"points" integer NOT NULL,
	"review_id" uuid,
	"coupon_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "audience" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "audience" SET DEFAULT 'todos'::text;--> statement-breakpoint
-- "Después de dejar una reseña" se reemplaza por los puntos: si había uno, queda pausado (no para todos)
UPDATE "coupons" SET "audience" = 'todos', "active" = false WHERE "audience" = 'resena';--> statement-breakpoint
DROP TYPE "public"."coupon_audience";--> statement-breakpoint
CREATE TYPE "public"."coupon_audience" AS ENUM('todos', 'primera_compra', 'cumple', 'anotados');--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "audience" SET DEFAULT 'todos'::"public"."coupon_audience";--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "audience" SET DATA TYPE "public"."coupon_audience" USING "audience"::"public"."coupon_audience";--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "points_entries" ADD CONSTRAINT "points_entries_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_entries" ADD CONSTRAINT "points_entries_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "points_entries_review_id_index" ON "points_entries" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "points_entries_email_index" ON "points_entries" USING btree ("email");