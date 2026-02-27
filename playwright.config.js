const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    // Plus besoin de "/view", on est à la racine
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: "php scripts/init_db.php && php -d xdebug.mode=off -S localhost:4173 -t public",
    // Surveille la racine '/' au lieu d'un fichier .html inexistant
    url: 'http://localhost:4173', 
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});