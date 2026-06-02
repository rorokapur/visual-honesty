import { Box, Group, Progress, Stepper, Text } from "@mantine/core";
import classes from "./StudyProgress.module.css";

interface StudyProgressProps {
  /** Total number of trials the participant will complete */
  num_trials: number;

  /** Current stage or question number */
  stage: "landing" | "onboarding" | "results" | number;
}

/**
 * Shows current progress of participant in study flow, breaking down into
 * invidual questions during the survey stage.
 * @component
 */
export function StudyProgress({ num_trials, stage }: StudyProgressProps) {
  let active: number;
  if (stage === "landing") {
    active = 0;
  } else if (stage === "onboarding") {
    active = 1;
  } else if (typeof stage === "number") {
    active = 2;
  } else {
    active = 3;
  }

  const stageLabels = ["Recruitment", "Briefing", "Mission", "Debrief"];
  const activeLabel = stageLabels[active] || "Recruitment";

  const questions = [];
  questions.push(
    <Stepper.Step key="mission-start" label="Mission"></Stepper.Step>,
  );
  for (let i = 1; i < num_trials; i++) {
    questions.push(<Stepper.Step key={`step-${i}`}></Stepper.Step>);
  }

  // Mobile layouts
  const mobileProgress =
    typeof stage === "number" ? (
      <Box className={classes.mobileOnly} px="xs" py="4px">
        <Group justify="space-between" mb={4}>
          <Text size="xs" fw="bold" tt="uppercase" c="#00d346">
            Mission Progress
          </Text>
          <Text size="xs" fw="bold" c="#00d346">
            Round {stage} of {num_trials}
          </Text>
        </Group>
        <Progress value={(stage / num_trials) * 100} size="sm" />
      </Box>
    ) : (
      <Box className={classes.mobileOnly} px="xs" py="4px">
        <Group justify="space-between" mb={4}>
          <Text size="xs" fw="bold" c="#00d346">
            Phase {active + 1} of 4
          </Text>
          <Text size="xs" fw="bold" tt="uppercase" c="#00d346">
            {activeLabel}
          </Text>
        </Group>
        <Progress value={((active + 1) / 4) * 100} size="sm" />
      </Box>
    );

  // Desktop layouts
  const desktopProgress =
    typeof stage === "number" && questions.length > 0 ? (
      <Box className={classes.desktopOnly}>
        <Stepper
          active={stage - 1}
          allowNextStepsSelect={false}
          iconPosition="right"
          styles={{ steps: { justifyContent: "center" } }}
        >
          {questions}
        </Stepper>
      </Box>
    ) : (
      <Box className={classes.desktopOnly}>
        <Stepper active={active} allowNextStepsSelect={false}>
          <Stepper.Step label="Recruitment"></Stepper.Step>
          <Stepper.Step label="Briefing"></Stepper.Step>
          <Stepper.Step label="Mission"></Stepper.Step>
          <Stepper.Step label="Debrief"></Stepper.Step>
        </Stepper>
      </Box>
    );

  return (
    <>
      {desktopProgress}
      {mobileProgress}
    </>
  );
}
