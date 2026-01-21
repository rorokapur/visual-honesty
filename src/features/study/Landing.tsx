import { Button, Center, Container, Stack, Text, Title } from "@mantine/core";

interface LandingProps {
  /**
   * Callback to start the survey
   */
  handleStart: () => void;
}

/**
 * Landing page displayed before starting the survey
 */
export function Landing({ handleStart }: LandingProps) {
  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ padding: "16px 0" }}>
            <Title ta="center">Can you spot the deceptive visualization?</Title>
          </Center>
        </Container>
      </header>
      <main>
        <Container size="sm" px="md">
          <Stack align="center" gap="md">
            <Text>
              This is some text that will eventually be replaced with a proper
              description of the experiement being conducted and its background.
              There may even be an example of a deceptive visualization seen in
              the wild.
            </Text>
            <Text>
              The following test will show you pairs of data visualizations.
              Your goal is to identify which graph is trying to decieve you or
              misrepresent the data. Click on the graph that you think is the
              most deceptive. You will receive a score at the end of the test.
            </Text>
            <Button onClick={handleStart}>Start</Button>
          </Stack>
        </Container>
      </main>
    </>
  );
}
