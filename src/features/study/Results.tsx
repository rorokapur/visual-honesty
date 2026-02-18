import {
  Center,
  Container,
  List,
  ListItem,
  Space,
  Stack,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  fetchCategoryStats,
  fetchResults,
  type CategoryStats,
  type ParticipantResults,
} from "../../lib/participant_results";
import { CategoryRadarChart } from "./CategoryRadarChart";
import { ResultsCard } from "./ResultsCard";
import { useSessionContext } from "./session/useSessionContext";

/**
 * Results page displayed after survey completion
 * @component
 */
export function Results() {
  const { sessionId } = useSessionContext();
  const [overallResults, setOverallResults] =
    useState<ParticipantResults | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[] | null>(
    null,
  );

  useEffect(() => {
    const loadResults = async () => {
      const overall = await fetchResults(sessionId);
      if (overall) {
        setOverallResults(overall);
      } else {
        alert("An error occured while trying to fetch your results!");
      }

      const categories = await fetchCategoryStats(sessionId);
      if (categories) {
        setCategoryStats(categories);
      } else {
        alert("An error occured while trying to fetch category stats!");
      }
    };
    loadResults();
  }, [sessionId]);

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
            <Center>
              <ResultsCard data={overallResults}></ResultsCard>
            </Center>
            <b>Percentage correct by category:</b>
            <Center
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
              }}
            >
              <CategoryRadarChart data={categoryStats ? categoryStats : []} />
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
                from a single viewpoint in 2D it misrepresents the data.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Area vs Radius Encoding: </b>
                When using the size of cirlces to display differences in data
                values, mapping the data to radius instead of area can make
                smaller differences seem more pronoucned, since the area is
                being squared relative to the data.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Cherry Picking: </b>
                Using some of the techniques above (particularly x-axis
                truncation), we were able to hide sections of data. While the
                data visualized on its own may still be accurate, it might be
                interpreted incorrectly since there is missing context.
              </ListItem>
              <Space h="xl"></Space>
            </List>
          </Stack>
        </Container>
      </main>
    </>
  );
}
