CREATE TYPE "public"."invoice_kind" AS ENUM('factura', 'nota_credito');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pendiente', 'emitida', 'error', 'anulada');--> statement-breakpoint
CREATE TABLE "arca_tokens" (
	"service" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"sign" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"status" "invoice_status" DEFAULT 'pendiente' NOT NULL,
	"cbte_type" integer NOT NULL,
	"point_of_sale" integer NOT NULL,
	"number" integer,
	"cae" varchar(14),
	"cae_expires_on" varchar(10),
	"issued_on" varchar(10),
	"total_cents" integer NOT NULL,
	"data" jsonb NOT NULL,
	"associated_id" uuid,
	"simulated" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"mailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_id_kind_index" ON "invoices" USING btree ("order_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number" ON "invoices" USING btree ("simulated","cbte_type","point_of_sale","number") WHERE "invoices"."status" = 'emitida';--> statement-breakpoint
CREATE INDEX "invoices_due" ON "invoices" USING btree ("next_attempt_at") WHERE "invoices"."status" in ('pendiente', 'error');