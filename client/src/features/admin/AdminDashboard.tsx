import { AppShell, Burger, Group, NavLink, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { CategoryManager } from "./CategoryManager";
import { DataViewer } from "./DataViewer";
import { ResultsViewer } from "./ResultsViewer";
import { StimuliManager } from "./StimuliManager";

/**
 * Admin dashboard component to oversee and manage study.
 * @component
 */
export function AdminDashboard() {
  const [opened, { toggle }] = useDisclosure();
  const [tab, setTab] = useState<"data" | "stimuli" | "results" | "categories">(
    "data",
  );

  const mainContent = (): React.ReactNode => {
    if (tab == "data") {
      return <DataViewer></DataViewer>;
    } else if (tab == "stimuli") {
      return <StimuliManager />;
    } else if (tab == "results") {
      return <ResultsViewer />;
    } else if (tab == "categories") {
      return <CategoryManager />;
    }
    // Fallback placeholder
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
        <NavLink
          label="Responses"
          active={tab === "data"}
          onClick={() => setTab("data")}
        />
        <NavLink
          label="Results"
          active={tab === "results"}
          onClick={() => setTab("results")}
        />
        <NavLink
          label="Stimuli Manager"
          active={tab === "stimuli"}
          onClick={() => setTab("stimuli")}
        />
        <NavLink
          label="Categories"
          active={tab === "categories"}
          onClick={() => setTab("categories")}
        />
      </AppShell.Navbar>
      <AppShell.Main>{mainContent()}</AppShell.Main>
    </AppShell>
  );
}
