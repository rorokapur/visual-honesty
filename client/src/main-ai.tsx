import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css"; // MUST be first
import React from "react";
import ReactDOM from "react-dom/client";
import AiStudy from "./AiStudy";
import "./index.css"; // Assuming shared CSS

/**
 * React app root for AI study, applies MantineProvider.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider>
      <AiStudy />
    </MantineProvider>
  </React.StrictMode>,
);
