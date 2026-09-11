import {defineConfig} from '@playwright/test';

const baseURL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';

export default defineConfig({
  testDir:'./tests/functional',
  outputDir:'./test-results/functional',
  fullyParallel:true,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  workers:process.env.CI?1:2,
  reporter:[['line'],['html',{outputFolder:'playwright-report/functional',open:'never'}]],
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
