import { Center, Loader, Title } from "@mantine/core";
import { useState } from "react";
import { STIMULI_SET } from "../data/stimuli";
import { supabase } from "../lib/supabase";
import { Trial } from "./Trial";

interface SurveyContainerProps {
  session: string;
  hasTaken?: boolean;
}

export function SurveyContainer({ session, hasTaken }: SurveyContainerProps) {
  const [stimulusIndex, setStimulusIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState(() => Math.random() < 0.5);
  const [loading, setLoading] = useState<boolean>(false);

  const isFinished = stimulusIndex >= STIMULI_SET.length;

  const handleSelect = async (choice: "left" | "right") => {
    setLoading(true);
    const selection =
      choice === "left"
        ? isFlipped
          ? "deceptive"
          : "honest"
        : isFlipped
        ? "honest"
        : "deceptive";

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

    setStimulusIndex(stimulusIndex + 1);
    setIsFlipped(Math.random() < 0.5);
    setLoading(false);
  };

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
  if (isFinished) {
    localStorage.setItem("vh_taken", "true");
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
