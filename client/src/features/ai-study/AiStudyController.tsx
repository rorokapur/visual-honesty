import { Box, Container, LoadingOverlay, Stack } from "@mantine/core";
import { useRef, useState } from "react";
import {
  fetchNextPair,
  submitResponse,
  type StimulusPair,
} from "../../lib/participant";
import { Landing } from "./Landing";
import { Results } from "./Results";
import { useSessionContext } from "./session/useSessionContext";
import { StudyProgress } from "./StudyProgress";
import { Trial } from "./Trial";

/**
 * AI Study Controller.
 * Duplicates the logic of StudyController but includes AI-specific overrides.
 * Uses shared UI components from the main study feature.
 * @component
 */
export function AiStudyController() {
  const { sessionId, initializeSession } = useSessionContext();
  // Loading state for async operations
  const [loading, setLoading] = useState<boolean>(false);
  // Current stage in study flow
  const [stage, setStage] = useState<"landing" | "survey" | "results">(
    "landing",
  );
  const trialStartTime = useRef<number | null>(null);
  const [trial, setTrial] = useState<number>(0);
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [stimulus, setStimulus] = useState<StimulusPair | null>(null);
  /**
   * Preloads an image into the browser cache
   * @param url - url of image to preload
   */
  const preloadImage = (url: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

  /**
   * Preloads the images for a stimulus pair
   * @param pair - StimulusPair to preload
   */
  const preloadStimulus = (pair: StimulusPair) =>
    Promise.all([
      preloadImage(pair.left.image_url),
      preloadImage(pair.right.image_url),
    ]);

  /**
   * Processes user selection for the current trial and sends results to Supabase.
   * @param {'left' | 'right' | 'none'} choice - the graph the user selected (as being deceptive)
   */
  const handleSelect = async (choice: "left" | "right" | "none") => {
    setLoading(true);
    if (!stimulus) {
      throw new Error("cannot submit answer for invalid stimulus");
    }
    const timeTaken = trialStartTime.current
      ? performance.now() - trialStartTime.current
      : null;
    if (!timeTaken) {
      throw new Error("timekeeping error!");
    }
    await submitResponse(sessionId, stimulus, choice, timeTaken);
    if (trial < totalTrials) {
      const next = await fetchNextPair(sessionId);
      if (next) {
        await preloadStimulus(next);
        setStimulus(next);
        setTrial(trial + 1);
        trialStartTime.current = performance.now();
      } else {
        setStage("results");
      }
    } else {
      setStage("results");
    }

    setLoading(false);
  };

  /**
   * Creates a new AI model session in the backend
   * @param model - Model name to label session (e.g. Gemini 3 Pro)
   */
  const handleStart = async (model: string) => {
    setLoading(true);
    try {
      const newId = await initializeSession(model);
      const nextPair = await fetchNextPair(newId);
      if (nextPair) {
        await preloadStimulus(nextPair);
        setStimulus(nextPair);
        setStage("survey");
        setTrial(1);
        setTotalTrials(
          nextPair.sets_remaining > 20 ? 20 : nextPair.sets_remaining,
        );
        trialStartTime.current = performance.now();
      } else {
        setStage("results");
      }
    } finally {
      setLoading(false);
    }
  };

  const page =
    stage === "landing" ? (
      <Landing handleStart={handleStart} />
    ) : stage === "survey" && stimulus ? (
      <Trial
        key={stimulus.trial_id}
        stimulus={stimulus}
        onSelect={handleSelect}
      />
    ) : (
      <Results />
    );

  return (
    <Stack gap="0">
      <Container maw="80%" miw="60%" p="md">
        <StudyProgress
          num_trials={totalTrials}
          stage={stage === "survey" ? trial : stage}
        ></StudyProgress>
        <Box pos="relative">
          <LoadingOverlay visible={loading}></LoadingOverlay>
          {page}
        </Box>
      </Container>
    </Stack>
  );
}
