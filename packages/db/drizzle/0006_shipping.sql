CREATE TABLE "shipment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN "to_status" "order_status";--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_events_shipment_id_code_index" ON "shipment_events" USING btree ("shipment_id","code");--> statement-breakpoint
CREATE INDEX "shipment_events_shipment_id_at_index" ON "shipment_events" USING btree ("shipment_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_order_id_index" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_carrier_tracking_number_index" ON "shipments" USING btree ("carrier","tracking_number");