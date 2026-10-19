import {defineConfig} from '@playwright/test';

const baseURL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';

export default defineConfig({
  testDir:'./tests/porch-night',
  outputDir:'./test-results/porch-night',
  fullyParallel:false,
  forbidOnly:!!process.env.CI,
  retries:0,
  workers:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report/porch-night',open:'never'}]],
  expect:{
    timeout:10000
  },
  use:{
    baseURL,
    browserName:'chromium',
    viewport:{width:1440,height:900},
    deviceScaleFactor:1,
    locale:'en-US',
    timezoneId:'America/New_York',
    colorScheme:'light',
    reducedMotion:'reduce',
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  webServer:{
    command:'node scripts/serve-public.mjs',
    url:baseURL,
    reuseExistingServer:!process.env.CI,
    timeout:15000
  }
});
