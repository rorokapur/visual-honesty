import { Center, Title } from "@mantine/core";
import { useState } from "react";
import { STIMULI_SET } from "../data/stimuli";
import { Trial } from "./Trial";

export function SurveyContainer() {
  const [stimulusIndex, setStimulusIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState(() => Math.random() < 0.5);

  const isFinished = stimulusIndex >= STIMULI_SET.length;

  const handleSelect = (choice: "left" | "right") => {
    const selection =
      choice === "left"
        ? isFlipped
          ? "deceptive"
          : "honest"
        : isFlipped
        ? "honest"
        : "deceptive";
    alert(selection);
    setStimulusIndex(stimulusIndex + 1);
    setIsFlipped(Math.random() < 0.5);
  };

  if (isFinished) {
    return (
      <Center>
        <Title>Survey Complete! Thank you for your participation.</Title>
      </Center>
    );
  }
  return (
    <Trial
      stimulus={STIMULI_SET[stimulusIndex]}
      onSelect={handleSelect}
      isFlipped={isFlipped}
    ></Trial>
  );
}
