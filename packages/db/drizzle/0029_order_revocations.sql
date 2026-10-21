CREATE TABLE "order_revocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"reason" text,
	"in_time" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_revocations_orderId_unique" UNIQUE("order_id"),
	CONSTRAINT "order_revocations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "order_revocations" ADD CONSTRAINT "order_revocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;