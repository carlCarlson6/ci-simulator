CREATE TABLE "static_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_name" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "static_pages_page_name_unique" UNIQUE("page_name")
);
