import { Center, Loader, Title } from "@mantine/core";
import { useState } from "react";
import { STIMULI_SET } from "../data/stimuli";
import { supabase } from "../lib/supabase";
import { Landing } from "./Landing";
import { Trial } from "./Trial";

interface SurveyContainerProps {
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
export function SurveyContainer({ session, hasTaken }: SurveyContainerProps) {
  // Current index in the set of images/trials
  const [stimulusIndex, setStimulusIndex] = useState<number>(0);
  // Whether the right/left order of images is flipped
  const [isFlipped, setIsFlipped] = useState(() => Math.random() < 0.5);
  // Loading state for async operations
  const [loading, setLoading] = useState<boolean>(false);
  // Current stage in study flow
  const [stage, setStage] = useState<"landing" | "survey" | "complete">(
    "landing",
  );

  /**
   * Processes user selection for the current trial and sends results to Supabase.
   * @param {'left' | 'right'} choice - the graph the user selected (as being deceptive)
   */
  const handleSelect = async (choice: "left" | "right") => {
    setLoading(true);

    // Determine whether selected image was honest or deceptive
    const selection =
      choice === "left"
        ? isFlipped
          ? "deceptive"
          : "honest"
        : isFlipped
          ? "honest"
          : "deceptive";

    // Skip sending results if survey already taken
    // TODO: add some kind of flash or animation between trials when skipping for consistency
    if (!hasTaken) {
      const { error } = await supabase.from("responses").insert([
        {
          session_id: session, // Unique UUID for this participant
          pair_id: STIMULI_SET[stimulusIndex].id, // e.g., 'pair_01'
          selected_answer: selection, // 'honest' or 'deceptive'
          selected_side: choice, // Did they physically click left or right?
        },
      ]);

      if (error) {
        console.error("Submission failed:", error.message);
      }
    }
    // Check if this was the last trial
    if (stimulusIndex + 1 >= STIMULI_SET.length) {
      setStage("complete");
    } else {
      // Advance to next trial
      setStimulusIndex(stimulusIndex + 1);
      setIsFlipped(Math.random() < 0.5);
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

  // Show completion message if finished
  if (stage === "complete") {
    // Set flag in storage to prevent submissions on retakes
    localStorage.setItem("vh_taken", "true");
    // TODO: make this a component
    return (
      <Center>
        <Title>Survey Complete! Thank you for your participation.</Title>
      </Center>
    );
  }

  if (stage === "landing") {
    return <Landing handleStart={() => setStage("survey")} />;
  }

  return (
    <Trial
      stimulus={STIMULI_SET[stimulusIndex]}
      onSelect={handleSelect}
      isFlipped={isFlipped}
    ></Trial>
  );
}
