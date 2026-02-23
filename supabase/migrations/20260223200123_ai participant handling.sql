
  create table "public"."participants" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "is_ai" boolean not null default false,
    "category" text not null default 'human'::text,
    "demographics" jsonb not null default '{}'::jsonb
      );


alter table "public"."participants" enable row level security;

CREATE UNIQUE INDEX participants_pkey ON public.participants USING btree (id);

alter table "public"."participants" add constraint "participants_pkey" PRIMARY KEY using index "participants_pkey";

alter table "public"."participant_stats" add constraint "participant_stats_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."participant_stats" validate constraint "participant_stats_session_id_fkey";

alter table "public"."responses" add constraint "responses_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.participants(id) ON DELETE CASCADE not valid;

alter table "public"."responses" validate constraint "responses_session_id_fkey";

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

create or replace view "public"."category_benchmarks" as  SELECT s.category,
    round((avg(s.accuracy_percentage))::numeric, 1) AS global_accuracy,
    round(avg(s.average_time), 2) AS global_time,
    count(DISTINCT s.session_id) AS total_participants
   FROM (public.participant_stats s
     JOIN public.participants p ON ((s.session_id = p.id)))
  WHERE (p.is_ai = false)
  GROUP BY s.category;


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

CREATE OR REPLACE FUNCTION public.get_participant_results(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
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
  FROM public.participant_stats 
  WHERE session_id = target_uuid;

  -- 3. Calculate Percentile: Compare User's Overall Acc vs. Humans Only
  WITH human_scores AS (
    SELECT 
      s.session_id,
      CASE 
        WHEN SUM(s.total_questions) > 0 
        THEN (SUM(s.correct_answers)::float / SUM(s.total_questions)) * 100 
        ELSE 0 
      END as overall_acc
    FROM public.participant_stats s
    JOIN public.participants p ON s.session_id = p.id
    WHERE p.is_ai = false
    GROUP BY s.session_id
  )
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE overall_acc <= user_overall_acc)::float / NULLIF(COUNT(*), 0)) * 100
    ),
    COUNT(*) - 1
  INTO calc_percentile, total_users
  FROM human_scores;

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

create or replace view "public"."pair_stats" as  WITH possible_pairs AS (
         SELECT s_honest.set_id,
            st.name AS set_name,
            s_honest.id AS honest_id,
            s_honest.name AS honest_name,
            s_honest.image_url AS honest_url,
            s_deceptive.id AS deceptive_id,
            s_deceptive.name AS deceptive_name,
            s_deceptive.image_url AS deceptive_url
           FROM ((public.stimuli s_honest
             JOIN public.sets st ON ((s_honest.set_id = st.id)))
             JOIN public.stimuli s_deceptive ON ((s_honest.set_id = s_deceptive.set_id)))
          WHERE ((s_honest.is_deceptive = false) AND (s_deceptive.is_deceptive = true))
        )
 SELECT pp.set_id,
    pp.set_name,
    pp.honest_id,
    pp.honest_name,
    pp.honest_url,
    pp.deceptive_id,
    pp.deceptive_name,
    pp.deceptive_url,
    count(r.session_id) AS total_responses,
    count(r.session_id) FILTER (WHERE (r.selected_stimulus = pp.deceptive_id)) AS correct_count,
        CASE
            WHEN (count(r.session_id) > 0) THEN round((((count(r.session_id) FILTER (WHERE (r.selected_stimulus = pp.deceptive_id)))::numeric / (count(r.session_id))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS accuracy_percent
   FROM (possible_pairs pp
     LEFT JOIN ( SELECT res.created_at,
            res.session_id,
            res.set_id,
            res.selected_stimulus,
            res.left_stimulus,
            res.right_stimulus,
            res.completed_at,
            res.id,
            res.started_at,
            res.time_taken
           FROM (public.responses res
             JOIN public.participants p ON ((p.id = res.session_id)))
          WHERE (p.is_ai = false)) r ON (((r.set_id = pp.set_id) AND (((r.left_stimulus = pp.honest_id) AND (r.right_stimulus = pp.deceptive_id)) OR ((r.left_stimulus = pp.deceptive_id) AND (r.right_stimulus = pp.honest_id))))))
  GROUP BY pp.set_id, pp.set_name, pp.honest_id, pp.honest_name, pp.honest_url, pp.deceptive_id, pp.deceptive_name, pp.deceptive_url
  ORDER BY pp.set_id, pp.honest_name, pp.deceptive_name;


grant delete on table "public"."participants" to "anon";

grant insert on table "public"."participants" to "anon";

grant references on table "public"."participants" to "anon";

grant select on table "public"."participants" to "anon";

grant trigger on table "public"."participants" to "anon";

grant truncate on table "public"."participants" to "anon";

grant update on table "public"."participants" to "anon";

grant delete on table "public"."participants" to "authenticated";

grant insert on table "public"."participants" to "authenticated";

grant references on table "public"."participants" to "authenticated";

grant select on table "public"."participants" to "authenticated";

grant trigger on table "public"."participants" to "authenticated";

grant truncate on table "public"."participants" to "authenticated";

grant update on table "public"."participants" to "authenticated";

grant delete on table "public"."participants" to "postgres";

grant insert on table "public"."participants" to "postgres";

grant references on table "public"."participants" to "postgres";

grant select on table "public"."participants" to "postgres";

grant trigger on table "public"."participants" to "postgres";

grant truncate on table "public"."participants" to "postgres";

grant update on table "public"."participants" to "postgres";

grant delete on table "public"."participants" to "service_role";

grant insert on table "public"."participants" to "service_role";

grant references on table "public"."participants" to "service_role";

grant select on table "public"."participants" to "service_role";

grant trigger on table "public"."participants" to "service_role";

grant truncate on table "public"."participants" to "service_role";

grant update on table "public"."participants" to "service_role";


  create policy "admins can insert participants"
  on "public"."participants"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = auth.uid()))));



