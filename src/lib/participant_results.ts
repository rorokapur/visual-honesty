import { supabase } from "./supabase";

export interface ParticipantResults {
  /** Total number of questions answered by participant across all sessions */
  total_questions: number;

  /** Total number of corrent answers by participant across all sessions */
  correct_answers: number;

  /** Percentage of all questions answered correctly by participant */
  accuracy_percentage: number;

  /** Inclusive percentile ranking of participant by correct answers */
  percentile: number;

  /** Total number of participants being compared against */
  total_users: number;

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
  /** Average time for this bin */
  x: number;

  /** Average accuracy for this bin */
  y: number;

  /** One stddev below x */
  range_min: number;

  /** One stddev above x */
  range_max: number;

  /** Sample size for this bin */
  count: number;
}

export interface TimeAccuracyBenchmarkData {
  /** Trendline for time vs. accurancy benchmark graph */
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
  const { data, error } = await supabase.rpc("get_participant_results", {
    target_uuid: session,
  });

  if (error) {
    throw error;
  }
  return data as ParticipantResults;
};

/**
 * Gets accuracy statistics broken down by category for a specified participant.
 * Includes benchmark values for the average user.
 * @param session - unique id of user to fetch data for
 * @returns Promise<CategoryStats[]> for the specified participant
 */
export const fetchCategoryStats = async (
  session: string,
): Promise<CategoryStats[]> => {
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

/**
 * Gets a benchmark curve for the relationship between time and accuracy over all participants.
 * @returns Promise<TimeAccuracyBenchmarkData> for the specified participant
 */
export const fetchTimeAccuracyBenchmarks =
  async (): Promise<TimeAccuracyBenchmarkData> => {
    const { data, error } = await supabase.rpc("get_binned_benchmarks");

    if (error) {
      throw error;
    }
    return data as TimeAccuracyBenchmarkData;
  };
