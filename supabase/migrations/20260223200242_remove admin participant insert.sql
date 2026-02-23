drop policy "admins can insert participants" on "public"."participants";

set check_function_bodies = off;

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
AS $function$
DECLARE
  v_bins json;
BEGIN
  -- A. Aggregate stats per session (exclude AI)
  WITH user_stats AS (
      SELECT 
        AVG(s.average_time) as x, 
        SUM(s.correct_answers)::float / NULLIF(SUM(s.total_questions), 0) * 100 as y
      FROM participant_stats s
      JOIN participants p ON s.session_id = p.id
      WHERE p.is_ai = false
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
END;
$function$
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
        'average', g.global_accuracy
      )
    )
  INTO result_json
  FROM participant_stats p
  -- Join with the global view to get the averages
  JOIN category_benchmarks g ON p.category = g.category
  WHERE p.session_id = target_uuid;

  -- 3. Return the array (or an empty array [] if no stats exist yet)
  RETURN COALESCE(result_json, '[]'::json);
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

grant delete on table "public"."participants" to "postgres";

grant insert on table "public"."participants" to "postgres";

grant references on table "public"."participants" to "postgres";

grant select on table "public"."participants" to "postgres";

grant trigger on table "public"."participants" to "postgres";

grant truncate on table "public"."participants" to "postgres";

grant update on table "public"."participants" to "postgres";


