import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: process.env.GITHUB_ACTIONS === "true" ? "/visual-honesty/" : "/",
});
