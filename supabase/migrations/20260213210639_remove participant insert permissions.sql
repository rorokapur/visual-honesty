drop policy "Participants can insert responses" on "public"."responses";

drop view if exists "public"."pair_stats";

set check_function_bodies = off;

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
     LEFT JOIN public.responses r ON (((r.set_id = pp.set_id) AND (((r.left_stimulus = pp.honest_id) AND (r.right_stimulus = pp.deceptive_id)) OR ((r.left_stimulus = pp.deceptive_id) AND (r.right_stimulus = pp.honest_id))))))
  GROUP BY pp.set_id, pp.set_name, pp.honest_id, pp.honest_name, pp.honest_url, pp.deceptive_id, pp.deceptive_name, pp.deceptive_url
  ORDER BY pp.set_id, pp.honest_name, pp.deceptive_name;


CREATE OR REPLACE FUNCTION public.submit_response(p_session_id uuid, p_trial_id uuid, p_choice uuid, p_frontend_time integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  v_rows_updated INT;
BEGIN
  -- Validate choice belongs to the trial
  IF p_choice NOT IN (
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.upsert_participant_stats(target_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$DECLARE
  tq int;
  ca int;
  ap float;
  at float;
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
    END AS accuracy_percentage,
    AVG(time_taken) AS average_time
  INTO tq, ca, ap, at
  FROM responses r
  JOIN stimuli s ON r.selected_stimulus = s.id
  WHERE r.session_id = target_uuid;

  -- 2. Upsert into summary table
  INSERT INTO public.participant_stats (session_id, total_questions, correct_answers, accuracy_percentage, average_time)
  VALUES (target_uuid, tq, ca, ap, at)
  ON CONFLICT (session_id) DO UPDATE
    SET total_questions = EXCLUDED.total_questions,
        correct_answers = EXCLUDED.correct_answers,
        accuracy_percentage = EXCLUDED.accuracy_percentage,
        average_time = EXCLUDED.average_time;
END;$function$
;

grant delete on table "public"."participant_stats" to "postgres";

grant insert on table "public"."participant_stats" to "postgres";

grant references on table "public"."participant_stats" to "postgres";

grant select on table "public"."participant_stats" to "postgres";

grant trigger on table "public"."participant_stats" to "postgres";

grant truncate on table "public"."participant_stats" to "postgres";

grant update on table "public"."participant_stats" to "postgres";


