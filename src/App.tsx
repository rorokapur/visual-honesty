import { Button, Group, Title, Container, Paper, Text } from '@mantine/core';

export default function App() {
  return (
    <Container size="sm" py="xl">
      <Paper shadow="xs" p="xl" withBorder>
        <Title order={1} mb="xs">Mantine Check</Title>
        <Text c="dimmed" mb="lg">
          If you see a blue button and rounded corners, the install is successful.
        </Text>
        
        <Group>
          <Button variant="filled" color="blue">
            Mantine Button
          </Button>
          <Button variant="outline" color="red">
            Outline Button
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}