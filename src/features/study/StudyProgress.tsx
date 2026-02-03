import { Stepper } from "@mantine/core";

interface StudyProgressProps {
  num_trials: number;
  stage: "landing" | "results" | number;
}

export function StudyProgress({ num_trials, stage }: StudyProgressProps) {
  let active;
  if (typeof stage === "number") {
    active = stage;
  } else if (stage === "landing") {
    active = 0;
  } else {
    active = num_trials;
  }

  const questions = [];
  for (let i = 0; i < num_trials; i++) {
    questions.push(<Stepper.Step label={"Q" + (i + 1)}></Stepper.Step>);
  }

  return (
    <Stepper active={active} allowNextStepsSelect={false}>
      <Stepper.Step label="Instructions"></Stepper.Step>
      {typeof stage === "number" && questions.length > 0 ? (
        questions
      ) : (
        <Stepper.Step label="Questions"></Stepper.Step>
      )}
      <Stepper.Step label="Results">
        Step 3 content: Get full access
      </Stepper.Step>
    </Stepper>
  );
}
