import { getSupabaseAdmin } from "./supabase";

export interface ParticipantResults {
  /** Total number of questions answered by participant across all sessions */
  total_questions: number;

  /** Total number of corrent answers by participant across all sessions */
  correct_answers: number;

  /** Percentage of all questions answered correctly by participant */
  accuracy_percentage: number;

  /** Inclusive percentile ranking of participant by correct answers */
  percentile: number;

  /** Average time taken to answer trials */
  average_time: number;
}

export interface CategoryStats {
  /** Deception category */
  category: string;

  /** Percentage of correct answers by participant in category */
  user: number;

  /** Average number of correct answers in category over all participants*/
  average: number;
}

export interface TimeAccuracyBenchmarkPoint {
  x: number; // Average Time
  y: number; // Average Accuracy
  range_min: number; // Bottom of the "River"
  range_max: number; // Top of the "River"
  count: number; // Sample size in this bin
}

export interface TimeAccuracyBenchmarkData {
  trend: TimeAccuracyBenchmarkPoint[];
}

/**
 * Gets basic perfomance statistics for a specifed participant
 * @param session - unique id of user to fetch data for
 * @returns Promise<ParticipantResults> for the specified participant
 */
export const fetchResults = async (
  session: string,
): Promise<ParticipantResults> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_participant_results", {
    target_uuid: session,
  });

  if (error) {
    throw error;
  }
  return data as ParticipantResults;
};

export const fetchCategoryStats = async (
  session: string,
): Promise<CategoryStats[]> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "get_participant_category_comparison",
    {
      target_uuid: session,
    },
  );

  if (error) {
    throw error;
  }
  return data as CategoryStats[];
};

export const fetchTimeAccuracyBenchmarks =
  async (): Promise<TimeAccuracyBenchmarkData> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("get_binned_benchmarks");

    if (error) {
      throw error;
    }
    return data as TimeAccuracyBenchmarkData;
  };
