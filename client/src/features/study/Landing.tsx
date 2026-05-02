import {
  Button,
  Card,
  Center,
  Container,

  Stack,
  Text,
  Title,
} from "@mantine/core";
import classes from "../../styles/Page.module.css";

interface LandingProps {
  /** Callback to start the survey */
  handleStart: () => void;
}

/** Landing page displayed before starting the survey */
export function Landing({ handleStart }: LandingProps) {
  return (
    <main className={classes.container}>
      <Container size="sm" px="md">
        <Stack gap="md">
          <Title ta="center" order={1}>
            Data Defense Force
          </Title>

          <Text ta="center">
            In a world of misinformation and deception, rogue designers are
            bending axes and stretching gradients. Step into the command center,
            inspect 10 pairs of charts that seem identical, and call out the
            impostors before they rewrite the truth. Ready your perception --
            every choice sharpens the force&apos;s defenses.
          </Text>



          <Card p="lg">
            <Stack gap="sm">
              <Title order={4}>Mission Brief</Title>
              <Text>
                You&apos;ll review pairs of charts built from the same data. In
                each round, select the chart that twists the story most. Your
                final score reveals how sharp your visual instincts are.
              </Text>
              <Stack gap={0}>
                <Text>- 10 rounds</Text>
                <Text>- Pick the impostor chart</Text>
                <Text>- Score at the end</Text>
              </Stack>
            </Stack>
          </Card>



          <Center>
            <Button size="lg" radius={0} onClick={handleStart}>
              Enter the Command Center
            </Button>
          </Center>
        </Stack>
      </Container>
    </main>
  );
}
