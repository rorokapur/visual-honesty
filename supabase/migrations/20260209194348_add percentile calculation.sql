
  create table "public"."participant_stats" (
    "session_id" uuid not null,
    "total_questions" integer not null,
    "correct_answers" integer not null,
    "accuracy_percentage" double precision not null
      );


alter table "public"."participant_stats" enable row level security;

CREATE UNIQUE INDEX participant_stats_pkey ON public.participant_stats USING btree (session_id);

alter table "public"."participant_stats" add constraint "participant_stats_pkey" PRIMARY KEY using index "participant_stats_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.upsert_participant_stats(target_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  tq int;
  ca int;
  ap float;
BEGIN
  -- 1. Calculate stats using JOIN to check 'is_deceptive' directly
  SELECT
    COUNT(*) AS total_questions,
    -- Replaced 'r.is_correct' with 's.is_deceptive' logic
    COUNT(*) FILTER (WHERE s.is_deceptive = TRUE) AS correct_answers,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE s.is_deceptive = TRUE)::float / COUNT(*)) * 100 
      ELSE 0 
    END AS accuracy_percentage
  INTO tq, ca, ap
  FROM responses r
  JOIN stimuli s ON r.selected_stimulus = s.id
  WHERE r.session_id = target_uuid;

  -- 2. Upsert into summary table (Unchanged)
  INSERT INTO public.participant_stats (session_id, total_questions, correct_answers, accuracy_percentage)
  VALUES (target_uuid, tq, ca, ap)
  ON CONFLICT (session_id) DO UPDATE
    SET total_questions = EXCLUDED.total_questions,
        correct_answers = EXCLUDED.correct_answers,
        accuracy_percentage = EXCLUDED.accuracy_percentage;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_results(target_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  stats RECORD;
  percentile float;
  total int;
BEGIN
  -- 1. Update stats for this participant
  PERFORM public.upsert_participant_stats(target_uuid);

  -- 2. Fetch their stats
  SELECT * INTO stats FROM public.participant_stats WHERE session_id = target_uuid;

  -- 3. Calculate percentile
  SELECT
    ROUND(COUNT(*) FILTER (WHERE accuracy_percentage <= stats.accuracy_percentage)::float
      / NULLIF(COUNT(*), 0) * 100)
  INTO percentile
  FROM public.participant_stats;

  -- 4. Return as JSON
  RETURN json_build_object(
    'total_questions', stats.total_questions,
    'correct_answers', stats.correct_answers,
    'accuracy_percentage', stats.accuracy_percentage,
    'percentile', COALESCE(percentile, 0)
  );
END;$function$
;

grant delete on table "public"."participant_stats" to "anon";

grant insert on table "public"."participant_stats" to "anon";

grant references on table "public"."participant_stats" to "anon";

grant select on table "public"."participant_stats" to "anon";

grant trigger on table "public"."participant_stats" to "anon";

grant truncate on table "public"."participant_stats" to "anon";

grant update on table "public"."participant_stats" to "anon";

grant delete on table "public"."participant_stats" to "authenticated";

grant insert on table "public"."participant_stats" to "authenticated";

grant references on table "public"."participant_stats" to "authenticated";

grant select on table "public"."participant_stats" to "authenticated";

grant trigger on table "public"."participant_stats" to "authenticated";

grant truncate on table "public"."participant_stats" to "authenticated";

grant update on table "public"."participant_stats" to "authenticated";

grant delete on table "public"."participant_stats" to "postgres";

grant insert on table "public"."participant_stats" to "postgres";

grant references on table "public"."participant_stats" to "postgres";

grant select on table "public"."participant_stats" to "postgres";

grant trigger on table "public"."participant_stats" to "postgres";

grant truncate on table "public"."participant_stats" to "postgres";

grant update on table "public"."participant_stats" to "postgres";

grant delete on table "public"."participant_stats" to "service_role";

grant insert on table "public"."participant_stats" to "service_role";

grant references on table "public"."participant_stats" to "service_role";

grant select on table "public"."participant_stats" to "service_role";

grant trigger on table "public"."participant_stats" to "service_role";

grant truncate on table "public"."participant_stats" to "service_role";

grant update on table "public"."participant_stats" to "service_role";


