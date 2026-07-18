const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Mock global variables to satisfy load-time declarations
global.window = {
  location: { pathname: '/' }
};
global.state = {};
global.BrokerageData = {
  holdings: [],
  getPortfolioSummary: () => ({ topHoldings: [] }),
  getQuote: () => null,
  sectorAllocation: {},
  marketIndices: [],
  faq: [],
  formatCurrency: (v) => `$${v}`,
  formatPercent: (v) => `${v}%`,
  formatChange: (v) => `${v}`,
  formatVolume: (v) => `${v}`
};

// Load and execute agents.js
const code = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/agents.js', 'utf8');
eval(code + '\nglobal.AgentManager = AgentManager;');

test('AgentManager - Dynamic Registration & Deregistration', (t) => {
  const originalCount = AgentManager.getAllAgents().length;

  const config = {
    id: 'tax-helper',
    name: 'Tax Helper',
    icon: '💸',
    iconBg: 'purple',
    description: 'Helps with capital gains and tax-loss harvesting',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    tools: ['getPortfolioHoldings'],
    systemPrompt: 'You are a tax helper.'
  };

  // Register new agent
  AgentManager.registerAgent(config);
  assert.strictEqual(AgentManager.getAllAgents().length, originalCount + 1, 'Registry length should increase by 1');
  
  const fetched = AgentManager.getAgent('tax-helper');
  assert.strictEqual(fetched.name, 'Tax Helper');
  assert.strictEqual(fetched.icon, '💸');

  // Update existing agent configuration
  AgentManager.registerAgent({ ...config, name: 'Tax Advisor' });
  assert.strictEqual(AgentManager.getAllAgents().length, originalCount + 1, 'Registry length should not change on update');
  assert.strictEqual(AgentManager.getAgent('tax-helper').name, 'Tax Advisor');

  // Deregister
  const removed = AgentManager.deregisterAgent('tax-helper');
  assert.strictEqual(removed.id, 'tax-helper');
  assert.strictEqual(AgentManager.getAllAgents().length, originalCount, 'Registry should revert to original size');
});

test('AgentManager - Auto Routing for Dynamic Agents', (t) => {
  const config = {
    id: 'tax-helper',
    name: 'Tax Helper',
    icon: '💸',
    iconBg: 'purple',
    description: 'Helps with capital gains and tax-loss harvesting',
    keywords: ['tax-loss', 'harvesting', 'capital gains'],
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    tools: ['getPortfolioHoldings'],
    systemPrompt: 'You are a tax helper.'
  };

  AgentManager.registerAgent(config);

  // Match keyword from name/description
  const route1 = AgentManager.autoRoute('How can I do tax harvesting?', 'dashboard');
  assert.strictEqual(route1, 'tax-helper', 'Should route to tax-helper based on description matching keyword "harvesting"');

  // Match keyword from custom keywords list
  const route2 = AgentManager.autoRoute('Tell me about capital gains', 'dashboard');
  assert.strictEqual(route2, 'tax-helper', 'Should route to tax-helper based on custom keywords');

  // Clean up
  AgentManager.deregisterAgent('tax-helper');
});
