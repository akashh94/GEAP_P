/* ═══════════════════════════════════════════════════════════════
   GEAP POC — Unified Context Engine
   Provides structured and consistent context payloads for agent prompts
   ═══════════════════════════════════════════════════════════════ */

const ContextEngine = (() => {

  function getActiveAccountNetValue() {
    if (typeof mockData === 'undefined' || !mockData.accounts || typeof state === 'undefined') return '$0.00';
    const acc = mockData.accounts.find(a => a.id === state.selectedAccountId);
    return acc ? acc.netValue : '$0.00';
  }

  function getActiveAccountBuyingPower() {
    if (typeof mockData === 'undefined' || !mockData.accounts || typeof state === 'undefined') return '$0.00';
    const acc = mockData.accounts.find(a => a.id === state.selectedAccountId);
    return acc ? (acc.available || acc.totalBalance || '$0.00') : '$0.00';
  }

  function getContextPayload(agentId) {
    const route = (typeof state !== 'undefined' ? state.route : window.location.pathname);
    const time = new Date().toISOString();
    const theme = 'dark'; // E*TRADE Agent Fabric/Studio theme is dark

    const firstName = (typeof mockData !== 'undefined' && mockData.user && mockData.user.firstName) ? mockData.user.firstName : 'User';
    const lastName = (typeof mockData !== 'undefined' && mockData.user && mockData.user.lastName) ? mockData.user.lastName : '';
    const name = (firstName + (lastName ? ' ' + lastName : '')).trim();
    const lastLogin = (typeof mockData !== 'undefined' && mockData.user && mockData.user.lastLogin) ? mockData.user.lastLogin : 'N/A';

    const selectedId = (typeof state !== 'undefined' ? state.selectedAccountId : 'core');

    const safetyActive = (typeof state !== 'undefined' && state.governance && state.governance.safety !== undefined) ? state.governance.safety : true;
    const disclaimersActive = (typeof state !== 'undefined' && state.governance && state.governance.disclaimers !== undefined) ? state.governance.disclaimers : true;

    const aiSettings = (typeof state !== 'undefined' && state.aiSettings) ? state.aiSettings : {
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
      piiScrubbingEnabled: true
    };

    const allowedSourcesList = Object.entries(aiSettings.allowedSources)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    return {
      platform: {
        route: route,
        time: time,
        theme: theme
      },
      user: {
        name: name,
        lastLogin: lastLogin
      },
      account: {
        selectedId: selectedId,
        netValue: getActiveAccountNetValue(),
        buyingPower: getActiveAccountBuyingPower()
      },
      security: {
        piiRedacted: aiSettings.piiScrubbingEnabled,
        safetyActive: safetyActive,
        disclaimersActive: disclaimersActive
      },
      aiSettings: {
        accessMode: aiSettings.accessMode,
        tradeExecutionMode: aiSettings.tradeExecutionMode,
        piiScrubbingEnabled: aiSettings.piiScrubbingEnabled,
        allowedSourcesList: allowedSourcesList
      }
    };
  }

  function formatContextToMarkdown(payload) {
    return `
=== SYSTEM CONTEXT ===
- **Route**: ${payload.platform.route}
- **Timestamp**: ${payload.platform.time}
- **Theme**: ${payload.platform.theme}
- **User**: ${payload.user.name} (Last Login: ${payload.user.lastLogin})
- **Active Account**: ${payload.account.selectedId}
- **Net Account Value**: ${payload.account.netValue}
- **Buying Power**: ${payload.account.buyingPower}
- **Security Protocols**:
  - PII Redacted: ${payload.security.piiRedacted}
  - Content Safety Active: ${payload.security.safetyActive}
  - Disclaimers Active: ${payload.security.disclaimersActive}
- **AI Settings & Guardrails**:
  - Access Mode: ${payload.aiSettings.accessMode}
  - Trade Execution Mode: ${payload.aiSettings.tradeExecutionMode}
  - PII Scrubbing: ${payload.aiSettings.piiScrubbingEnabled ? 'Enabled' : 'Disabled'}
  - Allowed Info Sources: ${payload.aiSettings.allowedSourcesList.join(', ')}
======================
`.trim();
  }

  return {
    getContextPayload,
    formatContextToMarkdown
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContextEngine };
} else {
  window.ContextEngine = ContextEngine;
}
