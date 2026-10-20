CREATE TABLE "launch_visits" (
	"launch_id" uuid NOT NULL,
	"day" date NOT NULL,
	"visitor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "launch_visits_launch_id_day_visitor_pk" PRIMARY KEY("launch_id","day","visitor")
);
--> statement-breakpoint
ALTER TABLE "launch_visits" ADD CONSTRAINT "launch_visits_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;