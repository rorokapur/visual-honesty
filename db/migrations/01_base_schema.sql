SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS "public"."categories" (
    "name" "text" PRIMARY KEY,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() PRIMARY KEY,
    "name" "text" NOT NULL UNIQUE,
    "enabled" boolean DEFAULT true NOT NULL,
    "category" "text" REFERENCES "public"."categories"("name") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "public"."stimuli" (
    "id" "uuid" DEFAULT "gen_random_uuid"() PRIMARY KEY,
    "set_id" "uuid" NOT NULL REFERENCES "public"."sets"("id"),
    "image_url" "text" NOT NULL,
    "is_deceptive" boolean NOT NULL,
    "name" "text"
);

CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT gen_random_uuid() PRIMARY KEY,
    "email" "text" UNIQUE NOT NULL,
    "password_hash" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'human'::"text" NOT NULL,
    "demographics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" NOT NULL REFERENCES "public"."participants"("id") ON DELETE CASCADE,
    "set_id" "uuid" NOT NULL REFERENCES "public"."sets"("id"),
    "trial_type" text NOT NULL DEFAULT 'pair' CHECK (trial_type IN ('single', 'pair')),
    "single_stimulus" "uuid" REFERENCES "public"."stimuli"("id"),
    "left_stimulus" "uuid" REFERENCES "public"."stimuli"("id"),
    "right_stimulus" "uuid" REFERENCES "public"."stimuli"("id"),
    "selected_stimulus" "uuid" REFERENCES "public"."stimuli"("id"),
    "selected_verdict" boolean, -- true if selected stimulus is deceptive
    "started_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp without time zone,
    "time_taken" integer,
    CONSTRAINT "unique_session_set" UNIQUE ("session_id", "set_id")
);

CREATE TABLE IF NOT EXISTS "public"."participant_stats" (
    "session_id" "uuid" NOT NULL REFERENCES "public"."participants"("id") ON UPDATE CASCADE ON DELETE CASCADE,
    "category" "text" NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "accuracy_percentage" double precision NOT NULL,
    "average_time" integer,
    PRIMARY KEY ("session_id", "category")
);

-- ==========================================
-- VIEWS
-- ==========================================

CREATE OR REPLACE VIEW "public"."participant_category_benchmarks" WITH ("security_invoker"='on') AS
 SELECT "s"."category",
    "round"(("avg"("s"."accuracy_percentage"))::numeric, 1) AS "global_accuracy",
    "round"("avg"("s"."average_time"), 2) AS "global_time",
    "count"(DISTINCT "s"."session_id") AS "total_participants"
   FROM ("public"."participant_stats" "s"
     JOIN "public"."participants" "p" ON (("s"."session_id" = "p"."id")))
  WHERE ("p"."category" != 'ai')
  GROUP BY "s"."category";

CREATE OR REPLACE VIEW "public"."ai_category_benchmarks" WITH ("security_invoker"='on') AS
 SELECT "s"."category",
    "round"(("avg"("s"."accuracy_percentage"))::numeric, 1) AS "global_accuracy",
    "round"("avg"("s"."average_time"), 2) AS "global_time",
    "count"(DISTINCT "s"."session_id") AS "total_participants"
   FROM ("public"."participant_stats" "s"
     JOIN "public"."participants" "p" ON (("s"."session_id" = "p"."id")))
  WHERE ("p"."category" = 'ai')
  GROUP BY "s"."category";

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
     LEFT JOIN ( SELECT "res"."session_id", "res"."set_id", "res"."selected_stimulus", "res"."left_stimulus", "res"."right_stimulus"
           FROM ("public"."responses" "res"
             JOIN "public"."participants" "p" ON (("p"."id" = "res"."session_id")))
          WHERE ("p"."category" != 'ai' AND "res"."trial_type" = 'pair')) "r" 
          ON ((("r"."set_id" = "pp"."set_id") AND ((("r"."left_stimulus" = "pp"."honest_id") AND ("r"."right_stimulus" = "pp"."deceptive_id")) OR (("r"."left_stimulus" = "pp"."deceptive_id") AND ("r"."right_stimulus" = "pp"."honest_id"))))))
  GROUP BY "pp"."set_id", "pp"."set_name", "pp"."honest_id", "pp"."honest_name", "pp"."honest_url", "pp"."deceptive_id", "pp"."deceptive_name", "pp"."deceptive_url"
  ORDER BY "pp"."set_id", "pp"."honest_name", "pp"."deceptive_name";

