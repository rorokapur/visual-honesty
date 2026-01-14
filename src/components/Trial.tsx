import { Card, Center, Image, SimpleGrid, Space, Text } from "@mantine/core";
import type { Stimulus } from "../data/stimuli";
interface TrialProps {
  stimulus: Stimulus;
  onSelect: (choice: "left" | "right") => void;
  isFlipped: boolean;
}

export function Trial({ stimulus, onSelect, isFlipped }: TrialProps) {
  return (
    <>
      <Center>
        <Text size="xl">Select the deceptive visualization below</Text>
      </Center>
      <Space h="xl" />
      <SimpleGrid cols={2} spacing="xl">
        <Card
          shadow="sm"
          padding="lg"
          withBorder
          radius="lg"
          onClick={() => onSelect("left")}
        >
          <Image
            src={isFlipped ? stimulus.deceptiveImage : stimulus.honestImage}
            alt="Stimulus A"
          />
        </Card>
        <Card
          shadow="sm"
          padding="lg"
          withBorder
          radius="lg"
          onClick={() => onSelect("right")}
        >
          <Image
            src={isFlipped ? stimulus.honestImage : stimulus.deceptiveImage}
            alt="Stimulus B"
          />
        </Card>
      </SimpleGrid>
    </>
  );
}
