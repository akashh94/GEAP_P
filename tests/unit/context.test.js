const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// 1. Mock state and mockData environment
global.state = {
  route: '/pay-transfer',
  selectedAccountId: 'checking',
  governance: {
    pii: true,
    safety: false,
    disclaimers: true
  }
};

global.mockData = {
  user: {
    firstName: 'Ken',
    lastName: 'L.',
    lastLogin: 'June 8, 2026'
  },
  accounts: [
    {
      id: 'checking',
      netValue: '$1,200.00',
      available: '$600.00'
    }
  ]
};

global.window = {
  location: {
    pathname: '/pay-transfer'
  }
};

// 2. Load context.js
const code = fs.readFileSync('/Users/klejnieks/Graveyard/GEAP/public/js/context.js', 'utf8');
eval(code + '\nglobal.ContextEngine = ContextEngine;');

test('ContextEngine - getContextPayload', (t) => {
  const payload = ContextEngine.getContextPayload('portfolio-analyst');
  
  assert.strictEqual(payload.platform.route, '/pay-transfer');
  assert.strictEqual(payload.platform.theme, 'dark');
  assert.strictEqual(payload.user.name, 'Ken L.');
  assert.strictEqual(payload.user.lastLogin, 'June 8, 2026');
  assert.strictEqual(payload.account.selectedId, 'checking');
  assert.strictEqual(payload.account.netValue, '$1,200.00');
  assert.strictEqual(payload.account.buyingPower, '$600.00');
  assert.strictEqual(payload.security.piiRedacted, true);
  assert.strictEqual(payload.security.safetyActive, false);
  assert.strictEqual(payload.security.disclaimersActive, true);
});

test('ContextEngine - formatContextToMarkdown', (t) => {
  const payload = ContextEngine.getContextPayload('portfolio-analyst');
  const markdown = ContextEngine.formatContextToMarkdown(payload);

  assert.ok(markdown.includes('=== SYSTEM CONTEXT ==='));
  assert.ok(markdown.includes('Route**: /pay-transfer'));
  assert.ok(markdown.includes('User**: Ken L.'));
  assert.ok(markdown.includes('Net Account Value**: $1,200.00'));
  assert.ok(markdown.includes('Buying Power**: $600.00'));
});
