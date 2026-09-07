import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/rendering',
  outputDir: './e2e/.artifacts/rendering',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:45185', viewport: { width: 1280, height: 900 } },
  webServer: {
    command: 'bun run dev --host 127.0.0.1 --port 45185 --strictPort',
    url: 'http://127.0.0.1:45185',
    reuseExistingServer: false,
  },
})
