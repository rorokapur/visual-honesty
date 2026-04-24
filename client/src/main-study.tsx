import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css"; // MUST be first
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Study from "./Study";
import { theme } from "./theme/theme";

/**
 * React app root, applies MantineProvider.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Study />
    </MantineProvider>
  </React.StrictMode>,
);
