import { powerApps } from "@microsoft/power-apps-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), powerApps()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      "/nba-api": {
        target: "https://api.server.nbaapi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba-api/, ""),
      },
    },
  },
});
