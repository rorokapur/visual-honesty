import {
  Box,
  Button,
  Container,
  LoadingOverlay,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
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
import classes from "./StudyController.module.css";

/**
 * Main Visual Honesty survey component.
 * Handles trial progression, user selections, and data submission to Supabase.
 * @component
 */
export function StudyController() {
  // Participant session
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
  const [waitingContinue, setWaitingContinue] = useState(false);
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
    if (choice === "none") {
      // Pause the test flow if the user timed out on the last question
      setWaitingContinue(true);
    } else {
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
    }
    setLoading(false);
  };

  /** Starts the test and loads the first image pair */
  const handleStart = async () => {
    setLoading(true);
    try {
      if (!sessionId) {
        await initializeSession();
      }
      const currentSessionId = localStorage.getItem("vh_session_id") || "";

      const nextPair = await fetchNextPair(currentSessionId);
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
    } catch (e) {
      console.error("Failed to start study:", e);
      // If the session was corrupt or completely detached from POSTGRES, wipe it!
      localStorage.removeItem("vh_session_id");
      alert("A server error interrupted your connection! We have reset your session. Please refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * If the last trial ended in a timeout, a modal shows and we pause the flow.
   * When run, this function continues the test flow.
   */
  const continueAfterTimeout = async () => {
    setWaitingContinue(false);
    setLoading(true);
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

  let page;

  if (stage === "landing") {
    page = <Landing handleStart={() => handleStart()} />;
  } else if (stage === "survey" && stimulus) {
    page = (
      <Trial
        key={stimulus.trial_id}
        stimulus={stimulus}
        onSelect={handleSelect}
      ></Trial>
    );
  } else {
    page = <Results></Results>;
  }

  return (
    <Stack gap="0">
      <Container fluid>
        <Box p={"md"} className={classes.progressContainer}>
          <StudyProgress
            num_trials={totalTrials}
            stage={stage === "survey" ? trial : stage}
          ></StudyProgress>
        </Box>
        {/* When timeout occurs we pause here before loading next stimulus */}
        <Modal
          opened={waitingContinue}
          onClose={() => {}}
          withCloseButton={false}
          centered
        >
          <Text mb="md">You ran out of time.</Text>
          <Button fullWidth onClick={continueAfterTimeout}>
            Continue
          </Button>
        </Modal>
        <Box pos="relative">
          <LoadingOverlay visible={loading}></LoadingOverlay>
          {page}
        </Box>
      </Container>
    </Stack>
  );
}
