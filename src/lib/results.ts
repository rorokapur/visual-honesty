import { getSupabaseAdmin } from "./supabase";

export interface ParticipantResults {
  /** Total number of questions answered by participant across all sessions */
  total_questions: number;

  /** Total number of corrent answers by participant across all sessions */
  correct_answers: number;

  /** Percentage of all questions answered correctly by participant */
  accuracy_percentage: number;
}

export const fetchResults = async (session: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_participant_results", {
    target_uuid: session,
  });

  if (error) {
    throw error;
  }
  return data as ParticipantResults;
};
