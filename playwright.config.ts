import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "phone", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: `node -e "require('fs').rmSync('.data/e2e-verifier.db',{force:true})" && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { VERIFIER_DB_PATH: ".data/e2e-verifier.db", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
