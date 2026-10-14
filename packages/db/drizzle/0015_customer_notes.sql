CREATE TABLE "customer_notes" (
	"email" text PRIMARY KEY NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
