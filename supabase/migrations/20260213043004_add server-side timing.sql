alter table "public"."responses" drop constraint "responses_pkey";

drop index if exists "public"."responses_pkey";

alter table "public"."responses" add column "completed_at" timestamp without time zone;

alter table "public"."responses" add column "id" uuid not null default gen_random_uuid();

alter table "public"."responses" add column "started_at" timestamp without time zone not null default now();

alter table "public"."responses" add column "time_taken" integer;

alter table "public"."responses" alter column "left_stimulus" set not null;

alter table "public"."responses" alter column "right_stimulus" set not null;

alter table "public"."responses" alter column "selected_stimulus" drop not null;

CREATE UNIQUE INDEX unique_session_set ON public.responses USING btree (session_id, set_id);

CREATE UNIQUE INDEX responses_pkey ON public.responses USING btree (id);

alter table "public"."responses" add constraint "responses_pkey" PRIMARY KEY using index "responses_pkey";

alter table "public"."responses" add constraint "unique_session_set" UNIQUE using index "unique_session_set";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.get_random_unseen_pair(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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

END;$function$
;

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


