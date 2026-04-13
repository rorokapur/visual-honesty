-- Redefine submit_response to properly validate stimulus belonging to the specific trial response.
-- This ensures that a user can only submit one of the two stimuli actually presented in that trial ID.

CREATE OR REPLACE FUNCTION "public"."submit_response"(
  "p_session_id" "uuid", 
  "p_trial_id" "uuid", 
  "p_choice" "uuid", 
  "p_frontend_time" integer
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated INT;
BEGIN
  -- 1. Validate choice belongs SPECIFICALLY to that trial record
  -- Check if choice matches either the left_stimulus or the right_stimulus of that specific p_trial_id
  IF p_choice IS NOT NULL AND p_choice NOT IN (
    SELECT left_stimulus FROM responses WHERE id = p_trial_id
    UNION ALL
    SELECT right_stimulus FROM responses WHERE id = p_trial_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stimulus does not belong to this question');
  END IF;

  -- 2. Validate time
  IF p_frontend_time IS NULL OR p_frontend_time <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time duration');
  END IF;

  -- 3. Update only if still pending and matches the session (ensures session isolation)
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
END;
$$;
