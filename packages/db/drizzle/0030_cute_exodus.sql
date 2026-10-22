DROP INDEX "invoices_order_id_kind_index";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "refund_key" text;--> statement-breakpoint
UPDATE "invoices" SET "refund_key" = 'total' WHERE "kind" = 'nota_credito';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "returned_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "giftcard_refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_one_factura" ON "invoices" USING btree ("order_id") WHERE "invoices"."kind" = 'factura';--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_one_credit_per_refund" ON "invoices" USING btree ("order_id","refund_key");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_item_returned_qty" CHECK ("order_items"."returned_qty" between 0 and "order_items"."qty");