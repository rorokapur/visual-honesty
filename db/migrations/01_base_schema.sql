


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';


-- Removed Supabase-specific extensions
-- CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE SCHEMA IF NOT EXISTS "extensions";






-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






-- CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_stimulus"("p_set_name" "text", "p_image_url" "text", "p_is_deceptive" boolean, "p_name" "text", "p_category" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_set_id UUID;
BEGIN
  -- 1. Get ID or Create New (Atomic-style logic)
  WITH s AS (
      INSERT INTO public.sets (name, category) VALUES (p_set_name, p_category)
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
END;$$;




CREATE OR REPLACE FUNCTION "public"."create_ai_participant"("p_admin_id" "uuid", "p_category" "text", "p_demographics" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Access Denied: User is not an authorized administrator.';
  END IF;

  -- is_ai is hardcoded to false here, ignoring any frontend input
  INSERT INTO public.participants (is_ai, category, demographics)
  VALUES (true, p_category, p_demographics)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;$$;




CREATE OR REPLACE FUNCTION "public"."create_participant"("p_category" "text" DEFAULT 'human'::"text", "p_demographics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- is_ai is hardcoded to false here, ignoring any frontend input
  INSERT INTO public.participants (is_ai, category, demographics)
  VALUES (false, p_category, p_demographics)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;




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




CREATE OR REPLACE FUNCTION "public"."get_ai_results"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  -- Variables to hold the User's Aggregated Stats
  user_total_q int;
  user_correct_a int;
  user_overall_acc float;
  user_avg_time float;
  calc_percentile float;
  total_users int;
BEGIN
  -- 1. Update stats for this participant
  PERFORM public.upsert_participant_stats(target_uuid);

  -- 2. AGGREGATE the target user's stats across ALL their categories
  SELECT
    SUM(total_questions),
    SUM(correct_answers),
    -- Calculate True Overall Accuracy: (Total Correct / Total Questions) * 100
    CASE 
      WHEN SUM(total_questions) > 0 
      THEN ROUND((SUM(correct_answers)::float / SUM(total_questions)) * 100)
      ELSE 0 
    END,
    -- Average time across all categories
    AVG(average_time)
  INTO 
    user_total_q, 
    user_correct_a, 
    user_overall_acc, 
    user_avg_time
  FROM public.ai_stats 
  WHERE session_id = target_uuid;

  -- 3. Calculate Percentile: Compare User's Overall Acc vs. AI only
  WITH ai_scores AS (
    SELECT 
      s.session_id,
      CASE 
        WHEN SUM(s.total_questions) > 0 
        THEN (SUM(s.correct_answers)::float / SUM(s.total_questions)) * 100 
        ELSE 0 
      END as overall_acc
    FROM public.ai_stats s
    GROUP BY s.session_id
  )
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE overall_acc <= user_overall_acc)::float / NULLIF(COUNT(*), 0)) * 100
    ),
    COUNT(*) - 1
  INTO calc_percentile, total_users
  FROM ai_scores;

  -- Return as JSON
  RETURN json_build_object(
    'total_questions', COALESCE(user_total_q, 0),
    'correct_answers', COALESCE(user_correct_a, 0),
    'accuracy_percentage', COALESCE(user_overall_acc, 0),
    'percentile', COALESCE(calc_percentile, 0),
    'total_users', COALESCE(total_users, 0),
    'average_time', COALESCE(user_avg_time, 0)
  );
END;$$;




CREATE OR REPLACE FUNCTION "public"."get_binned_benchmarks"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_bins json;
BEGIN
  -- A. Aggregate stats per session (exclude AI)
  WITH user_stats AS (
      SELECT 
        AVG(s.average_time) as x, 
        SUM(s.correct_answers)::float / NULLIF(SUM(s.total_questions), 0) * 100 as y
      FROM participant_stats s
      GROUP BY s.session_id
  ),
  -- B. Quantile Binning
  ranked_data AS (
      SELECT 
        x, y,
        ntile(10) OVER (ORDER BY x) as bucket
      FROM user_stats
  ),
  -- C. Calculate Stats for each Decile
  binned_data AS (
      SELECT 
        bucket,
        AVG(x) as avg_time,
        AVG(y) as avg_accuracy,
        STDDEV(y) as std_dev,
        COUNT(*) as count
      FROM ranked_data
      GROUP BY bucket
      ORDER BY bucket
  )
  -- D. Format Output
  SELECT json_agg(
    json_build_object(
      'x', avg_time, 
      'y', avg_accuracy, 
      'range_min', GREATEST(0, avg_accuracy - COALESCE(std_dev, 0)),
      'range_max', LEAST(100, avg_accuracy + COALESCE(std_dev, 0)),
      'count', count
    )
  ) INTO v_bins FROM binned_data;

  RETURN json_build_object(
    'trend', COALESCE(v_bins, '[]'::json)
  );
