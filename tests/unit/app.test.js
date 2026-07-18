const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Mock DOM and dependencies to satisfy evaluation of app.js
const dummyElement = {
  addEventListener: () => {},
  querySelector: () => dummyElement,
  querySelectorAll: () => [dummyElement],
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  removeAttribute: () => {},
  getAttribute: () => '',
  style: {},
  dataset: {},
  focus: () => {}
};

global.document = {
  querySelector: () => dummyElement,
  querySelectorAll: () => [dummyElement],
  getElementById: () => dummyElement,
  addEventListener: () => {}
};

global.window = {
  location: { pathname: '/' },
  addEventListener: () => {}
};

// Mock BrokerageData mock utilities
global.BrokerageData = {
  getLiveMode: () => false,
  formatCurrency: (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatChange: (val) => (val >= 0 ? '+' : '') + `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  holdings: []
};

// Load app.js
const appCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/app.js', 'utf8');
eval(appCode + `
  global.getState = () => state;
  global.getMockData = () => mockData;
  global.getOriginalMockData = () => originalMockData;
  global.syncEtradeToMockData = syncEtradeToMockData;
  global.renderMorganStanleyAccounts = renderMorganStanleyAccounts;
  global.isShowDataEnabled = isShowDataEnabled;
`);

test('App.js - Include External Accounts Toggle Logic', (t) => {
  const state = global.getState();
  const mockData = global.getMockData();
  const originalMockData = global.getOriginalMockData();

  // 1. Initial State Checks
  assert.strictEqual(state.includeExternalAccounts, false, 'includeExternalAccounts should start as false');

  // Set window.__e2e_test_active__ to simulate test environment (so data is enabled)
  global.window.__e2e_test_active__ = true;
  assert.strictEqual(global.isShowDataEnabled(), true, 'isShowDataEnabled should return true in test environment');

  // Run initial sync
  global.syncEtradeToMockData();
  
  // 2. Disabled Toggle State - MS Panel and Totals
  assert.strictEqual(global.renderMorganStanleyAccounts(), '', 'Should return empty string if includeExternalAccounts is false');
  
  const baseAssets = originalMockData.totals.totalAssets;
  const baseGain = originalMockData.totals.dayGain;
  assert.strictEqual(mockData.totals.totalAssets, baseAssets, 'totalAssets should match base mock value when toggle is off');
  assert.strictEqual(mockData.totals.dayGain, baseGain, 'dayGain should match base mock value when toggle is off');

  // 3. Enabled Toggle State - MS Panel and Totals
  state.includeExternalAccounts = true;
  global.syncEtradeToMockData();

  const renderedMSPanel = global.renderMorganStanleyAccounts();
  assert.ok(renderedMSPanel.includes('Morgan Stanley Accounts'), 'Should render Morgan Stanley Accounts panel when toggle is true');
  assert.ok(renderedMSPanel.includes('Premier CashPlus - 7306'), 'Should render individual external MS accounts in panel');

  // Parse values to verify math
  const parsedBaseAssets = parseFloat(baseAssets.replace(/[^0-9.-]/g, ''));
  const parsedMsAssets = parseFloat(originalMockData.morganStanleyAccount.assets.replace(/[^0-9.-]/g, ''));
  const expectedCombinedAssets = Math.round((parsedBaseAssets + parsedMsAssets) * 100) / 100;

  const parsedCurrentAssets = parseFloat(mockData.totals.totalAssets.replace(/[^0-9.-]/g, ''));
  assert.strictEqual(parsedCurrentAssets, expectedCombinedAssets, 'totalAssets should include external Morgan Stanley assets when toggle is enabled');

  // Reset state for safety
  state.includeExternalAccounts = false;
  global.window.__e2e_test_active__ = false;
});
