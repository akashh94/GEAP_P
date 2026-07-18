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

test('AgentManager - Metadata and Lists', (t) => {
  const agents = AgentManager.getAllAgents();
  assert.strictEqual(agents.length, 6, 'Should have exactly 6 agents');

  const analyst = AgentManager.getAgent('portfolio-analyst');
  assert.strictEqual(analyst.id, 'portfolio-analyst');
  assert.strictEqual(analyst.name, 'Portfolio Analyst');

  const superAgent = AgentManager.getAgent('market-research-super-agent');
  assert.strictEqual(superAgent.id, 'market-research-super-agent');
  assert.strictEqual(superAgent.name, 'Market Research Super Agent');

  const mortgage = AgentManager.getAgent('mortgage-agent');
  assert.strictEqual(mortgage.id, 'mortgage-agent');
  assert.strictEqual(mortgage.name, 'Mortgage Agent');

  const tools = AgentManager.getToolList();
  assert.ok(tools.includes('getPortfolioHoldings'));
  assert.ok(tools.includes('navigateToPage'));
});

test('AgentManager.autoRoute - Keyword Matching', (t) => {
  // Portfolio Analyst keywords
  assert.strictEqual(
    AgentManager.autoRoute('Help me rebalance my allocation', 'dashboard'),
    'portfolio-analyst'
  );

  // Trade Assistant keywords
  assert.strictEqual(
    AgentManager.autoRoute('I want to buy some stock and execute limit order', 'dashboard'),
    'trade-assistant'
  );

  // Market Research keywords
  assert.strictEqual(
    AgentManager.autoRoute('Analyze AAPL valuation metrics and P/E ratio', 'dashboard'),
    'market-research'
  );

  // Customer Support keywords
  assert.strictEqual(
    AgentManager.autoRoute('Where can I download my tax document statements?', 'dashboard'),
    'customer-support'
  );
  // Market Research company queries
  assert.strictEqual(
    AgentManager.autoRoute('Who is the CEO of SpaceX?', 'agent-studio'),
    'market-research'
  );

  // Market Research Super Agent keywords
  assert.strictEqual(
    AgentManager.autoRoute('What is Morgan Stanley Research stance on crypto alternative assets?', 'dashboard'),
    'market-research-super-agent'
  );

  // Mortgage Agent keywords
  assert.strictEqual(
    AgentManager.autoRoute('I want to get a heloc and apply for a rocket mortgage loan', 'dashboard'),
    'mortgage-agent'
  );
});

test('AgentManager.autoRoute - Page Bias Routing', (t) => {
  // Vague query with no keywords on trading page -> should bias to Trade Assistant
  assert.strictEqual(
    AgentManager.autoRoute('how does this work', 'trading'),
    'trade-assistant'
  );

  // Vague query on balances page -> should bias to Customer Support
  assert.strictEqual(
    AgentManager.autoRoute('help', 'balances'),
    'customer-support'
  );

  // Keyword override should win even if page bias is different
  assert.strictEqual(
    AgentManager.autoRoute('Suggest rebalance changes', 'trading'),
    'portfolio-analyst'
  );
});

test('AgentManager - getMarketSummary Returns Status and Time', (t) => {
  const result = AgentManager.callTool('getMarketSummary');
  assert.ok(result.includes('NYSE/NASDAQ Status:'));
  assert.ok(result.includes('Current Eastern Time:'));
  assert.ok(result.includes('MARKET SUMMARY:'));
});

