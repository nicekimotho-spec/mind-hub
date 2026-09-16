import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      environment: "node",
      setupFiles: ["./test/setupEnv.ts"],
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.integration.test.ts", "**/node_modules/**"],
    },
  },
  {
    test: {
      name: "integration",
      environment: "node",
      setupFiles: ["./test/setupEnv.ts", "./test/setupIntegration.ts"],
      include: ["src/**/*.integration.test.ts"],
      // Integration tests share one Postgres test database and reset it between tests
      // (see test/setupIntegration.ts). fileParallelism alone was not enough to stop
      // vitest from running separate test files in separate worker processes — one
      // file's beforeEach reset was wiping rows another file's in-flight test had just
      // created. Pinning the whole project to a single fork process serializes every
      // test file onto one Postgres connection lifecycle and removes that race.
      fileParallelism: false,
      pool: "forks",
      poolOptions: {
        forks: { singleFork: true },
      },
    },
  },
]);