CREATE OR REPLACE VIEW "public"."single_stats" WITH ("security_invoker"='on') AS
 SELECT "s"."set_id",
    "st"."name" AS "set_name",
    "s"."id" AS "stimulus_id",
    "s"."name" AS "stimulus_name",
    "s"."image_url",
    "s"."is_deceptive",
    "count"("r"."session_id") AS "total_responses",
    "count"("r"."session_id") FILTER (WHERE ("r"."selected_verdict" = "s"."is_deceptive")) AS "correct_count",
        CASE
            WHEN ("count"("r"."session_id") > 0) THEN "round"(((("count"("r"."session_id") FILTER (WHERE ("r"."selected_verdict" = "s"."is_deceptive")))::numeric / ("count"("r"."session_id"))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "accuracy_percent"
   FROM ("public"."stimuli" "s"
     JOIN "public"."sets" "st" ON ("s"."set_id" = "st"."id")
     LEFT JOIN ( SELECT "res"."session_id", "res"."set_id", "res"."single_stimulus", "res"."selected_verdict"
           FROM ("public"."responses" "res"
             JOIN "public"."participants" "p" ON ("p"."id" = "res"."session_id"))
          WHERE ("p"."category" != 'ai' AND "res"."trial_type" = 'single')) "r" 
          ON ("r"."single_stimulus" = "s"."id"))
  GROUP BY "s"."set_id", "st"."name", "s"."id", "s"."name", "s"."image_url", "s"."is_deceptive"
  ORDER BY "s"."set_id", "s"."name";

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION "public"."delete_empty_set_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.set_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM stimuli WHERE set_id = OLD.set_id
  ) THEN
    DELETE FROM sets WHERE id = OLD.set_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "cleanup_sets_after_change" 
  AFTER DELETE OR UPDATE OF "set_id" ON "public"."stimuli" 
  FOR EACH ROW EXECUTE FUNCTION "public"."delete_empty_set_cleanup"();

CREATE OR REPLACE FUNCTION "public"."add_stimulus"("p_set_name" "text", "p_image_url" "text", "p_is_deceptive" boolean, "p_name" "text", "p_category" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_set_id UUID;
BEGIN
  WITH s AS (
      INSERT INTO public.sets (name, category) VALUES (p_set_name, p_category)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
  )
  SELECT id INTO v_set_id FROM s
  UNION ALL
  SELECT id FROM public.sets WHERE name = p_set_name
  LIMIT 1;

  INSERT INTO public.stimuli (image_url, set_id, is_deceptive, name)
  VALUES (p_image_url, v_set_id, p_is_deceptive, p_name);
END;$$;

CREATE OR REPLACE FUNCTION "public"."create_participant"("p_category" "text" DEFAULT 'human'::"text", "p_demographics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_id uuid;
BEGIN
  INSERT INTO public.participants (category, demographics)
  VALUES (p_category, p_demographics)
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."is_valid_participant"("p_session_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.participants WHERE id = p_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."upsert_participant_stats"("target_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'temp'
    AS $$BEGIN
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
    st.category,  
    COUNT(*) AS total_questions,
    COUNT(*) FILTER (
      WHERE (r.trial_type = 'pair' AND s.is_deceptive = TRUE)
         OR (r.trial_type = 'single' AND r.selected_verdict = s.is_deceptive)
    ) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (
        WHERE (r.trial_type = 'pair' AND s.is_deceptive = TRUE)
           OR (r.trial_type = 'single' AND r.selected_verdict = s.is_deceptive)
      )::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage,
    AVG(r.time_taken) AS average_time
  FROM responses r
  LEFT OUTER JOIN stimuli s ON COALESCE(r.selected_stimulus, r.single_stimulus) = s.id
  LEFT OUTER JOIN sets st ON r.set_id = st.id
  WHERE r.session_id = target_uuid AND r.completed_at IS NOT NULL
  GROUP BY r.session_id, st.category
  ON CONFLICT (session_id, category) 
  DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_answers = EXCLUDED.correct_answers,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    average_time = EXCLUDED.average_time;
END;$$;

CREATE OR REPLACE FUNCTION "public"."get_participant_category_comparison"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  result_json json;
BEGIN
  PERFORM public.upsert_participant_stats(target_uuid);

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
  LEFT OUTER JOIN participant_category_benchmarks g1 ON p.category = g1.category
  LEFT OUTER JOIN ai_category_benchmarks g2 ON p.category = g2.category
  WHERE p.session_id = target_uuid;

  RETURN COALESCE(result_json, '[]'::json);
END;$$;

CREATE OR REPLACE FUNCTION "public"."get_participant_results"("target_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  user_total_q int;
  user_correct_a int;
  user_overall_acc float;
  user_avg_time float;
  calc_percentile float;
  total_users int;
  v_user_category text;
BEGIN
  SELECT category INTO v_user_category FROM public.participants WHERE id = target_uuid;
  
  PERFORM public.upsert_participant_stats(target_uuid);

  SELECT
    SUM(total_questions),
    SUM(correct_answers),
    CASE 
      WHEN SUM(total_questions) > 0 
      THEN ROUND((SUM(correct_answers)::float / SUM(total_questions)) * 100)
      ELSE 0 
    END,
    AVG(average_time)
  INTO 
    user_total_q, 
    user_correct_a, 
    user_overall_acc, 
    user_avg_time
  FROM public.participant_stats 
  WHERE session_id = target_uuid;

  WITH participant_scores AS (
    SELECT 
      s.session_id,
      CASE 
        WHEN SUM(s.total_questions) > 0 
        THEN (SUM(s.correct_answers)::float / SUM(s.total_questions)) * 100 
        ELSE 0 
      END as overall_acc
    FROM public.participant_stats s
    JOIN public.participants p ON s.session_id = p.id
    WHERE p.category = v_user_category
    GROUP BY s.session_id
  )
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE overall_acc <= user_overall_acc)::float / NULLIF(COUNT(*), 0)) * 100
    ),
    COUNT(*) - 1
  INTO calc_percentile, total_users
  FROM participant_scores;

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
  WITH user_stats AS (
      SELECT 
        AVG(s.average_time) as x, 
        SUM(s.correct_answers)::float / NULLIF(SUM(s.total_questions), 0) * 100 as y
      FROM participant_stats s
      JOIN participants p ON s.session_id = p.id
      WHERE p.category != 'ai'
      GROUP BY s.session_id
  ),
  ranked_data AS (
      SELECT 
        x, y,
        ntile(10) OVER (ORDER BY x) as bucket
      FROM user_stats
  ),
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

CREATE OR REPLACE FUNCTION "public"."get_random_unseen_trial"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_valid_set_ids UUID[];
  v_remaining_count INT;
  v_chosen_set_id UUID;
  v_response_id UUID;
  v_trial_type TEXT;

  v_single_stimulus JSONB;
  v_single_stimulus_id UUID;

  v_honest_stimulus JSONB;
  v_deceptive_stimulus JSONB;
  v_left_stimulus_json JSONB;
  v_right_stimulus_json JSONB;
  v_left_stimulus_id UUID;
  v_right_stimulus_id UUID;
  v_random_flip FLOAT;
  
  v_total_valid_sets INT;
  v_completed_sets INT;
BEGIN
  SELECT id, set_id, trial_type 
  INTO v_response_id, v_chosen_set_id, v_trial_type
  FROM responses
  WHERE session_id = p_session_id 
  AND completed_at IS NULL
  LIMIT 1;

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

    v_chosen_set_id := v_valid_set_ids[1 + floor(random() * v_remaining_count)::int];
    
    SELECT COUNT(id) INTO v_total_valid_sets
    FROM sets s
    WHERE s.enabled IS TRUE
    AND EXISTS (SELECT 1 FROM stimuli WHERE set_id = s.id AND is_deceptive IS TRUE)
    AND EXISTS (SELECT 1 FROM stimuli WHERE set_id = s.id AND is_deceptive IS FALSE);

    SELECT COUNT(DISTINCT set_id) INTO v_completed_sets
    FROM responses
    WHERE session_id = p_session_id AND completed_at IS NOT NULL;

    IF v_completed_sets < (v_total_valid_sets / 2.0) THEN
      v_trial_type := 'pair';
    ELSE
      v_trial_type := 'single';
    END IF;
  END IF;

  IF v_trial_type = 'single' THEN
    SELECT to_jsonb(t) INTO v_single_stimulus
    FROM (
      SELECT id, image_url 
      FROM stimuli 
      WHERE set_id = v_chosen_set_id
      ORDER BY random() 
      LIMIT 1
    ) t;

    v_single_stimulus_id := (v_single_stimulus->>'id')::UUID;

    IF v_response_id IS NOT NULL THEN
      UPDATE responses 
      SET started_at = NOW(), single_stimulus = v_single_stimulus_id
      WHERE id = v_response_id;
      
      SELECT count(*) INTO v_remaining_count
      FROM sets s
      WHERE NOT EXISTS (
        SELECT 1 FROM responses r 
        WHERE r.session_id = p_session_id AND r.set_id = s.id AND r.completed_at IS NOT NULL
      )
      AND s.enabled IS TRUE;
    ELSE
      INSERT INTO responses (
        session_id, set_id, trial_type, started_at, single_stimulus
      )
      VALUES (
        p_session_id, v_chosen_set_id, 'single', NOW(), v_single_stimulus_id
      )
      RETURNING id INTO v_response_id;
    END IF;

    RETURN jsonb_build_object(
      'trial_id', v_response_id,
      'set_id', v_chosen_set_id,
      'trial_type', 'single',
      'stimulus', v_single_stimulus,
      'sets_remaining', v_remaining_count
    );
  ELSE
    SELECT to_jsonb(t) INTO v_honest_stimulus
    FROM (
      SELECT id, image_url 
      FROM stimuli 
      WHERE set_id = v_chosen_set_id AND is_deceptive IS FALSE 
      ORDER BY random() 
      LIMIT 1
    ) t;

    SELECT to_jsonb(t) INTO v_deceptive_stimulus
    FROM (
      SELECT id, image_url 
      FROM stimuli 
      WHERE set_id = v_chosen_set_id AND is_deceptive IS TRUE 
      ORDER BY random() 
      LIMIT 1
    ) t;

    v_random_flip := random();

    IF v_random_flip < 0.5 THEN
      v_left_stimulus_json := v_honest_stimulus;
      v_right_stimulus_json := v_deceptive_stimulus;
    ELSE
      v_left_stimulus_json := v_deceptive_stimulus;
      v_right_stimulus_json := v_honest_stimulus;
    END IF;

    v_left_stimulus_id := (v_left_stimulus_json->>'id')::UUID;
    v_right_stimulus_id := (v_right_stimulus_json->>'id')::UUID;

    IF v_response_id IS NOT NULL THEN
      UPDATE responses 
      SET started_at = NOW(),
          left_stimulus = v_left_stimulus_id,
          right_stimulus = v_right_stimulus_id
      WHERE id = v_response_id;
      
      SELECT count(*) INTO v_remaining_count
      FROM sets s
      WHERE NOT EXISTS (
        SELECT 1 FROM responses r 
        WHERE r.session_id = p_session_id AND r.set_id = s.id AND r.completed_at IS NOT NULL
      )
      AND s.enabled IS TRUE;
    ELSE
      INSERT INTO responses (
        session_id, set_id, trial_type, started_at, left_stimulus, right_stimulus
      )
      VALUES (
        p_session_id, v_chosen_set_id, 'pair', NOW(), v_left_stimulus_id, v_right_stimulus_id
      )
      RETURNING id INTO v_response_id;
    END IF;

    RETURN jsonb_build_object(
      'trial_id', v_response_id,
      'set_id', v_chosen_set_id,
      'trial_type', 'pair',
      'left', v_left_stimulus_json,
      'right', v_right_stimulus_json,
      'sets_remaining', v_remaining_count
    );
  END IF;
END;$$;

CREATE OR REPLACE FUNCTION "public"."submit_response"(
  "p_session_id" "uuid", 
  "p_trial_id" "uuid", 
  "p_choice" "uuid" DEFAULT NULL,
  "p_verdict" boolean DEFAULT NULL,
  "p_frontend_time" integer DEFAULT 0
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated INT;
  v_trial_type TEXT;
BEGIN
  SELECT trial_type INTO v_trial_type FROM responses WHERE id = p_trial_id AND session_id = p_session_id AND completed_at IS NULL;
  IF v_trial_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial not found or already completed');
  END IF;

  IF v_trial_type = 'pair' THEN
    IF p_choice IS NOT NULL AND p_choice NOT IN (
      SELECT left_stimulus FROM responses WHERE id = p_trial_id
      UNION ALL
      SELECT right_stimulus FROM responses WHERE id = p_trial_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stimulus does not belong to this question');
    END IF;
  END IF;

  IF p_frontend_time IS NULL OR p_frontend_time <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time duration');
  END IF;

  UPDATE responses
  SET
    selected_stimulus = CASE WHEN v_trial_type = 'pair' THEN p_choice ELSE selected_stimulus END,
    selected_verdict = CASE WHEN v_trial_type = 'single' THEN p_verdict ELSE selected_verdict END,
    time_taken = p_frontend_time,
    completed_at = NOW()
  WHERE
    id = p_trial_id
    AND session_id = p_session_id
    AND completed_at IS NULL
    AND time_taken IS NULL;
    
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update trial');
  ELSE
    RETURN jsonb_build_object('success', true);
  END IF;
END;
$$;
