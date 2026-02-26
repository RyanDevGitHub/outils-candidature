const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: "bash -lc 'php scripts/init_db.php && (php -S 127.0.0.1:8000 -t public >/tmp/php-server.log 2>&1 &) && (python3 -m http.server 4173 >/tmp/frontend-server.log 2>&1 &) && wait'",
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
