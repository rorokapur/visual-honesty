import { supabase } from "./supabase";

export interface StimulusImage {
  id: string;
  image_url: string;
}

export interface StimulusPair {
  set_id: string;
  left: StimulusImage;
  right: StimulusImage;
  sets_remaining: number;
}

/**
 * Fetches a random pair of honest/deceptive images that the user has not seen yet.
 * Returns 'DONE' if the survey is complete, or the pair data.
 */
export const fetchNextPair = async (
  sessionId: string,
): Promise<StimulusPair | null> => {
  const { data, error } = await supabase.rpc("get_random_unseen_pair", {
    p_session_id: sessionId,
  });

  if (error) {
    console.error("Error fetching stimulus pair:", error);
    return null;
  }

  // The RPC returns { sets_remaining: 0 } when finished
  if (data.sets_remaining === 0) {
    return null;
  }

  return data as StimulusPair;
};

/**
 * Submits the user's choice to the database.
 */
export const submitResponse = async (
  sessionId: string,
  stimulus: StimulusPair,
  selectedSide: "left" | "right",
) => {
  const { error } = await supabase.from("responses").insert({
    session_id: sessionId,
    set_id: stimulus.set_id,
    selected_stimulus:
      selectedSide === "right" ? stimulus.right.id : stimulus.left.id,
    selected_side: selectedSide,
  });

  if (error) {
    console.error("Error submitting response:", error);
    throw error;
  }
};
