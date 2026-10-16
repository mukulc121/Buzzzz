import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { relay } from "./server/relay.ts";
export default defineConfig({
  plugins: [...react(), relay()],
  server: { host: true, port: 5173, strictPort: true, cors: false },
});
