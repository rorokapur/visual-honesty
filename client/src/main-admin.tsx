import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css"; // MUST be first
import React from "react";
import ReactDOM from "react-dom/client";
import Admin from "./Admin";
import "./index.css";

/**
 * React app root, applies MantineProvider.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider>
      <Admin />
    </MantineProvider>
  </React.StrictMode>,
);
