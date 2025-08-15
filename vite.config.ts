import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  // IMPORTANT: set your repo name here so GitHub Pages works when we switch to Actions
  base: "/monkeypirate/",
});
