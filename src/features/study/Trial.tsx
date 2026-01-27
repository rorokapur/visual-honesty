import { Card, Center, Image, SimpleGrid, Space, Text } from "@mantine/core";
import type { StimulusPair } from "../../lib/stimulus";

interface TrialProps {
  /**
   * The pair of images to display for this trial.
   */
  stimulus: StimulusPair;

  /**
   * Callback to handle user answer selection.
   * @param choice - the stimulus side selected by the user
   */
  onSelect: (choice: "left" | "right") => void;
}

/**
 * A component containing an individual trial of the Visual Honesty survey
 * @component
 */
export function Trial({ stimulus, onSelect }: TrialProps) {
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
          className="panels"
        >
          <Image
            src={stimulus.left.image_url}
            alt="Stimulus A"
            draggable={false}
            //TODO: Images are still selectable on Safari - need to investigate
            style={{ userSelect: "none" }}
          />
        </Card>
        <Card
          shadow="sm"
          padding="lg"
          withBorder
          radius="lg"
          onClick={() => onSelect("right")}
          className="panels"
        >
          <Image
            src={stimulus.right.image_url}
            alt="Stimulus B"
            draggable={false}
            style={{ userSelect: "none" }}
          />
        </Card>
      </SimpleGrid>
    </>
  );
}
