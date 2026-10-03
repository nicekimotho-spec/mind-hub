import { defineConfig } from "vitest/config";

// Vitest 3+ replaced the separate `vitest.workspace.ts` file with an inline
// `test.projects` array in the main config (defineWorkspace was removed in v5).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["./test/setupEnv.ts"],
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts", "**/node_modules/**", "**/dist/**"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./test/setupEnv.ts", "./test/setupIntegration.ts"],
          include: ["src/**/*.integration.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**"],
          // Integration tests share one Postgres test database and reset it between
          // tests (see test/setupIntegration.ts). fileParallelism alone did not stop
          // vitest from running separate test files in separate worker processes — one
          // file's beforeEach reset was wiping rows another file's in-flight test had
          // just created. Pinning to a single fork process serializes every test file
          // onto one Postgres connection lifecycle and removes that race.
          fileParallelism: false,
          pool: "forks",
          singleFork: true,
        },
      },
    ],
  },
});
