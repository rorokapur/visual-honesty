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
  fetchNextTrial,
  submitResponse,
  type StimulusTrial,
} from "../../lib/participant";
import { Landing } from "./Landing";
import { Results } from "./Results";
import { useSessionContext } from "./session/useSessionContext";
import { StudyProgress } from "./StudyProgress";
import { PairTrial } from "./PairTrial";
import { SingleTrial } from "./SingleTrial";
import classes from "./StudyController.module.css";
import { OnboardingGame } from "./OnboardingGame";

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
  const [stage, setStage] = useState<"landing" | "onboarding" | "survey" | "results">(
    "landing",
  );
  const trialStartTime = useRef<number | null>(null);
  const [trial, setTrial] = useState<number>(0);
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [stimulus, setStimulus] = useState<StimulusTrial | null>(null);
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
   * Preloads the images for a stimulus trial
   * @param stim - StimulusTrial to preload
   */
  const preloadStimulus = (stim: StimulusTrial) => {
    if (stim.trial_type === "pair") {
      return Promise.all([
        preloadImage(stim.left.image_url),
        preloadImage(stim.right.image_url),
      ]);
    } else {
      return preloadImage(stim.stimulus.image_url);
    }
  };

  /**
   * Processes user selection for the current trial and sends results to Supabase.
   * @param choice - the graph the user selected or the verdict
   */
  const handleSelect = async (choice: "left" | "right" | "none" | boolean) => {
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
        const next = await fetchNextTrial(sessionId);
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
  const handleStart = () => {
    setStage("onboarding");
  };

  /** Completes onboarding, initializes session, and starts survey */
  const handleCompleteOnboarding = async (demographics: any) => {
    setLoading(true);
    try {
      const newSessionId = await initializeSession(demographics);
      const currentSessionId =
        newSessionId || localStorage.getItem("vh_session_id") || "";

      const nextTrial = await fetchNextTrial(currentSessionId);
      if (nextTrial) {
        await preloadStimulus(nextTrial);
        setStimulus(nextTrial);
        setStage("survey");
        setTrial(1);
        setTotalTrials(
          nextTrial.sets_remaining > 20 ? 20 : nextTrial.sets_remaining,
        );
        trialStartTime.current = performance.now();
      } else {
        setStage("results");
      }
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      localStorage.removeItem("vh_session_id");
      alert(
        "A server error interrupted your connection! We have reset your session. Please refresh the page and try again.",
      );
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
      const next = await fetchNextTrial(sessionId);
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
    page = <Landing handleStart={handleStart} />;
  } else if (stage === "onboarding") {
    page = <OnboardingGame onComplete={handleCompleteOnboarding} />;
  } else if (stage === "survey" && stimulus) {
    page = (
      <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Container w="100%">
          {stimulus.trial_type === "pair" ? (
            <PairTrial
              key={stimulus.trial_id}
              stimulus={stimulus}
              onSelect={handleSelect as any}
            />
          ) : (
            <SingleTrial
              key={stimulus.trial_id}
              stimulus={stimulus}
              onSelect={handleSelect as any}
            />
          )}
        </Container>
      </Box>
    );
  } else {
    page = <Results />;
  }



  return (
    <Stack gap="0" w="100%" h="100vh" style={{ overflow: "hidden" }}>
      <Box p="sm" className={classes.progressContainer} w="100%">
        <StudyProgress
          num_trials={totalTrials}
          stage={stage === "survey" ? trial : stage}
        />
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
      <Box
        pos="relative"
        w="100%"
        className={`${classes.contentArea} crt-effect`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <LoadingOverlay visible={loading} />
        <Box style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {page}
        </Box>
      </Box>
    </Stack>
  );
}
