import {
  Card,
  Center,
  Group,
  Image,
  Progress,
  SimpleGrid,
  Space,
  Text,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { StimulusPair } from "../../lib/participant";
import classes from "./PairTrial.module.css";

export interface PairTrialProps {
  /** The pair of images to display for this trial */
  stimulus: StimulusPair;

  /**
   * Callback to handle user answer selection.
   * @param choice - the stimulus side selected by the user
   */
  onSelect: (choice: "left" | "right" | "none") => void;
}

/**
 * A component containing an individual pair trial of the Visual Honesty survey
 * @component
 */
export function PairTrial({ stimulus, onSelect }: PairTrialProps) {
  const [progress, setProgress] = useState(100);
  const [timeLeftMs, setTimeLeftMs] = useState(10000);
  const onSelectRef = useRef(onSelect);
  const animationDurationMs = 60000;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const resetKey = stimulus.trial_id;

  // Kick off the visual timer and countdown text whenever a new trial loads.
  useEffect(() => {
    const resetProgressFrame = window.requestAnimationFrame(() =>
      setProgress(100),
    );
    const resetCountdownFrame = window.requestAnimationFrame(() =>
      setTimeLeftMs(animationDurationMs),
    );
    const startTimeout = window.setTimeout(() => setProgress(0), 50);
    const deadline = performance.now() + animationDurationMs;
    const countdownInterval = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, deadline - performance.now()));
    }, 200);
    const expireTimeout = window.setTimeout(() => {
      onSelectRef.current("none");
    }, animationDurationMs + 50);

    return () => {
      window.cancelAnimationFrame(resetProgressFrame);
      window.cancelAnimationFrame(resetCountdownFrame);
      window.clearTimeout(startTimeout);
      window.clearInterval(countdownInterval);
      window.clearTimeout(expireTimeout);
    };
  }, [resetKey, animationDurationMs]);

  // Display whole seconds.
  const secondsRemaining = Math.max(0, Math.ceil(timeLeftMs / 1000));

  return (
    <>
      <Group
        justify="space-between"
        mb={4}
        align="center"
        style={{ width: "100%" }}
      >
        <Text size="sm" c="dimmed">
          Time remaining
        </Text>
        <Text size="sm" fw={600}>
          {secondsRemaining}s
        </Text>
      </Group>
      <Progress
        value={progress}
        style={{ width: "100%", marginBottom: 16 }}
        styles={{
          section: { transition: `width ${animationDurationMs}ms linear` },
        }}
      />
      <Center>
        <Text size="xl" ta="center">Select the deceptive visualization below</Text>
      </Center>
      <Space h="xl" />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: "md", sm: "xl" }}>
        <Card
          shadow="sm"
          padding="lg"
          withBorder
          radius="lg"
          onClick={() => onSelect("left")}
          className="panels"
          style={{ cursor: "pointer" }}
        >
          <Image
            src={stimulus.left.image_url}
            alt="Stimulus A"
            draggable={false}
            fit="contain"
            className={classes.trialImage}
          />
        </Card>
        <Card
          padding="lg"
          withBorder
          radius="lg"
          onClick={() => onSelect("right")}
          className="panels"
          style={{ cursor: "pointer" }}
        >
          <Image
            src={stimulus.right.image_url}
            alt="Stimulus B"
            draggable={false}
            fit="contain"
            className={classes.trialImage}
          />
        </Card>
      </SimpleGrid>
    </>
  );
}

