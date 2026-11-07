import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Everything listens on 127.0.0.1: "localhost" can mean IPv6 on Windows, where the API isn't.
    // A fixed port fails loudly if it's taken, instead of quietly moving to another one.
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/socket.io": { target: "http://127.0.0.1:3000", ws: true },
    },
  },
  test: {
    environment: "jsdom",
  },
});
