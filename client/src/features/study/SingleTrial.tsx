import {
  Button,
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
import type { StimulusSingle } from "../../lib/participant";

export interface SingleTrialProps {
  stimulus: StimulusSingle;
  onSelect: (verdict: boolean | "none") => void;
}

export function SingleTrial({ stimulus, onSelect }: SingleTrialProps) {
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
        <Text size="xl">Is this visualization deceptive or honest?</Text>
      </Center>
      <Space h="xl" />
      <Center>
        <Card
          shadow="sm"
          padding="lg"
          withBorder
          radius="lg"
          className="panels"
          style={{ maxWidth: 800, width: "100%" }}
        >
          <Image
            src={stimulus.stimulus.image_url}
            alt="Stimulus"
            draggable={false}
            fit="contain"
            style={{ 
              userSelect: "none", 
              position: "relative", 
              zIndex: "var(--z-content)",
              maxHeight: "50vh",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              margin: "0 auto"
            }}
          />
        </Card>
      </Center>
      <Space h="xl" />
      <SimpleGrid cols={2} spacing="xl">
        <Button
          size="xl"
          color="teal"
          variant="light"
          onClick={() => onSelect(false)}
          className="panels"
          style={{ height: 80, fontSize: 24 }}
        >
          Honest
        </Button>
        <Button
          size="xl"
          color="red"
          variant="light"
          onClick={() => onSelect(true)}
          className="panels"
          style={{ height: 80, fontSize: 24 }}
        >
          Deceptive
        </Button>
      </SimpleGrid>
    </>
  );
}
