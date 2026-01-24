import { AppShell, Burger, Group, NavLink, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { StudyData } from "./StudyData";

/**
 * Admin dashboard component to oversee and manage study.
 */
export function AdminDashboard() {
  const [opened, { toggle }] = useDisclosure();
  const [tab, setTab] = useState<"data" | "stimuli">("data");

  const mainContent = (): React.ReactNode => {
    if (tab == "data") {
      return <StudyData></StudyData>;
    } else if (tab == "stimuli") {
      return <Text>stimuli</Text>;
    }
    return <Text>Select a tab to get started</Text>;
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={2}>Visual Honesty Admin Dashboard</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink label="Data" onClick={() => setTab("data")} />
        <NavLink label="Stimuli" onClick={() => setTab("stimuli")} />
      </AppShell.Navbar>
      <AppShell.Main>{mainContent()}</AppShell.Main>
    </AppShell>
  );
}