END;$$;




CREATE OR REPLACE FUNCTION "public"."get_participant_category_comparison"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  result_json json;
BEGIN
  -- 1. Update stats for this participant first
  PERFORM public.upsert_participant_stats(target_uuid);

  -- 2. Build the JSON Array
  SELECT 
    json_agg(
      json_build_object(
        'category', p.category,
        'user', p.accuracy_percentage,
        'average', g1.global_accuracy,
        'ai', g2.global_accuracy
      )
    )
  INTO result_json
  FROM participant_stats p
  -- Join with the global view to get the averages
  LEFT OUTER JOIN participant_category_benchmarks g1 ON p.category = g1.category
  LEFT OUTER JOIN ai_category_benchmarks g2 ON p.category = g2.category
  WHERE p.session_id = target_uuid;

  -- 3. Return the array (or an empty array [] if no stats exist yet)
  RETURN COALESCE(result_json, '[]'::json);
END;$$;




CREATE OR REPLACE FUNCTION "public"."get_participant_results"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  -- Variables to hold the User's Aggregated Stats
  user_total_q int;
  user_correct_a int;
  user_overall_acc float;
  user_avg_time float;
  calc_percentile float;
  total_users int;
BEGIN
  IF (SELECT is_ai FROM public.participants WHERE id = target_uuid) THEN
        RETURN public.get_ai_results(target_uuid);
  END IF; 

  -- 1. Update stats for this participant
  PERFORM public.upsert_participant_stats(target_uuid);

  -- 2. AGGREGATE the target user's stats across ALL their categories
  SELECT
    SUM(total_questions),
    SUM(correct_answers),
    -- Calculate True Overall Accuracy: (Total Correct / Total Questions) * 100
    CASE 
      WHEN SUM(total_questions) > 0 
      THEN ROUND((SUM(correct_answers)::float / SUM(total_questions)) * 100)
      ELSE 0 
    END,
    -- Average time across all categories
    AVG(average_time)
  INTO 
    user_total_q, 
    user_correct_a, 
    user_overall_acc, 
    user_avg_time
  FROM public.participant_stats 
  WHERE session_id = target_uuid;

  -- 3. Calculate Percentile: Compare User's Overall Acc vs. Humans Only
  WITH participant_scores AS (
    SELECT 
      s.session_id,
      CASE 
        WHEN SUM(s.total_questions) > 0 
        THEN (SUM(s.correct_answers)::float / SUM(s.total_questions)) * 100 
        ELSE 0 
      END as overall_acc
    FROM public.participant_stats s
    GROUP BY s.session_id
  )
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE overall_acc <= user_overall_acc)::float / NULLIF(COUNT(*), 0)) * 100
    ),
    COUNT(*) - 1
  INTO calc_percentile, total_users
  FROM participant_scores;

  -- Return as JSON
  RETURN json_build_object(
    'total_questions', COALESCE(user_total_q, 0),
    'correct_answers', COALESCE(user_correct_a, 0),
    'accuracy_percentage', COALESCE(user_overall_acc, 0),
    'percentile', COALESCE(calc_percentile, 0),
    'total_users', COALESCE(total_users, 0),
    'average_time', COALESCE(user_avg_time, 0)
  );
END;$$;




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
  
  -- NEW VARIABLES
  v_response_id UUID;
  v_left_stimulus_json JSONB;
  v_right_stimulus_json JSONB;
  v_left_stimulus_id UUID;
  v_right_stimulus_id UUID;

