import { Center, Container, Title } from "@mantine/core";
import { useState } from "react";
import { SurveyContainer } from "./components/SurveyContainer";

export default function App() {
  const [session] = useState(() => {
    const KEY = "vh_session_id";
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const newId = window.crypto.randomUUID();
    localStorage.setItem(KEY, newId);
    return newId;
  });

  const [hasTaken] = useState(() => {
    const KEY = "vh_taken";
    const existing = localStorage.getItem(KEY);
    return existing === "true";
  });

  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ padding: "16px 0" }}>
            <Title ta="center">Can you spot the deceptive visualization?</Title>
          </Center>
        </Container>
      </header>
      <main style={{ padding: "16px" }}>
        <SurveyContainer session={session} hasTaken={hasTaken} />
      </main>
    </>
  );
}
