alter table "public"."participant_stats" drop constraint "participant_stats_pkey";

drop index if exists "public"."participant_stats_pkey";

alter table "public"."participant_stats" add column "category" text not null;

CREATE UNIQUE INDEX participant_stats_pkey ON public.participant_stats USING btree (session_id, category);

alter table "public"."participant_stats" add constraint "participant_stats_pkey" PRIMARY KEY using index "participant_stats_pkey";

set check_function_bodies = off;

create or replace view "public"."category_benchmarks" as  SELECT category,
    round((avg(accuracy_percentage))::numeric, 1) AS global_accuracy,
    round(avg(average_time), 2) AS global_time,
    count(*) AS total_participants
   FROM public.participant_stats
  GROUP BY category;


CREATE OR REPLACE FUNCTION public.get_participant_category_comparison(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  result_json json;
BEGIN
  -- 1. Update stats for this participant first (Just like in your reference code)
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
BEGIN
  -- 1. Update stats for this participant (Ensure this calls your new category-aware function)
  PERFORM public.upsert_participant_stats(target_uuid);

  -- 2. AGGREGATE the target user's stats across ALL their categories
  SELECT
    SUM(total_questions),
    SUM(correct_answers),
    -- Calculate True Overall Accuracy: (Total Correct / Total Questions) * 100
    CASE 
      WHEN SUM(total_questions) > 0 
      THEN (SUM(correct_answers)::float / SUM(total_questions)) * 100 
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

  -- 3. Calculate Percentile: Compare User's Overall Acc vs. Everyone Else's Overall Acc
  -- We use a CTE to first calculate the "Overall Score" for every single user
  WITH all_user_scores AS (
    SELECT 
      session_id,
      CASE 
        WHEN SUM(total_questions) > 0 
        THEN (SUM(correct_answers)::float / SUM(total_questions)) * 100 
        ELSE 0 
      END as overall_acc
    FROM public.participant_stats
    GROUP BY session_id
  )
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE overall_acc <= user_overall_acc)::float / NULLIF(COUNT(*), 0)) * 100
    )
  INTO calc_percentile
  FROM all_user_scores;

  -- 4. Return as JSON
  RETURN json_build_object(
    'total_questions', COALESCE(user_total_q, 0),
    'correct_answers', COALESCE(user_correct_a, 0),
    'accuracy_percentage', COALESCE(user_overall_acc, 0),
    'percentile', COALESCE(calc_percentile, 0),
    'average_time', COALESCE(user_avg_time, 0)
  );
END;$function$
;

CREATE OR REPLACE FUNCTION public.upsert_participant_stats(target_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$BEGIN
  -- Perform the calculation and upsert in a single efficient query
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
    -- Keep your original logic: counting where the selected stimulus was deceptive
    COUNT(*) FILTER (WHERE s.is_deceptive = TRUE) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE s.is_deceptive = TRUE)::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage,
    AVG(r.time_taken) AS average_time
  FROM responses r
  -- Join 1: To check correctness (based on your original code)
  JOIN stimuli s ON r.selected_stimulus = s.id
  -- Join 2: To get the category (based on your request)
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


