import { Center, Container, Stack, Text, Title } from "@mantine/core";

//TODO: Add props for results information

/**
 * Results page displayed after survey completion
 * * TODO: show users score
 */
export function Results() {
  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ padding: "16px 0" }}>
            <Title ta="center">Survey Complete!</Title>
          </Center>
        </Container>
      </header>
      <main>
        <Container size="sm" px="md">
          <Stack align="center" gap="md">
            <Text>
              Eventually, this page will show you your results and score based
              on test performance.
            </Text>
          </Stack>
        </Container>
      </main>
    </>
  );
}