BEGIN
  -- =================================================================================
  -- 1. CHECK FOR RESUME (Do we already have a chosen set?)
  -- =================================================================================
  SELECT id, set_id 
  INTO v_response_id, v_chosen_set_id
  FROM responses
  WHERE session_id = p_session_id 
  AND completed_at IS NULL
  LIMIT 1;

  -- =================================================================================
  -- 2. IF NEW: SELECT THE SET ID (But don't insert yet!)
  -- =================================================================================
  IF v_response_id IS NULL THEN
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

    v_remaining_count := COALESCE(array_length(v_valid_set_ids, 1), 0);

    IF v_remaining_count = 0 THEN
      RETURN jsonb_build_object('sets_remaining', 0); 
    END IF;

    -- Pick one random Set ID
    v_chosen_set_id := v_valid_set_ids[1 + floor(random() * v_remaining_count)::int];
  END IF;

  -- =================================================================================
  -- 3. FETCH STIMULI & PERFORM FLIP (Now that we have the Set ID)
  -- =================================================================================
  
  -- Fetch Honest Image
  SELECT to_jsonb(t) INTO v_honest_stimulus
  FROM (
    SELECT id, image_url 
    FROM stimuli 
    WHERE set_id = v_chosen_set_id AND is_deceptive IS FALSE 
    ORDER BY random() 
    LIMIT 1
  ) t;

  -- Fetch Deceptive Image
  SELECT to_jsonb(t) INTO v_deceptive_stimulus
  FROM (
    SELECT id, image_url 
    FROM stimuli 
    WHERE set_id = v_chosen_set_id AND is_deceptive IS TRUE 
    ORDER BY random() 
    LIMIT 1
  ) t;

  -- Randomize Flip
  v_random_flip := random();

  -- Assign Left/Right based on flip
  IF v_random_flip < 0.5 THEN
    v_left_stimulus_json := v_honest_stimulus;
    v_right_stimulus_json := v_deceptive_stimulus;
  ELSE
    v_left_stimulus_json := v_deceptive_stimulus;
    v_right_stimulus_json := v_honest_stimulus;
  END IF;

  -- Extract UUIDs for the database
  v_left_stimulus_id := (v_left_stimulus_json->>'id')::UUID;
  v_right_stimulus_id := (v_right_stimulus_json->>'id')::UUID;

  -- =================================================================================
  -- 4. DATABASE WRITE (Insert or Update)
  -- =================================================================================
  IF v_response_id IS NOT NULL THEN
    -- A. RESUME: Update existing trial with the specific stimuli (in case they changed on refresh)
    UPDATE responses 
    SET started_at = NOW(),
        left_stimulus = v_left_stimulus_id,   -- Save the Left ID
        right_stimulus = v_right_stimulus_id  -- Save the Right ID
    WHERE id = v_response_id;
    
    -- Recalculate 'sets_remaining' for the Resume case
    SELECT count(*) INTO v_remaining_count
    FROM sets s
    WHERE NOT EXISTS (
      SELECT 1 FROM responses r 
      WHERE r.session_id = p_session_id AND r.set_id = s.id AND r.completed_at IS NOT NULL
    )
    AND s.enabled IS TRUE;

  ELSE
    -- B. NEW: Insert the new trial with Left/Right IDs included
    INSERT INTO responses (
      session_id, 
      set_id, 
      started_at, 
      left_stimulus,   -- Save the Left ID
      right_stimulus   -- Save the Right ID
    )
    VALUES (
      p_session_id, 
      v_chosen_set_id, 
      NOW(), 
      v_left_stimulus_id, 
      v_right_stimulus_id
    )
    RETURNING id INTO v_response_id;
  END IF;

  -- =================================================================================
  -- 5. RETURN
  -- =================================================================================
  RETURN jsonb_build_object(
    'trial_id', v_response_id,
    'set_id', v_chosen_set_id,
    'left', v_left_stimulus_json,
    'right', v_right_stimulus_json,
    'sets_remaining', v_remaining_count
  );

END;$$;




CREATE OR REPLACE FUNCTION "public"."is_valid_participant"("p_session_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.participants 
    WHERE id = p_session_id
  );
END;
$$;




CREATE OR REPLACE FUNCTION "public"."submit_response"("p_session_id" "uuid", "p_trial_id" "uuid", "p_choice" "uuid", "p_frontend_time" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_rows_updated INT;
BEGIN
  -- Validate choice belongs to the trial
  IF p_choice IS NOT NULL AND p_choice NOT IN (
    SELECT s.id
    FROM stimuli s
    JOIN responses r ON s.set_id = r.set_id
    WHERE r.id = p_trial_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stimulus does not belong to this question');
  END IF;

  -- Validate time
  IF p_frontend_time IS NULL OR p_frontend_time <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time duration');
  END IF;

  -- Update only if still pending
  UPDATE responses
  SET
    selected_stimulus = p_choice,
    time_taken = p_frontend_time,
    completed_at = NOW()
  WHERE
    id = p_trial_id
    AND session_id = p_session_id
    AND completed_at IS NULL
    AND time_taken IS NULL
    AND selected_stimulus IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial not found or already completed');
  ELSE
    RETURN jsonb_build_object('success', true);
  END IF;
END;$$;




CREATE OR REPLACE FUNCTION "public"."upsert_ai_stats"("target_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'temp'
    AS $$BEGIN
  INSERT INTO public.ai_stats (
    session_id, 
    category, 
    total_questions, 
    correct_answers, 
    accuracy_percentage, 
    average_time
  )
  SELECT
    r.session_id,
    st.category,  -- Get the category from the Sets table
    COUNT(*) AS total_questions,
    COUNT(*) FILTER (WHERE s.is_deceptive = TRUE) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE s.is_deceptive = TRUE)::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage,
    AVG(r.time_taken) AS average_time
  FROM responses r
  -- Join 1: To check correctness
  LEFT OUTER JOIN stimuli s ON r.selected_stimulus = s.id
  -- Join 2: To get the category
  LEFT OUTER JOIN sets st ON r.set_id = st.id
  WHERE r.session_id = target_uuid
  GROUP BY r.session_id, st.category
  -- Upsert based on the composite key of User + Category
  ON CONFLICT (session_id, category) 
  DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_answers = EXCLUDED.correct_answers,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    average_time = EXCLUDED.average_time;
END;$$;




CREATE OR REPLACE FUNCTION "public"."upsert_participant_stats"("target_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'temp'
    AS $$BEGIN
  IF (SELECT is_ai FROM public.participants WHERE id = target_uuid) THEN
        PERFORM public.upsert_ai_stats(target_uuid);
        RETURN; -- Exit this function so the human upsert doesn't run
  END IF;

  INSERT INTO public.participant_stats (
    session_id, 
    category, 
    total_questions, 
    correct_answers, 
    accuracy_percentage, 
    average_time
  )
  SELECT
    r.session_id,
    st.category,  -- Get the category from the Sets table
    COUNT(*) AS total_questions,
    COUNT(*) FILTER (WHERE s.is_deceptive = TRUE) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE s.is_deceptive = TRUE)::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage,
    AVG(r.time_taken) AS average_time
  FROM responses r
  -- Join 1: To check correctness
  LEFT OUTER JOIN stimuli s ON r.selected_stimulus = s.id
  -- Join 2: To get the category
  LEFT OUTER JOIN sets st ON r.set_id = st.id
  WHERE r.session_id = target_uuid
  GROUP BY r.session_id, st.category
  -- Upsert based on the composite key of User + Category
  ON CONFLICT (session_id, category) 
  DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_answers = EXCLUDED.correct_answers,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    average_time = EXCLUDED.average_time;
END;$$;



SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT gen_random_uuid() PRIMARY KEY,
    "email" "text" UNIQUE NOT NULL,
    "password_hash" "text" NOT NULL
);




CREATE TABLE IF NOT EXISTS "public"."ai_stats" (
    "session_id" "uuid" NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "accuracy_percentage" double precision NOT NULL,
    "average_time" integer,
    "category" "text" NOT NULL
);




CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_ai" boolean DEFAULT false NOT NULL,
    "category" "text" DEFAULT 'human'::"text" NOT NULL,
    "demographics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);




CREATE OR REPLACE VIEW "public"."ai_category_benchmarks" WITH ("security_invoker"='on') AS
 SELECT "s"."category",
    "round"(("avg"("s"."accuracy_percentage"))::numeric, 1) AS "global_accuracy",
    "round"("avg"("s"."average_time"), 2) AS "global_time",
    "count"(DISTINCT "s"."session_id") AS "total_participants"
   FROM ("public"."ai_stats" "s"
     JOIN "public"."participants" "p" ON (("s"."session_id" = "p"."id")))
  WHERE ("p"."is_ai" = true)
  GROUP BY "s"."category";




CREATE TABLE IF NOT EXISTS "public"."responses" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "set_id" "uuid" NOT NULL,
    "selected_stimulus" "uuid",
    "left_stimulus" "uuid" NOT NULL,
    "right_stimulus" "uuid" NOT NULL,
    "completed_at" timestamp without time zone,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "time_taken" integer
);




CREATE TABLE IF NOT EXISTS "public"."sets" (
    "name" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "category" "text"
);




CREATE TABLE IF NOT EXISTS "public"."stimuli" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "set_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "is_deceptive" boolean NOT NULL,
    "name" "text"
);




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
     LEFT JOIN ( SELECT "res"."created_at",
            "res"."session_id",
            "res"."set_id",
            "res"."selected_stimulus",
            "res"."left_stimulus",
            "res"."right_stimulus",
            "res"."completed_at",
            "res"."id",
            "res"."started_at",
            "res"."time_taken"
           FROM ("public"."responses" "res"
             JOIN "public"."participants" "p" ON (("p"."id" = "res"."session_id")))
          WHERE ("p"."is_ai" = false)) "r" ON ((("r"."set_id" = "pp"."set_id") AND ((("r"."left_stimulus" = "pp"."honest_id") AND ("r"."right_stimulus" = "pp"."deceptive_id")) OR (("r"."left_stimulus" = "pp"."deceptive_id") AND ("r"."right_stimulus" = "pp"."honest_id"))))))
  GROUP BY "pp"."set_id", "pp"."set_name", "pp"."honest_id", "pp"."honest_name", "pp"."honest_url", "pp"."deceptive_id", "pp"."deceptive_name", "pp"."deceptive_url"
  ORDER BY "pp"."set_id", "pp"."honest_name", "pp"."deceptive_name";




