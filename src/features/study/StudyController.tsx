import { Box, Container, LoadingOverlay, Stack } from "@mantine/core";
import { useState } from "react";
import {
  fetchNextPair,
  submitResponse,
  type StimulusPair,
} from "../../lib/stimulus";
import { Landing } from "./Landing";
import { Results } from "./Results";
import { StudyProgress } from "./StudyProgress";
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
  const [stage, setStage] = useState<"landing" | "survey" | "results">(
    "landing",
  );

  const [trial, setTrial] = useState<number>(0);
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [stimulus, setStimulus] = useState<StimulusPair | null>(null);

  /**
   * Processes user selection for the current trial and sends results to Supabase.
   * @param {'left' | 'right'} choice - the graph the user selected (as being deceptive)
   */
  const handleSelect = async (choice: "left" | "right") => {
    setLoading(true);
    if (!stimulus) {
      throw new Error("cannot submit answer for invalid stimulus");
    }
    await submitResponse(session, stimulus, choice);
    if (trial < totalTrials) {
      const next = await fetchNextPair(session);
      if (next) {
        setStimulus(next);
        setTrial(trial + 1);
      } else {
        setStage("results");
      }
    } else {
      setStage("results");
    }

    setLoading(false);
  };

  const handleStart = async () => {
    setLoading(true);
    const nextPair = await fetchNextPair(session);
    setStimulus(nextPair);
    if (nextPair) {
      setStage("survey");
      setTrial(1);
      setTotalTrials(
        nextPair.sets_remaining > 20 ? 20 : nextPair.sets_remaining,
      );
    } else {
      setStage("results");
    }
    setLoading(false);
  };

  let page;

  if (stage === "landing") {
    page = <Landing handleStart={() => handleStart()} />;
  } else if (stage === "survey" && stimulus) {
    page = <Trial stimulus={stimulus} onSelect={handleSelect}></Trial>;
  } else {
    page = <Results session={session}></Results>;
  }

  return (
    <Stack gap="0">
      <Container maw="80%" miw="60%" p="md">
        <StudyProgress
          num_trials={totalTrials}
          stage={stage === "survey" ? trial : stage}
        ></StudyProgress>
      </Container>
      <Box pos="relative">
        <LoadingOverlay visible={loading}></LoadingOverlay>
        {page}
      </Box>
    </Stack>
  );
}
