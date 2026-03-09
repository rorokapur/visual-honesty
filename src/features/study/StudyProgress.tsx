import { Box, Stepper } from "@mantine/core";

interface StudyProgressProps {
  /** Total number of trials the participant will complete */
  num_trials: number;

  /** Current stage or question number */
  stage: "landing" | "results" | number;
}

/**
 * Shows current progress of participant in study flow, breaking down into
 * invidual questions during the survey stage.
 * @component
 */
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
  questions.push(<Stepper.Step label="Questions"></Stepper.Step>);
  for (let i = 1; i < num_trials; i++) {
    questions.push(<Stepper.Step></Stepper.Step>);
  }

  // Show individual question numbers when in the trials phase
  if (typeof stage === "number" && questions.length > 0) {
    return (
      <Box>
        <Stepper
          active={stage - 1}
          allowNextStepsSelect={false}
          iconPosition="right"
          styles={{ steps: { justifyContent: "center" } }}
        >
          {questions}
        </Stepper>
      </Box>
    );
  }

  // Otherwise show progress of overall flow
  return (
    <Box>
      <Stepper active={active} allowNextStepsSelect={false}>
        <Stepper.Step label="Briefing"></Stepper.Step>
        <Stepper.Step label="Mission"></Stepper.Step>
        <Stepper.Step label="Debrief"></Stepper.Step>
      </Stepper>
    </Box>
  );
}
