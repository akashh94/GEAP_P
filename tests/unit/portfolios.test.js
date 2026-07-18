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
  location: { pathname: '/accounts/portfolios' },
  addEventListener: () => {}
};
global.state = {
  route: '/accounts/portfolios',
  selectedAccountId: 'core',
  allocationMode: 'asset',
  portfolioTab: 'allocation',
  aiDetailsExpanded: true
};
global.mockData = {
  user: { refreshedAt: 'June 8, 2026' },
  accounts: [
    {
      id: 'core',
      label: 'Core Portfolio',
      masked: '-6408',
      subtitle: 'Core Portfolios',
      type: 'Core Portfolios',
      netValue: '$12,734.88',
      allocation: {
        totalMarketValue: '$12,734.88',
        unrealizedGain: '$1,842.77',
        dayGain: '$56.41',
        taxLoss: '$0.00',
        portfolioName: 'Aggressive Growth'
      }
    }
  ]
};

global.selectedAccount = () => global.mockData.accounts[0];
global.moneyToneClass = () => 'positive';
global.renderAssetAllocation = () => 'Asset Allocation Chart';
global.renderSectorAllocation = () => 'Sector Allocation Chart';
global.renderHoldingSection = () => 'Holding Section';
global.renderDisclosures = () => 'Disclosures';

// Load JS codes
const appCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/app.js', 'utf8');
eval(appCode + '\nglobal.getState = () => state;');

const portfoliosCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/portfolios.js', 'utf8');
eval(portfoliosCode + '\nglobal.renderPortfolios = renderPortfolios;\nglobal.renderRiskAssessment = renderRiskAssessment;');

const planningCode = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/planning.js', 'utf8');
eval(planningCode + '\nglobal.renderPlanning = renderPlanning;');

test('Portfolios Page - Tab Rendering and Risk Assessment', (t) => {
  const localState = global.getState();

  // Test 1: Allocation view
  localState.portfolioTab = 'allocation';
  global.state.portfolioTab = 'allocation';
  const htmlAllocation = renderPortfolios();
  assert.ok(htmlAllocation.includes('Allocation'), 'Should render Allocation tab content');
  assert.ok(!htmlAllocation.includes('AI Portfolio Risk Diagnostic'), 'Should not render Risk Assessment content on allocation tab');

  // Test 2: Risk Assessment view
  localState.portfolioTab = 'risk';
  global.state.portfolioTab = 'risk';
  const htmlRisk = renderPortfolios();
  assert.ok(htmlRisk.includes('AI Portfolio Risk Diagnostic'), 'Should render Risk Assessment header');
  assert.ok(htmlRisk.includes('Single-Stock Exposure'), 'Should render Risk Factor Grid cards');
  assert.ok(htmlRisk.includes('Active AI Safeguards'), 'Should render Active AI Safeguards sidebar');
});

test('Planning & Retirement Page - renderPlanning', (t) => {
  const html = renderPlanning();
  assert.ok(html.includes('Planning & Retirement'), 'Should render Planning page title');
  assert.ok(html.includes('GEAP Intelligent Retirement Advisor'), 'Should render retirement advisor card');
  assert.ok(html.includes('Retirement Target Age'), 'Should render target age metric');
  assert.ok(html.includes('Monte Carlo Projections'), 'Should render Monte Carlo spotlight');
});

test('Portfolios Page - renderRiskAssessment Dynamic Calculations', (t) => {
  const accountNoBeneficiary = {
    id: 'checking',
    label: 'Checking Account',
    beneficiary: false
  };

  const accountWithBeneficiary = {
    id: 'core',
    label: 'Core UTMA/UGMA Account',
    beneficiary: false
  };

  const holdings = [
    { symbol: 'MSFT', marketValue: 2000, sector: 'Technology' },
    { symbol: 'AAPL', marketValue: 500, sector: 'Technology' },
    { symbol: 'BND', marketValue: 500, sector: 'ETF - Bonds' }
  ];

  // MSFT is 2000 out of 3000 (total equities) = 66.7% weight
  // Tech sector value is 2500 out of 3000 = 83.3% weight
  // Beta calculation:
  // MSFT beta: 1.35 * (2000/3000) = 0.90
  // AAPL beta: 1.35 * (500/3000) = 0.225
  // BND beta: 0.15 * (500/3000) = 0.025
  // Total Beta = 0.90 + 0.225 + 0.025 = 1.15
  
  // Render with account 1 (No beneficiary)
  const html1 = renderRiskAssessment(accountNoBeneficiary, holdings);
  assert.ok(html1.includes('66.7%'), 'Single-stock exposure should show 66.7%');
  assert.ok(html1.includes('MSFT position exceeds 15% single-holding limit.'), 'Should flag MSFT concentration');
  assert.ok(html1.includes('1.15'), 'Portfolio beta should be 1.15');
  assert.ok(html1.includes('83.3%'), 'Sector exposure should show 83.3%');
  assert.ok(html1.includes('Technology sector concentration exceeds benchmark.'), 'Should flag Tech concentration');
  assert.ok(html1.includes('None'), 'Estate planning should show None');
  assert.ok(html1.includes('Missing beneficiary designation for this account.'), 'Should show missing beneficiary text');

  // Render with account 2 (UTMA/UGMA, has beneficiary)
  const html2 = renderRiskAssessment(accountWithBeneficiary, holdings);
  assert.ok(html2.includes('Designated'), 'Estate planning should show Designated');
  assert.ok(html2.includes('Beneficiary designation active for this account.'), 'Should show designated text');
});
