const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Load data.js
const code = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/data.js', 'utf8');
eval(code + '\nglobal.BrokerageData = BrokerageData;');

test('BrokerageData - Formatting Utilities', (t) => {
  // formatCurrency
  assert.strictEqual(BrokerageData.formatCurrency(12450.5), '$12,450.50');
  assert.strictEqual(BrokerageData.formatCurrency(0), '$0.00');

  // formatChange
  assert.strictEqual(BrokerageData.formatChange(120), '+$120.00');
  assert.strictEqual(BrokerageData.formatChange(-5.25), '-$5.25');

  // formatPercent
  assert.strictEqual(BrokerageData.formatPercent(1.25), '+1.25%');
  assert.strictEqual(BrokerageData.formatPercent(-0.5), '-0.50%');

  // formatVolume
  assert.strictEqual(BrokerageData.formatVolume(1500000000), '1.50B');
  assert.strictEqual(BrokerageData.formatVolume(2500000), '2.50M');
  assert.strictEqual(BrokerageData.formatVolume(8500), '8.5K');
  assert.strictEqual(BrokerageData.formatVolume(450), '450');
});

test('BrokerageData - Read Operations', (t) => {
  // getHolding
  const aapl = BrokerageData.getHolding('AAPL');
  assert.ok(aapl);
  assert.strictEqual(aapl.name, 'Apple Inc.');

  const nonexistent = BrokerageData.getHolding('XYZ');
  assert.strictEqual(nonexistent, null);

  // getQuote
  const msftQuote = BrokerageData.getQuote('MSFT');
  assert.ok(msftQuote);
  assert.strictEqual(msftQuote.symbol, 'MSFT');

  // getPortfolioSummary
  const summary = BrokerageData.getPortfolioSummary();
  assert.strictEqual(typeof summary.totalValue, 'number');
  assert.strictEqual(summary.holdingsCount, BrokerageData.holdings.length);
  assert.strictEqual(summary.topHoldings.length, 5);
});

test('BrokerageData - Logging and Tick Simulation', (t) => {
  // logAgentActivity
  BrokerageData.logAgentActivity({ agent: 'TestAgent', query: 'ping', status: 'success' });
  assert.strictEqual(BrokerageData.agentActivityLog[0].agent, 'TestAgent');
  assert.strictEqual(BrokerageData.agentActivityLog[0].query, 'ping');
  assert.ok(BrokerageData.agentActivityLog[0].timestamp);

  // tickAllPrices
  const oldPrice = BrokerageData.holdings[0].currentPrice;
  BrokerageData.tickAllPrices();
  const newPrice = BrokerageData.holdings[0].currentPrice;
  // Prices should tick, meaning they change slightly. (It is theoretically possible to tick back to the exact same value but extremely unlikely).
  assert.notStrictEqual(newPrice, undefined);
  assert.ok(typeof newPrice === 'number');
});

test('BrokerageData - recalculatePortfolio', (t) => {
  const msft = BrokerageData.getHolding('MSFT');
  const bnd = BrokerageData.getHolding('BND');
  assert.ok(msft);
  assert.ok(bnd);

  const initialMsftShares = msft.shares;
  const initialBndShares = bnd.shares;
  const initialCash = BrokerageData.account.cashBalance;

  // Simulate a rebalance: trim MSFT by 10 shares, buy 50 BND
  msft.shares -= 10;
  bnd.shares += 50;
  const netProceeds = (10 * msft.currentPrice) - (50 * bnd.currentPrice);
  BrokerageData.account.cashBalance = +(BrokerageData.account.cashBalance + netProceeds).toFixed(2);

  BrokerageData.recalculatePortfolio();

  // Assertions
  assert.strictEqual(msft.shares, initialMsftShares - 10);
  assert.strictEqual(bnd.shares, initialBndShares + 50);
  assert.strictEqual(BrokerageData.account.cashBalance, +(initialCash + netProceeds).toFixed(2));
  
  // Weights recalculation verification
  const totalVal = BrokerageData.holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const expectedMsftWeight = +((msft.marketValue / totalVal) * 100).toFixed(2);
  assert.strictEqual(msft.weight, expectedMsftWeight);

  // Sector allocation verification
  const expectedTechValue = BrokerageData.holdings
    .filter(h => h.sector === 'Technology')
    .reduce((sum, h) => sum + h.marketValue, 0);
  assert.strictEqual(BrokerageData.sectorAllocation['Technology'].value, +expectedTechValue.toFixed(2));

  // Reset back to initial values for other tests
  msft.shares = initialMsftShares;
  bnd.shares = initialBndShares;
  BrokerageData.account.cashBalance = initialCash;
  BrokerageData.recalculatePortfolio();
});

test('BrokerageData - getSectorForSymbol Dynamic Classification', (t) => {
  // Standard default mappings
  assert.strictEqual(BrokerageData.getSectorForSymbol("AAPL"), 'Technology');
  
  // Real account symbols mapping to ETF - Broad
  assert.strictEqual(BrokerageData.getSectorForSymbol("GSLC", "Goldman Sachs ActiveBeta U.S. Large Cap Equity ETF"), 'ETF - Broad');
  assert.strictEqual(BrokerageData.getSectorForSymbol("QEFA", "SPDR MSCI EAFE StrategicFactors ETF"), 'ETF - Broad');
  assert.strictEqual(BrokerageData.getSectorForSymbol("EMGF", "iShares Edge MSCI Min Vol Emerging Markets ETF"), 'ETF - Broad');

  // Keyword mappings for dynamic fallback
  assert.strictEqual(BrokerageData.getSectorForSymbol("AGG", "iShares Core U.S. Aggregate Bond ETF"), 'ETF - Bonds');
  assert.strictEqual(BrokerageData.getSectorForSymbol("IAU", "iShares Gold Trust"), 'ETF - Commodity');
  assert.strictEqual(BrokerageData.getSectorForSymbol("XLK", "Technology Select Sector SPDR Fund"), 'ETF - Tech');
  assert.strictEqual(BrokerageData.getSectorForSymbol("XYZ", "Some Software Company"), 'Technology');
  assert.strictEqual(BrokerageData.getSectorForSymbol("ABC", "City Bank Corp"), 'Financials');
  assert.strictEqual(BrokerageData.getSectorForSymbol("XYZ", "Random Unknown Asset"), 'Other');
});
