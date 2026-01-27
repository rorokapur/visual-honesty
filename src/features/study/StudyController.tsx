import { Loader } from "@mantine/core";
import { useState } from "react";
import {
  fetchNextPair,
  submitResponse,
  type StimulusPair,
} from "../../lib/stimulus";
import { Landing } from "./Landing";
import { Results } from "./Results";
import { Trial } from "./Trial";

interface StudyControllerProps {
  /**
   * Unique session identifier for the participant.
   * Prevents duplicate submissions and helps group responses together in the db.
   */
  session: string;

  /**
   * Whether the participant has already taken the survey or not.
   * Prevents duplicate submissions to the database to save resources.
   */
  hasTaken?: boolean;
}

/**
 * Main Visual Honesty survey component.
 * Handles trial progression, user selections, and data submission to Supabase.
 * @component
 */
export function StudyController({ session }: StudyControllerProps) {
  // Loading state for async operations
  const [loading, setLoading] = useState<boolean>(false);
  // Current stage in study flow
  const [stage, setStage] = useState<"landing" | "survey" | "complete">(
    "landing",
  );
  const [stimulus, setStimulus] = useState<StimulusPair | "DONE" | null>(null);

  /**
   * Processes user selection for the current trial and sends results to Supabase.
   * @param {'left' | 'right'} choice - the graph the user selected (as being deceptive)
   */
  const handleSelect = async (choice: "left" | "right") => {
    setLoading(true);
    if (!stimulus || stimulus === "DONE") {
      throw new Error("cannot submit answer for invalid stimulus");
    }
    await submitResponse(session, stimulus, choice);
    setStimulus(await fetchNextPair(session));
    setLoading(false);
  };

  const handleStart = async () => {
    setLoading(true);
    const nextPair = await fetchNextPair(session);
    setStimulus(nextPair);
    if (nextPair && nextPair !== "DONE") {
      setStage("survey");
    } else {
      setStage("complete");
    }
    setLoading(false);
  };

  // Show loader while submitting (prevents multiple API calls)
  if (loading) {
    return (
      <Loader
        size="xl"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    );
  }

  // Show landing page initially
  if (stage === "landing") {
    return <Landing handleStart={() => handleStart()} />;
  }

  // Show completion message if finished
  if (stage === "survey" && stimulus && stimulus != "DONE") {
    return <Trial stimulus={stimulus} onSelect={handleSelect}></Trial>;
  }

  return <Results></Results>;
}
