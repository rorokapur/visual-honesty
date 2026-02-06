


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_stimulus"("p_image_url" "text", "p_name" "text", "p_is_deceptive" boolean, "p_set_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_set_id UUID;
BEGIN
  -- 1. Get ID or Create New (Atomic-style logic)
  WITH s AS (
      INSERT INTO public.sets (name) VALUES (p_set_name)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
  )
  SELECT id INTO v_set_id FROM s
  UNION ALL
  SELECT id FROM public.sets WHERE name = p_set_name
  LIMIT 1;

  -- 2. Insert the Item
  INSERT INTO public.stimuli (image_url, set_id, is_deceptive, name)
  VALUES (p_image_url, v_set_id, p_is_deceptive, p_name);
END;
$$;


ALTER FUNCTION "public"."add_stimulus"("p_image_url" "text", "p_name" "text", "p_is_deceptive" boolean, "p_set_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_empty_set_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the set we just left (OLD.set_id) is now empty.
  -- We use 'EXISTS' because it stops searching as soon as it finds 1 item (Fast).
  IF OLD.set_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM stimuli WHERE set_id = OLD.set_id
  ) THEN
    -- It's empty! Delete the set.
    DELETE FROM sets WHERE id = OLD.set_id;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_empty_set_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_participant_results"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
    total_answered int;
    total_correct int;
BEGIN
    -- 1. Perform a JOIN to check the 'is_deceptive' flag on the chosen stimulus
    SELECT 
        COUNT(*), 
        COUNT(*) FILTER (
            WHERE s.is_deceptive = TRUE
        )
    INTO total_answered, total_correct
    FROM responses r
    JOIN stimuli s ON r.selected_stimulus = s.id
    WHERE r.session_id = target_uuid;

    -- 2. Return the results
    RETURN json_build_object(
      'total_questions', total_answered,
      'correct_answers', total_correct,
      'accuracy_percentage', CASE 
                               WHEN total_answered > 0 
                               THEN ROUND((total_correct::float / total_answered) * 100) 
                               ELSE 0 
                             END
    );
END;$$;


