import {
  Center,
  Container,
  List,
  ListItem,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  fetchResults,
  type ParticipantResults,
} from "../../lib/participant_results";
import { ResultsCard } from "./ResultsCard";

interface ResultsProps {
  /** Session ID of user to fetch statistics for */
  session: string;
}

/**
 * Results page displayed after survey completion
 * @component
 */
export function Results({ session }: ResultsProps) {
  const [data, setData] = useState<ParticipantResults | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      const results = await fetchResults(session);
      if (results) {
        setData(results);
      } else {
        alert("An error occured while trying to fetch your results!");
      }
    };
    loadResults();
  }, [session]);

  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ paddingBottom: "1rem" }}>
            <Title ta="center">Test Complete</Title>
          </Center>
        </Container>
      </header>
      <main>
        <Container size="sm" px="md">
          <Stack gap="md">
            <Text>
              Thank you for completing our test! We hope you enjoyed seeing some
              of the ways that data visualizations can deceive you. Some
              statistics about your performance can be seen below, and we will
              likely add more in the future!
            </Text>
            <Center>
              <ResultsCard data={data}></ResultsCard>
            </Center>
            <b>
              Still Curious? Here are some of the ways we tried to deceive you:
            </b>
            <List>
              <ListItem>
                <b>Axis Truncation: </b>
                By changing the start and end points of the x and y axes on
                graphs, we were able to make small fluctuations in data look
                very large and make small differences between values look
                signficant.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>3D Distortion: </b>
                By displaying tradionally 2D charts in 3D, we were able to
                distort the visualization, making some regions seem bigger than
                others. While this is accurate from a 3D perspective, when seen
                from a single viewpoint in 2D in misrepresents the data.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Area vs Radius Encoding: </b>
                When using the size of cirlces to display differences in data
                values, mapping the data to radius instead of area can make
                smaller differnces seem more pronoucned, since the area is being
                squared relative to the data.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Cherry Picking: </b>
                Using some of the techniques above (particularly x-axis
                truncation), we were able to hide sections of data. While the
                data visualized on its own may still be accurate, it might be
                interpreted incorrectly since there is missing context.
              </ListItem>
            </List>
          </Stack>
        </Container>
      </main>
    </>
  );
}
