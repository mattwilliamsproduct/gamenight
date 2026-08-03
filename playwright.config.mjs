import {defineConfig} from '@playwright/test';

const baseURL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';

export default defineConfig({
  testDir:'./tests/visual',
  outputDir:'./test-results',
  fullyParallel:false,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  workers:process.env.CI?1:2,
  reporter:[['line'],['html',{outputFolder:'playwright-report',open:'never'}]],
  snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  expect:{
    timeout:10000,
    toHaveScreenshot:{animations:'disabled',caret:'hide',maxDiffPixelRatio:0.008,scale:'css'}
  },
  use:{
    baseURL,
    locale:'en-US',
    timezoneId:'America/New_York',
    colorScheme:'light',
    reducedMotion:'reduce',
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  projects:[
    {
      name:'ipad-landscape-webkit',
      use:{browserName:'webkit',viewport:{width:1194,height:834},deviceScaleFactor:1,hasTouch:true,isMobile:true}
    },
    {
      name:'laptop-chromium',
      use:{browserName:'chromium',viewport:{width:1440,height:900},deviceScaleFactor:1}
    },
    {
      name:'tv-1080p-chromium',
      use:{browserName:'chromium',viewport:{width:1920,height:1080},deviceScaleFactor:1}
    }
  ],
  webServer:{
    command:'node scripts/serve-public.mjs',
    url:baseURL,
    reuseExistingServer:!process.env.CI,
    timeout:15000
  }
});
