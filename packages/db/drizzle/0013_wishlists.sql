CREATE TABLE "wish_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"size" text NOT NULL,
	"gifted_by" text,
	"gifted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "wish_slug" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "wish_item_ids" jsonb;--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wish_items_child_id_product_id_size_index" ON "wish_items" USING btree ("child_id","product_id","size");--> statement-breakpoint
CREATE INDEX "wish_items_child_id_index" ON "wish_items" USING btree ("child_id");--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_wishSlug_unique" UNIQUE("wish_slug");