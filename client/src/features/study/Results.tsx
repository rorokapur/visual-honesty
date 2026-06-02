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
            <Title ta="center" order={1} fz={{ base: "24px", sm: "36px" }}>
              Mission Complete
            </Title>
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
              }}
              h={{ base: 300, sm: 420 }}
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
              Want to contribute some charts of your own?{" "}
              <a href="/contribute">Submit them here!</a>
            </Text>
            <Text fw="bold" size="md">
              Still Curious? Here are some of the different kinds of deception
              you encountered:
            </Text>
            <List>
              <ListItem>
                <b>Statistics: </b>
                Common statistical techniques like binning and smoothing can be
                strategically used to conceal or fabricate trends in data. For
                example, when splitting data into time ranges, a designer could
                but a break right in the middle of a concentrated group of data
                points, gerrymandering into two bins and hiding the peak.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Container: </b>
                By manipulating the parameters of the container on which data is
                drawn (axes, scales, etc.), chart designers can create charts
                that are techniucally correct, but portary an inaccurate picture
                of the data at first glance. For example, by changing the start
                and end points of the x and y axes on graphs, designers can make
                small fluctuations in data look very large and make small
                differences between values look signficant.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Encoding: </b>
                By tampering with the ways that data is visually encoded on a
                chart, designers can over- or under-emphasize trends. For
                example, a common technique is mapping a value to the radius of
                a circle rather than area, making an increase look quadratically
                bigger.
              </ListItem>
              <Space h="sm"></Space>
              <ListItem>
                <b>Styling: </b>
                By following (or breaking) common style patterns, chart
                designers can change the emphasis and perception of data. For
                example, colors like red and green can be used to subtly steer
                viewers towards postiive or negative associations regarless of
                the underlying data reality.
              </ListItem>
              <Space h="xl"></Space>
            </List>
          </Stack>
        </Container>
      </div>
    </main>
  );
}
