import { Center, Container, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  fetchResults,
  type ParticipantResults,
} from "../../lib/participant";
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

  useEffect(() => {
    const loadResults = async () => {
      try {
        const overall = await fetchResults(sessionId);
        setOverallResults(overall);
      } catch (e) {
        console.error("Failed to load general stats", e);
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
          <Center>
            <ResultsCard data={overallResults}></ResultsCard>
          </Center>
        </Container>
      </main>
    </>
  );
}
