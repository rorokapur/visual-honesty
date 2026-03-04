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
    <main className="pixel-landing">
      <Container size="sm" px="md">
        <Stack gap="md">
          <Title ta="center" order={1} className="pixel-title">
            Information Defender Guild
          </Title>

          <Text className="pixel-copy" ta="center">
            Rogue designers are bending axes and stretching gradients. Step into
            the war room, inspect 10 pairs of charts that seem identical, and
            call out the impostors before they rewrite the truth. Ready your
            perception -- every tap sharpens the guild&apos;s defenses.
          </Text>

          <Space h="xs" />

          <Card className="pixel-card" p="lg">
            <Stack gap="sm">
              <Title order={4} className="pixel-title">
                Mission Brief
              </Title>
              <Text className="pixel-copy">
                You&apos;ll review chart duels built from the same data. In each
                round, select the chart that twists the story most. Your final
                score reveals how sharp your visual instincts are.
              </Text>
              <Stack gap={0}>
                <Text className="pixel-copy">- 10 rounds</Text>
                <Text className="pixel-copy">- Pick the impostor chart</Text>
                <Text className="pixel-copy">- Score at the end</Text>
              </Stack>
            </Stack>
          </Card>

          <Space h="sm" />

          <Center>
            <Button
              size="lg"
              radius={0}
              className="pixel-button"
              onClick={handleStart}
            >
              Enter the War Room
            </Button>
          </Center>
        </Stack>
      </Container>
    </main>
  );
}
