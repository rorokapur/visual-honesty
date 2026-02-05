import {
  Button,
  Card,
  Center,
  Container,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";

interface LandingProps {
  /** Callback to start the survey */
  handleStart: () => void;
}

/** Landing page displayed before starting the survey */
export function Landing({ handleStart }: LandingProps) {
  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ padding: "16px 0" }}>
            <Title ta="center">Are you fooled by deceptive charts?</Title>
          </Center>
        </Container>
      </header>
      <main>
        <Container size="sm" px="md" bg="">
          <Card withBorder radius="lg">
            <Stack align="center" gap="md">
              <Text>
                Graphs and charts are supposed to simplify the truth, but they
                are often used to hide it. We’ve created a series of charts to
                test your ability to spot 'dishonest' representations of data.
                It only takes 5 minutes, and your results will help us better
                understand the visual deception. See how you score against your
                friends, family, and other users who take the test!
              </Text>
              <Text>
                The following test will show you pairs of charts displaying the
                same data. Your goal is to identify which one is trying to
                decieve you or misrepresent its data. For each pair displayed,
                click on the graph that you think is the most deceptive. At the
                end of the test, your results will be displayed.
              </Text>
            </Stack>
          </Card>
          <Space h="lg"></Space>
          <Center>
            <Button size="md" onClick={handleStart}>
              Start Test
            </Button>
          </Center>
        </Container>
      </main>
    </>
  );
}
