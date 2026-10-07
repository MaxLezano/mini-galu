CREATE TABLE "launch_products" (
	"launch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "launch_products_launch_id_product_id_pk" PRIMARY KEY("launch_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "launches" ADD COLUMN "notify_before" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "launches" ADD COLUMN "auto_publish" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "launches" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "launches" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "launch_products" ADD CONSTRAINT "launch_products_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launch_products" ADD CONSTRAINT "launch_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;