set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_ai_results(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.create_ai_participant(p_category text, p_demographics jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: User is not an authorized administrator.';
  END IF;

  -- is_ai is hardcoded to false here, ignoring any frontend input
  INSERT INTO public.participants (is_ai, category, demographics)
  VALUES (true, p_category, p_demographics)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;$function$
;

CREATE OR REPLACE FUNCTION public.create_participant(p_category text DEFAULT 'human'::text, p_demographics jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id uuid;
BEGIN
  -- is_ai is hardcoded to false here, ignoring any frontend input
  INSERT INTO public.participants (is_ai, category, demographics)
  VALUES (false, p_category, p_demographics)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_binned_benchmarks()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_category_comparison(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_results(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_participant(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.participants 
    WHERE id = p_session_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_ai_stats(target_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$BEGIN
  -- Perform the calculation and upsert in a single efficient query
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
    -- Keep your original logic: counting where the selected stimulus was deceptive
    COUNT(*) FILTER (WHERE s.is_deceptive = TRUE) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE s.is_deceptive = TRUE)::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage,
    AVG(r.time_taken) AS average_time
  FROM responses r
  -- Join 1: To check correctness
  JOIN stimuli s ON r.selected_stimulus = s.id
  -- Join 2: To get the category
  JOIN sets st ON r.set_id = st.id
  WHERE r.session_id = target_uuid
  GROUP BY r.session_id, st.category
  -- Upsert based on the composite key of User + Category
  ON CONFLICT (session_id, category) 
  DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_answers = EXCLUDED.correct_answers,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    average_time = EXCLUDED.average_time;
END;$function$
;

grant delete on table "public"."ai_stats" to "postgres";

grant insert on table "public"."ai_stats" to "postgres";

grant references on table "public"."ai_stats" to "postgres";

grant select on table "public"."ai_stats" to "postgres";

grant trigger on table "public"."ai_stats" to "postgres";

grant truncate on table "public"."ai_stats" to "postgres";

grant update on table "public"."ai_stats" to "postgres";

grant delete on table "public"."participants" to "postgres";

grant insert on table "public"."participants" to "postgres";

grant references on table "public"."participants" to "postgres";

grant select on table "public"."participants" to "postgres";

grant trigger on table "public"."participants" to "postgres";

grant truncate on table "public"."participants" to "postgres";

grant update on table "public"."participants" to "postgres";