ALTER FUNCTION "public"."get_participant_results"("target_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_unseen_pair"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_valid_set_ids UUID[];
  v_remaining_count INT;
  v_chosen_set_id UUID;
  v_honest_stimulus JSONB;
  v_deceptive_stimulus JSONB;
  v_random_flip FLOAT;
BEGIN
  -- 1. Find ALL valid set IDs that the user hasn't seen yet
  SELECT ARRAY(
    SELECT s.id
    FROM sets s
    WHERE NOT EXISTS (
      SELECT 1 
      FROM responses r
      WHERE r.session_id = p_session_id 
      AND r.set_id = s.id
    )
    AND s.enabled IS TRUE
    AND EXISTS (SELECT 1 FROM stimuli WHERE set_id = s.id AND is_deceptive IS TRUE)
    AND EXISTS (SELECT 1 FROM stimuli WHERE set_id = s.id AND is_deceptive IS FALSE)
  ) INTO v_valid_set_ids;

  -- 2. Count sets remaining
  v_remaining_count := COALESCE(array_length(v_valid_set_ids, 1), 0);

  IF v_remaining_count = 0 THEN
    RETURN jsonb_build_object('sets_remaining', 0); 
  END IF;

  -- 3. Pick one random Set ID
  v_chosen_set_id := v_valid_set_ids[1 + floor(random() * v_remaining_count)::int];

  -- 4. Fetch the Honest Image (ID and URL only)
  SELECT to_jsonb(t) INTO v_honest_stimulus
  FROM (
    SELECT id, image_url 
    FROM stimuli 
    WHERE set_id = v_chosen_set_id AND is_deceptive IS FALSE 
    ORDER BY random() 
    LIMIT 1
  ) t;

  -- 5. Fetch the Deceptive Image (ID and URL only)
  SELECT to_jsonb(t) INTO v_deceptive_stimulus
  FROM (
    SELECT id, image_url 
    FROM stimuli 
    WHERE set_id = v_chosen_set_id AND is_deceptive IS TRUE 
    ORDER BY random() 
    LIMIT 1
  ) t;

  -- 6. RANDOMIZE: Flip a coin for Left/Right
  v_random_flip := random();

  IF v_random_flip < 0.5 THEN
    RETURN jsonb_build_object(
      'set_id', v_chosen_set_id,
      'left', v_honest_stimulus,
      'right', v_deceptive_stimulus,
      'sets_remaining', v_remaining_count
    );
  ELSE
    RETURN jsonb_build_object(
      'set_id', v_chosen_set_id,
      'left', v_deceptive_stimulus,
      'right', v_honest_stimulus,
      'sets_remaining', v_remaining_count
    );
  END IF;
END;$$;


ALTER FUNCTION "public"."get_random_unseen_pair"("p_session_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responses" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "set_id" "uuid" NOT NULL,
    "selected_stimulus" "uuid" NOT NULL,
    "left_stimulus" "uuid",
    "right_stimulus" "uuid"
);


ALTER TABLE "public"."responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sets" (
    "name" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stimuli" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "set_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "is_deceptive" boolean NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."stimuli" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pair_stats" WITH ("security_invoker"='on') AS
 WITH "possible_pairs" AS (
         SELECT "s_honest"."set_id",
            "st"."name" AS "set_name",
            "s_honest"."id" AS "honest_id",
            "s_honest"."name" AS "honest_name",
            "s_honest"."image_url" AS "honest_url",
            "s_deceptive"."id" AS "deceptive_id",
            "s_deceptive"."name" AS "deceptive_name",
            "s_deceptive"."image_url" AS "deceptive_url"
           FROM (("public"."stimuli" "s_honest"
             JOIN "public"."sets" "st" ON (("s_honest"."set_id" = "st"."id")))
             JOIN "public"."stimuli" "s_deceptive" ON (("s_honest"."set_id" = "s_deceptive"."set_id")))
          WHERE (("s_honest"."is_deceptive" = false) AND ("s_deceptive"."is_deceptive" = true))
        )
 SELECT "pp"."set_id",
    "pp"."set_name",
    "pp"."honest_id",
    "pp"."honest_name",
    "pp"."honest_url",
    "pp"."deceptive_id",
    "pp"."deceptive_name",
    "pp"."deceptive_url",
    "count"("r"."session_id") AS "total_responses",
    "count"("r"."session_id") FILTER (WHERE ("r"."selected_stimulus" = "pp"."deceptive_id")) AS "correct_count",
        CASE
            WHEN ("count"("r"."session_id") > 0) THEN "round"(((("count"("r"."session_id") FILTER (WHERE ("r"."selected_stimulus" = "pp"."deceptive_id")))::numeric / ("count"("r"."session_id"))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "accuracy_percent"
   FROM ("possible_pairs" "pp"
     LEFT JOIN "public"."responses" "r" ON ((("r"."set_id" = "pp"."set_id") AND ((("r"."left_stimulus" = "pp"."honest_id") AND ("r"."right_stimulus" = "pp"."deceptive_id")) OR (("r"."left_stimulus" = "pp"."deceptive_id") AND ("r"."right_stimulus" = "pp"."honest_id"))))))
  GROUP BY "pp"."set_id", "pp"."set_name", "pp"."honest_id", "pp"."honest_name", "pp"."honest_url", "pp"."deceptive_id", "pp"."deceptive_name", "pp"."deceptive_url"
  ORDER BY "pp"."set_id", "pp"."honest_name", "pp"."deceptive_name";


ALTER VIEW "public"."pair_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_pkey" PRIMARY KEY ("session_id", "set_id");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stimuli"
    ADD CONSTRAINT "stimuli_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "cleanup_sets_after_change" AFTER DELETE OR UPDATE OF "set_id" ON "public"."stimuli" FOR EACH ROW EXECUTE FUNCTION "public"."delete_empty_set_cleanup"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_left_stimulus_fkey" FOREIGN KEY ("left_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_right_stimulus_fkey" FOREIGN KEY ("right_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_selected_stimulus_fkey" FOREIGN KEY ("selected_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id");



ALTER TABLE ONLY "public"."stimuli"
    ADD CONSTRAINT "stimuli_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id");



CREATE POLICY "Admins can identify themselves" ON "public"."admins" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Admins have full access" ON "public"."responses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins have full access" ON "public"."sets" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins have full access" ON "public"."stimuli" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Participants can insert responses" ON "public"."responses" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stimuli" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_stimulus"("p_image_url" "text", "p_name" "text", "p_is_deceptive" boolean, "p_set_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_stimulus"("p_image_url" "text", "p_name" "text", "p_is_deceptive" boolean, "p_set_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_stimulus"("p_image_url" "text", "p_name" "text", "p_is_deceptive" boolean, "p_set_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_empty_set_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_empty_set_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_empty_set_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_participant_results"("target_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_participant_results"("target_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_participant_results"("target_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_random_unseen_pair"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_random_unseen_pair"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_random_unseen_pair"("p_session_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."responses" TO "anon";
GRANT ALL ON TABLE "public"."responses" TO "authenticated";
GRANT ALL ON TABLE "public"."responses" TO "service_role";



GRANT ALL ON TABLE "public"."sets" TO "anon";
GRANT ALL ON TABLE "public"."sets" TO "authenticated";
GRANT ALL ON TABLE "public"."sets" TO "service_role";



GRANT ALL ON TABLE "public"."stimuli" TO "authenticated";
GRANT ALL ON TABLE "public"."stimuli" TO "service_role";



GRANT ALL ON TABLE "public"."pair_stats" TO "anon";
GRANT ALL ON TABLE "public"."pair_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pair_stats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

revoke delete on table "public"."stimuli" from "anon";

revoke insert on table "public"."stimuli" from "anon";

revoke references on table "public"."stimuli" from "anon";

revoke select on table "public"."stimuli" from "anon";

revoke trigger on table "public"."stimuli" from "anon";

revoke truncate on table "public"."stimuli" from "anon";

revoke update on table "public"."stimuli" from "anon";


  create policy "admins_delete_stimuli"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'stimuli'::text) AND (EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = ( SELECT auth.uid() AS uid))))));



  create policy "admins_insert_stimuli"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'stimuli'::text) AND (EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = ( SELECT auth.uid() AS uid))))));



  create policy "admins_select_stimuli"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'stimuli'::text) AND (EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = ( SELECT auth.uid() AS uid))))));



  create policy "admins_update_stimuli"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'stimuli'::text) AND (EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = ( SELECT auth.uid() AS uid))))))
with check (((bucket_id = 'stimuli'::text) AND (EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = ( SELECT auth.uid() AS uid))))));


