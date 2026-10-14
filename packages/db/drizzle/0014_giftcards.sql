CREATE TYPE "public"."order_kind" AS ENUM('prendas', 'giftcard');--> statement-breakpoint
CREATE TYPE "public"."giftcard_status" AS ENUM('esperando_pago', 'activa', 'anulada');--> statement-breakpoint
CREATE TABLE "giftcard_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giftcard_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giftcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"code" text,
	"status" "giftcard_status" DEFAULT 'esperando_pago' NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"design" text NOT NULL,
	"to_name" text NOT NULL,
	"from_name" text NOT NULL,
	"message" text,
	"via" text NOT NULL,
	"recipient" text NOT NULL,
	"deliver_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "giftcard_balance_ok" CHECK ("giftcards"."balance_cents" >= 0 and "giftcards"."balance_cents" <= "giftcards"."amount_cents")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "kind" "order_kind" DEFAULT 'prendas' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "giftcard_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "giftcard_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "giftcard_redemptions" ADD CONSTRAINT "giftcard_redemptions_giftcard_id_giftcards_id_fk" FOREIGN KEY ("giftcard_id") REFERENCES "public"."giftcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giftcard_redemptions" ADD CONSTRAINT "giftcard_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giftcards" ADD CONSTRAINT "giftcards_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "giftcard_redemptions_giftcard_id_order_id_index" ON "giftcard_redemptions" USING btree ("giftcard_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "giftcards_code_index" ON "giftcards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "giftcards_order_id_index" ON "giftcards" USING btree ("order_id");