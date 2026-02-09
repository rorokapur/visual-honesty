set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.upsert_participant_stats(target_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
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

grant delete on table "public"."participant_stats" to "postgres";

grant insert on table "public"."participant_stats" to "postgres";

grant references on table "public"."participant_stats" to "postgres";

grant select on table "public"."participant_stats" to "postgres";

grant trigger on table "public"."participant_stats" to "postgres";

grant truncate on table "public"."participant_stats" to "postgres";

grant update on table "public"."participant_stats" to "postgres";


