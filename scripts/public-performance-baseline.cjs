'use strict';
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = (process.env.THQ_BASE_URL || '').replace(/\/$/, '');
if (!base || !/^https:\/\//.test(base)) {
  console.error('Set THQ_BASE_URL to an HTTPS staging site. This script does not target production by default.');
  process.exit(2);
}
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (const route of ['/bhmff','/bhmff/fixtures','/bhmff/results','/bhmff/teams','/pettswood-vets1']) {
      const page = await browser.newPage({viewport:{width:1280,height:800}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const start = Date.now();
      const response = await page.goto(`${base}${route}`, {waitUntil:'domcontentloaded',timeout:30000});
      await page.getByText('Loading organisation...', {exact:true}).waitFor({state:'hidden',timeout:30000}).catch(()=>{});
      const durationMs = Date.now()-start;
      const nav = await page.evaluate(() => {const n=performance.getEntriesByType('navigation')[0]; return n ? {responseEndMs:Math.round(n.responseEnd), domContentLoadedMs:Math.round(n.domContentLoadedEventEnd)} : null;});
      results.push({route, status:response?.status(), durationMs, navigation:nav, errors});
      await page.close();
    }
    fs.writeFileSync('performance-results.json', JSON.stringify({capturedAt:new Date().toISOString(),base,results},null,2));
    console.log(JSON.stringify(results,null,2));
    if(results.some(r => r.status >= 400 || r.errors.length)) process.exitCode=1;
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
