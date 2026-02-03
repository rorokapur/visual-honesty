import { Box, Stepper } from "@mantine/core";

interface StudyProgressProps {
  num_trials: number;
  stage: "landing" | "results" | number;
}

export function StudyProgress({ num_trials, stage }: StudyProgressProps) {
  let active;
  if (typeof stage === "number") {
    active = 1;
  } else if (stage === "landing") {
    active = 0;
  } else {
    active = 2;
  }

  const questions = [];
  for (let i = 0; i < num_trials; i++) {
    questions.push(<Stepper.Step></Stepper.Step>);
  }

  if (typeof stage === "number" && questions.length > 0) {
    return (
      <Box>
        <Stepper active={stage - 1} allowNextStepsSelect={false}>
          {questions}
        </Stepper>
      </Box>
    );
  }

  return (
    <Box>
      <Stepper active={active} allowNextStepsSelect={false}>
        <Stepper.Step label="Instructions"></Stepper.Step>
        <Stepper.Step label="Questions"></Stepper.Step>
        <Stepper.Step label="Results"></Stepper.Step>
      </Stepper>
    </Box>
  );
}
