CREATE TYPE "public"."review_status" AS ENUM('pendiente', 'publicada', 'oculta');--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "photo_path" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "status" "review_status" DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "order_item_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_status_index" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_item_id_index" ON "reviews" USING btree ("order_item_id");--> statement-breakpoint
UPDATE "reviews" SET "status" = CASE WHEN "approved" THEN 'publicada'::"review_status" ELSE 'oculta'::"review_status" END, "featured" = ("approved" AND "rating" = 5 AND "title" = '');
