import path from "node:path";

import { defineConfig } from "vitest/config";

// `.mts` rather than `.ts`: the config is ESM, and the project has no
// `"type": "module"` — which Next would rather it did not have.
export default defineConfig({
  test: {
    // Node, not jsdom: this suite covers server actions and utilities only.
    // Components are verified in the browser, so there is no DOM to emulate
    // and no jsdom dependency to install.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        // next-auth reaches for `next/server`, which Node cannot resolve on its
        // own from inside an externalised dependency. Inlining hands the module
        // to Vite, which resolves it the way the app does.
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json. Done by hand rather than with
    // vite-tsconfig-paths, since one alias does not justify a dependency.
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
