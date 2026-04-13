import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

// Custom Vite plugin to auto-redirect subdirectories without trailing slashes
const enforceTrailingSlashPlugin = () => {
  return {
    name: "enforce-trailing-slash",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === "/admin" || req.url === "/ai-agent" || req.url === "/contribute") {
          res.writeHead(301, { Location: req.url + "/" });
          res.end();
          return;
        }
        next();
      });
    },
  };
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../"), "");
  
  return {
    plugins: [react(), enforceTrailingSlashPlugin()],
    envDir: "../",
    define: {
      // For local development, we always expect the API on port 3000.
      // In production, env.VITE_API_URL is "" (set by Docker), which triggers relative paths.
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env.VITE_API_URL ?? "http://localhost:3000"
      ),
    },
    // Set base path for GitHub Pages deployment
    base: process.env.GITHUB_ACTIONS === "true" ? "/visual-honesty/" : "/",
    server: {
      port: 5173,
      proxy: {
        "/uploads": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          admin: resolve(__dirname, "admin/index.html"),
          "ai-agent": resolve(__dirname, "ai-agent/index.html"),
          contribute: resolve(__dirname, "contribute/index.html"),
        },
      },
    },
  };
});
