const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Mock DOM and globals
global.document = {
  getElementById: () => ({
    addEventListener: () => {},
    value: ''
  })
};

// Load insights.js code
const code = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/insights.js', 'utf8');
eval(code + '\nglobal.AIInsightsPage = AIInsightsPage;');

test('AI Insights Hub Page - renderView', (t) => {
  assert.ok(global.AIInsightsPage !== undefined, 'AIInsightsPage module should be defined');
  
  const html = global.AIInsightsPage.renderView();
  
  // Verify main header and sections
  assert.ok(html.includes('AI Insights Hub'), 'Should render page title');
  assert.ok(html.includes('Your Dedicated AI Advisory Fleet'), 'Should render agent team section');
  assert.ok(html.includes('Portfolio Optimizer'), 'Should render Portfolio Optimizer agent card');
  assert.ok(html.includes('Tax Specialist'), 'Should render Tax Specialist agent card');
  assert.ok(html.includes('Retirement Guide'), 'Should render Retirement Guide agent card');
  assert.ok(html.includes('Risk Watchdog'), 'Should render Risk Watchdog agent card');
  
  // Verify feed recommendations
  assert.ok(html.includes('Proactive Agent Recommendations'), 'Should render feed header');
  assert.ok(html.includes('Portfolio Concentration'), 'Should render Concentration recommendation');
  assert.ok(html.includes('Retirement Wealth Tracking'), 'Should render Retirement recommendation');
  assert.ok(html.includes('Tax-Loss Harvesting Alert'), 'Should render Tax Harvesting recommendation');
  
  // Verify Sandbox section
  assert.ok(html.includes('What-If Scenario Sandbox'), 'Should render Sandbox header');
  assert.ok(html.includes('Analyze Trade Scenario'), 'Should render simulation analysis trigger button');
});
