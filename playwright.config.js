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
    /**
     * Ici, on lance deux serveurs simples :
     * 1. PHP pour ton API (port 4173)
     * 2. Un serveur statique pour tes fichiers HTML/JS (port 4173)
     */
    command: "php scripts/init_db.php && npx concurrently \"php -d xdebug.mode=off -S 127.0.0.1:4173 -t public\" \"npx http-server . -p 4173 -a 127.0.0.1\"",
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});