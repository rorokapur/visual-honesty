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
  fetchCategoryStats,
  fetchResults,
  fetchTimeAccuracyBenchmarks,
  type CategoryStats,
  type ParticipantResults,
  type TimeAccuracyBenchmarkData,
} from "../../lib/participant";
import classes from "../../styles/Page.module.css";
import { CategoryRadarChart } from "./CategoryRadarChart";
import { ResultsCard } from "./ResultsCard";
import { useSessionContext } from "./session/useSessionContext";
import { TimeAccuracyChart } from "./TimeAccuracyChart";

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
  const [timeAccuracyBenchmarkData, setTimeAccuracyBenchmarkData] =
    useState<TimeAccuracyBenchmarkData | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const overall = await fetchResults(sessionId);
        setOverallResults(overall);
      } catch (e) {
        console.error("Failed to load general stats", e);
      }

      try {
        const categories = await fetchCategoryStats(sessionId);
        setCategoryStats(categories);
      } catch (e) {
        console.error("Failed to load category stats", e);
      }

      try {
        const benchmarks = await fetchTimeAccuracyBenchmarks();
        setTimeAccuracyBenchmarkData(benchmarks);
      } catch (e) {
        console.error("Failed to load time/accuracy benchmarks", e);
      }
    };
    loadResults();
  }, [sessionId]);

  return (
    <main className={classes.container}>
      <header>
        <Container px="md">
          <Center style={{ paddingBottom: "1rem" }}>
            <Title ta="center">Mission Complete</Title>
          </Center>
        </Container>
      </header>
      <div>
        <Container size="sm" px="md">
          <Stack gap="md">
            <Center>
              <ResultsCard data={overallResults}></ResultsCard>
            </Center>
            <Center
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
              }}
            >
              <CategoryRadarChart data={categoryStats ? categoryStats : []} />
            </Center>
            {overallResults && timeAccuracyBenchmarkData && (
              <>
                <TimeAccuracyChart
                  data={timeAccuracyBenchmarkData}
                  currentUser={{
                    time: overallResults.average_time,
                    accuracy: overallResults.accuracy_percentage,
                  }}
                />
              </>
            )}
            <Text fw="bold" size="md">
              Still Curious? Here are some of the kinds of deception you
              encountered:
            </Text>
            <List>
              <ListItem>
                <b>Axis Truncation: </b>
                By changing the start and end points of the x and y axes on
                graphs, designers can make small fluctuations in data look very
                large and make small differences between values look signficant.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>3D Distortion: </b>
                By displaying tradionally 2D charts in 3D, designers can distort
                visualizations, making some regions seem bigger than others.
                While this is accurate from a 3D perspective, when seen from a
                single viewpoint in 2D it misrepresents the data.
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
                truncation), designers can hide sections of data. While the data
                visualized on its own may still be accurate, it might be
                interpreted incorrectly since there is missing context.
              </ListItem>
              <Space h="xl"></Space>
            </List>
          </Stack>
        </Container>
      </div>
    </main>
  );
}