CREATE TABLE IF NOT EXISTS "public"."participant_stats" (
    "session_id" "uuid" NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "accuracy_percentage" double precision NOT NULL,
    "average_time" integer,
    "category" "text" NOT NULL
);




CREATE OR REPLACE VIEW "public"."participant_category_benchmarks" WITH ("security_invoker"='on') AS
 SELECT "s"."category",
    "round"(("avg"("s"."accuracy_percentage"))::numeric, 1) AS "global_accuracy",
    "round"("avg"("s"."average_time"), 2) AS "global_time",
    "count"(DISTINCT "s"."session_id") AS "total_participants"
   FROM ("public"."participant_stats" "s"
     JOIN "public"."participants" "p" ON (("s"."session_id" = "p"."id")))
  WHERE ("p"."is_ai" = false)
  GROUP BY "s"."category";






ALTER TABLE ONLY "public"."ai_stats"
    ADD CONSTRAINT "ai_stats_pkey" PRIMARY KEY ("session_id", "category");



ALTER TABLE ONLY "public"."participant_stats"
    ADD CONSTRAINT "participant_stats_pkey" PRIMARY KEY ("session_id", "category");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stimuli"
    ADD CONSTRAINT "stimuli_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "unique_session_set" UNIQUE ("session_id", "set_id");



CREATE OR REPLACE TRIGGER "cleanup_sets_after_change" AFTER DELETE OR UPDATE OF "set_id" ON "public"."stimuli" FOR EACH ROW EXECUTE FUNCTION "public"."delete_empty_set_cleanup"();





ALTER TABLE ONLY "public"."ai_stats"
    ADD CONSTRAINT "ai_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."participants"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participant_stats"
    ADD CONSTRAINT "participant_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."participants"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_left_stimulus_fkey" FOREIGN KEY ("left_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_right_stimulus_fkey" FOREIGN KEY ("right_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_selected_stimulus_fkey" FOREIGN KEY ("selected_stimulus") REFERENCES "public"."stimuli"("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id");



ALTER TABLE ONLY "public"."stimuli"
    ADD CONSTRAINT "stimuli_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id");


