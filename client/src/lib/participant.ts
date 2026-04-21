/** Performance results for a specific participant */
export interface ParticipantResults {
  total_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
  percentile: number;
  total_users: number;
  average_time: number;
}

/**
 * Performance results by stimuli category
 * Compares a specific participant to average user and AI performance.
 * */
export interface CategoryStats {
  category: string;
  user: number;
  average: number;
  ai: number;
}

/**
 * A single 2D coordinate point that can be used to define
 * the time-accuracy curve of participant performance.
 * Includes a range to create upper/lower bounds.
 */
export interface TimeAccuracyBenchmarkPoint {
  x: number;
  y: number;
  range_min: number;
  range_max: number;
  count: number;
}

/**
 * An array of TimeAccuracyBenchmarkPoints representing
 * the relationship between speed and accuracy across all participants,
 * including an upper and lower bound.
 */
export interface TimeAccuracyBenchmarkData {
  trend: TimeAccuracyBenchmarkPoint[];
}

/**
 * Fetches basic participant results, as outlined in the ParticipantResults interface
 * @param session - session UUID to fetch stats for
 * @returns ParticipantResults information for the given session
 */
export const fetchResults = async (
  session: string,
): Promise<ParticipantResults> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user/results/summary`, {
    headers: { "X-Session-ID": session },
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Failed to fetch results");
  return (await res.json()) as ParticipantResults;
};

/**
 * Fetches category stats for a given particpant as well as benchmarks for each category
 * as outlined in the CategoryStats interface
 * @param session - session UUID to fetch stats for
 * @returns An array of CategoryStats information for the given session across all categories
 */
export const fetchCategoryStats = async (
  session: string,
): Promise<CategoryStats[]> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user/results/categories`, {
    headers: { "X-Session-ID": session },
  });
  if (!res.ok)
    throw new Error(
      (await res.json()).error || "Failed to fetch category stats",
    );
  return (await res.json()) as CategoryStats[];
};

/**
 * Fetches a benchmark curve for speed vs. accuracy across all participants.
 * @returns TimeAccuracyBenchmark data representing the time-accuracy trend across all participants
 */
export const fetchTimeAccuracyBenchmarks =
  async (): Promise<TimeAccuracyBenchmarkData> => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${apiUrl}/api/user/results/benchmarks`);
    if (!res.ok)
      throw new Error((await res.json()).error || "Failed to fetch benchmarks");
    return (await res.json()) as TimeAccuracyBenchmarkData;
  };

/** A single study stimulus */
export interface StimulusImage {
  id: string;
  image_url: string;
}

/**
 * A pair of stimuli with left/right ordering
 * Includes data about the number of remaining pairs after the current one.
 */
export interface StimulusPair {
  trial_id: string;
  set_id: string;
  left: StimulusImage;
  right: StimulusImage;
  sets_remaining: number;
}

/**
 * Fetches the next StimulusPair from the backend for a given participant.
 * @param sessionId - session UUID for this participant
 * @returns Promise<StimulusPair | null> - the next StimulusPair for the participant or null if none remain
 */
export const fetchNextPair = async (
  sessionId: string,
): Promise<StimulusPair | null> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user/trial/next`, {
    headers: { "X-Session-ID": sessionId },
  });
  if (!res.ok) {
    console.error("Error fetching stimulus pair:", await res.json());
    return null;
  }
  const data = await res.json();
  if (data.sets_remaining === 0) return null;
  return data as StimulusPair;
};

/**
 * Submits a participant response to a given StimuliPair (left/right selection)
 * @param sessionId - session UUID of participant
 * @param stimulus - the StimulusPair that the user was shown
 * @param selectedSide - the side of the selected StimulusImage (left/right/none [ran out of time])
 * @param timeTaken - the amount of time the participant took to select an option
 */
export const submitResponse = async (
  sessionId: string,
  stimulus: StimulusPair,
  selectedSide: "left" | "right" | "none",
  timeTaken: number,
) => {
  const choiceId =
    selectedSide === "right" ? stimulus.right.id : stimulus.left.id;
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user/trial/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({
      trialId: stimulus.trial_id,
      choice: selectedSide === "none" ? null : choiceId,
      frontendTime: Math.round(timeTaken),
    }),
  });
  const errData = await res.json();
  if (!res.ok || !errData?.success) {
    throw new Error(errData.error || "Failed to submit response");
  }
};

/**
 * Checks if a specific participant session UUID is valid.
 * Used to check if a new session needs to be generated (e.g. if the backend was reset/cleared)
 * @param sessionId - session UUID to check
 * @returns Promise<boolean> representing the validity of the specified UUID
 */
export const validateParticipantSession = async (
  sessionId: string,
): Promise<boolean> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user/validate`, {
    headers: { "X-Session-ID": sessionId },
  });
  if (!res.ok) return false;
  return await res.json();
};

/**
 * Creates a new participant session
 * @param category - broad category label (not currently used; set to "human")
 * @param demographics - JSON data to hold specific demographic survey data
 * @returns string - UUID for the created session
 */
export const initializeParticipantSession = async (
  category: string = "human",
  demographics: object = {}
): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: category,
      demographics: demographics,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data)
    throw new Error(data.error || "Failed to initialize session");
  return data as string;
};

/**
 * Creates a new AI participant session.
 * Requires authentication.
 * @param category - currently used to store model name (e.g. "Gemini 3 Pro")
 * @param demographics - not currently used, unlikely to use in the future
 * @returns string - UUID for the created session
 */
export const initializeAiSession = async (
  category: string,
  demographics: object = {},
): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/agent/ai-participant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ category, demographics }),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.participant_id) {
    throw new Error(data.error || "Failed to create AI session");
  }
  return data.participant_id as string;
};
