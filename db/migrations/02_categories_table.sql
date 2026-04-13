CREATE TABLE IF NOT EXISTS "public"."categories" (
    "name" "text" PRIMARY KEY,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

INSERT INTO "public"."categories" ("name")
SELECT DISTINCT "category" FROM "public"."sets" WHERE "category" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "public"."sets"
    ADD CONSTRAINT "sets_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."categories"("name") ON UPDATE CASCADE ON DELETE RESTRICT;
