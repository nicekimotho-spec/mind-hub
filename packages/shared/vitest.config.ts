import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // `tsc -b` emits *.test.js into dist/ alongside the real build output (test files
    // are still type-checked, just not excluded from compilation — see tsconfig.json).
    // Without this exclude, Vitest's default discovery matches both the .ts source and
    // the compiled .js copy and silently runs every test twice.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
