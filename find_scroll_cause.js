const puppeteer = require('puppeteer-core');
const path = require('path');

// Hook Express to capture the server instance for clean shutdown
const express = require('express');
const listenOriginal = express.application.listen;
let serverInstance;
express.application.listen = function(...args) {
  serverInstance = listenOriginal.apply(this, args);
  return serverInstance;
};

const TEST_PORT = 3099;
process.env.PORT = TEST_PORT.toString();
require('./server.js');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(`http://localhost:${TEST_PORT}/`);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

  console.log('--- ELIMINATION TEST ---');
  
  const initialScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Initial Document scrollWidth: ${initialScrollWidth}px`);

  const selectorsToTest = [
    'header.site-header',
    'section.dashboard-hero',
    'section.ai-details-section',
    'section.page-band.page-band--gray',
    'footer', // if any
    '.chat-launcher',
    '#agent-panel'
  ];

  for (const sel of selectorsToTest) {
    // Reload page to reset state
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));

    const result = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        // Remove the element from the DOM
        el.remove();
        return {
          removed: true,
          scrollWidth: document.documentElement.scrollWidth
        };
      }
      return { removed: false };
    }, sel);

    if (result.removed) {
      console.log(`Removing "${sel}" -> scrollWidth is now: ${result.scrollWidth}px`);
    } else {
      console.log(`Element "${sel}" not found.`);
    }
  }

  // Now, let's look closer at elements inside page-band--gray (the main dashboard layout)
  console.log('\n--- TESTING DASHBOARD CONTENT SUB-ELEMENTS ---');
  const subSelectors = [
    '.account-stack',
    '.side-rail',
    '.account-stack > *',
    '.side-rail > *',
  ];

  for (const sel of subSelectors) {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));

    const result = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => el.remove());
        return {
          removed: true,
          count: elements.length,
          scrollWidth: document.documentElement.scrollWidth
        };
      }
      return { removed: false };
    }, sel);

    if (result.removed) {
      console.log(`Removing "${sel}" (${result.count} items) -> scrollWidth is now: ${result.scrollWidth}px`);
    }
  }

  await browser.close();
  if (serverInstance) {
    serverInstance.close();
  }
}

run();
