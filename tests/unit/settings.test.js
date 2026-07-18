const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// 1. Mock globals
global.state = {
  aiSettings: {
    allowedSources: {
      yahoo: true,
      sec: true,
      bloomberg: true,
      reuters: true,
      morningstar: true,
      private_holdings: true,
      private_transactions: true,
      private_tax: true,
    },
    accessMode: 'read-write',
    tradeExecutionMode: 'execute',
    piiScrubbingEnabled: true,
  }
};

global.mockData = {
  user: { refreshedAt: '10:00 AM' }
};

global.fetch = async (url) => {
  if (url.includes('/api/search')) {
    const decUrl = decodeURIComponent(url);
    if (decUrl.includes('nvidia') || decUrl.includes('blackwell')) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            title: 'NVIDIA Surge Continued on Blackwell Demand',
            content: 'NVIDIA (NVDA) stock rose 5.4% following reports of unprecedented demand for its next-generation Blackwell B200 AI GPUs. [Source: Yahoo Finance]',
            source: 'yahoo'
          }
        ]
      };
    }
  }
  return {
    ok: false,
    status: 500,
    json: async () => []
  };
};

// 2. Load settings.js code
const settingsCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/settings.js', 'utf8');
eval(settingsCode);

// 3. Load agents.js code to get toolImplementations
const agentsCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/agents.js', 'utf8');
eval(agentsCode + '\nglobal.AgentManager = AgentManager;');

test('AI Settings - renderAISettings() UI Structure', (t) => {
  assert.ok(typeof renderAISettings === 'function', 'renderAISettings should be defined');
  const html = renderAISettings();
  assert.ok(html.includes('AI Settings &amp; Guardrails') || html.includes('AI Settings & Guardrails'), 'Should render page title');
  assert.ok(html.includes('System Access Level'), 'Should render access levels');
  assert.ok(html.includes('Trade Execution Guardrails'), 'Should render trade guardrails');
  assert.ok(html.includes('Active PII Scrubbing'), 'Should render PII settings');
  assert.ok(html.includes('Bloomberg'), 'Should render info sources');
});

test('AI Settings - searchFinancialInfo Whitelist & Blacklist', async (t) => {
  // Test 1: Yahoo search matches Nvidia when whitelisted
  state.aiSettings.allowedSources.yahoo = true;
  const nvdaResult = await AgentManager.callTool('searchFinancialInfo', { query: 'nvidia stock' });
  assert.ok(nvdaResult.includes('NVIDIA Surge Continued'), 'Should find Yahoo NVDA article');
  assert.ok(nvdaResult.includes('[Source: Yahoo Finance]'), 'Should contain Yahoo Finance citation');

  // Test 2: Yahoo search blocked when blacklisted and queried explicitly
  state.aiSettings.allowedSources.yahoo = false;
  const nvdaResultBlocked = await AgentManager.callTool('searchFinancialInfo', { query: 'yahoo nvidia stock' });
  assert.ok(nvdaResultBlocked.includes('Access Blocked') || nvdaResultBlocked.includes('blocked') || nvdaResultBlocked.includes('no matching results') || nvdaResultBlocked.includes('yielded no matching results'), 'Should report blocked or no results');

  // Test 2b: Yahoo search blocked when blacklisted and passed via source parameter
  const nvdaResultBlockedParam = await AgentManager.callTool('searchFinancialInfo', { query: 'nvidia stock', source: 'yahoo' });
  assert.ok(nvdaResultBlockedParam.includes('blocked') || nvdaResultBlockedParam.includes('Access Blocked'), 'Should report blocked via source param');

  // Restore state
  state.aiSettings.allowedSources.yahoo = true;
});

test('AI Settings - Read-Only Access Blocks Write Tools', (t) => {
  // Set Read-Write: tools should run successfully or return parameter errors, not guardrail block errors
  state.aiSettings.accessMode = 'read-write';
  const navResultRW = AgentManager.callTool('navigateToPage', { path: '/accounts' });
  assert.ok(!navResultRW.includes('Read-Only mode'), 'Should not block under Read-Write');

  // Set Read-Only: navigateToPage tool should be blocked
  state.aiSettings.accessMode = 'read-only';
  const navResultRO = AgentManager.callTool('navigateToPage', { path: '/accounts' });
  assert.ok(navResultRO.includes('Read-Only mode') || navResultRO.includes('blocked'), 'Should block navigation under Read-Only mode');

  // Restore state
  state.aiSettings.accessMode = 'read-write';
});

test('AI Settings - searchFinancialInfo Priority Tiers', async (t) => {
  // Setup: make sure private holdings and yahoo are allowed
  state.aiSettings.allowedSources.private_holdings = true;
  state.aiSettings.allowedSources.private_transactions = true;
  state.aiSettings.allowedSources.yahoo = true;

  // ── Scenario A: Disconnected State ──
  // Querying holdings ("nvidia holdings") when disconnected should return the warning message.
  const nvdaPriority = await AgentManager.callTool('searchFinancialInfo', { query: 'nvidia holdings' });
  assert.ok(nvdaPriority.includes('Live Account Disconnected') || nvdaPriority.includes('disconnected'), 'Should indicate live account is disconnected');

  // Querying something that only matches public search ("blackwell") -> should return Yahoo Finance via mocked fetch
  const blackwellResult = await AgentManager.callTool('searchFinancialInfo', { query: 'blackwell' });
  assert.ok(blackwellResult.includes('NVIDIA Surge Continued'), 'Should find Tier 2 Yahoo article from live search proxy');

  // ── Scenario B: Live Mode (Dynamic Serialization of active memory data) ──
  global.BrokerageData = {
    getLiveMode: () => true,
    holdings: [
      { symbol: 'XYZ', name: 'XYZ Corp', shares: 100, currentPrice: 50.00, marketValue: 5000.00, totalReturnPct: 10.0 }
    ],
    transactions: [
      { date: '2026-06-10', type: 'BUY', symbol: 'XYZ', shares: 100, price: 50.00, total: 5000.00, status: 'Filled' }
    ],
    getPortfolioSummary: () => ({
      totalValue: 5000.00,
      cashBalance: 1000.00
    }),
    account: {
      cashBalance: 1000.00
    }
  };

  // Test dynamic holdings serialization
  const liveHoldings = await AgentManager.callTool('searchFinancialInfo', { query: 'xyz holdings' });
  assert.ok(liveHoldings.includes('Live E*TRADE Portfolio Holdings Summary'), 'Should format live holdings summary');
  assert.ok(liveHoldings.includes('XYZ (XYZ Corp): 100 shares @ $50.00'), 'Should contain details of live holding');
  assert.ok(liveHoldings.includes('[Source: Live E*TRADE Portfolio]'), 'Should cite live portfolio source');

  // Test dynamic transactions serialization
  const liveTransactions = await AgentManager.callTool('searchFinancialInfo', { query: 'recent trades' });
  assert.ok(liveTransactions.includes('Live E*TRADE Transaction History'), 'Should format live transactions summary');
  assert.ok(liveTransactions.includes('BUY XYZ 100 shares @ $50.00'), 'Should contain details of live transaction');
  assert.ok(liveTransactions.includes('[Source: Live E*TRADE Transactions]'), 'Should cite live transactions source');

  // Cleanup
  delete global.BrokerageData;
});
