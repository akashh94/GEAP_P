/* ═══════════════════════════════════════════════════════════════
   GEAP — Agent Fabric (adapted for E*TRADE SPA shell)
   Fleet monitoring: metrics, agent cards, activity log, routing map, governance
   ═══════════════════════════════════════════════════════════════ */

const AgentFabric = (() => {

  let logInterval = null;

  const sampleQueries = [
    { agent: 'Portfolio Analyst', agentId: 'portfolio-analyst', query: 'Analyze my portfolio allocation' },
    { agent: 'Portfolio Analyst', agentId: 'portfolio-analyst', query: 'Am I too concentrated in tech stocks?' },
    { agent: 'Trade Assistant', agentId: 'trade-assistant', query: 'Help me place a limit order for NVDA' },
    { agent: 'Trade Assistant', agentId: 'trade-assistant', query: 'What order type should I use for AAPL?' },
    { agent: 'Market Research', agentId: 'market-research', query: 'What\'s the current price of NVDA?' },
    { agent: 'Market Research', agentId: 'market-research', query: 'Compare AAPL and MSFT fundamentals' },
    { agent: 'Customer Support', agentId: 'customer-support', query: 'Where are my tax documents?' },
    { agent: 'Customer Support', agentId: 'customer-support', query: 'How do I transfer funds?' },
    { agent: 'Portfolio Analyst', agentId: 'portfolio-analyst', query: 'Suggest rebalancing changes' },
    { agent: 'Trade Assistant', agentId: 'trade-assistant', query: 'Is it a good time to buy TSLA?' },
    { agent: 'Market Research', agentId: 'market-research', query: 'Explain the P/E ratio for GOOGL' },
    { agent: 'Customer Support', agentId: 'customer-support', query: 'What are the trading fees?' },
  ];

  function seedActivityLog() {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const entry = sampleQueries[i % sampleQueries.length];
      const time = new Date(now - i * 45000);
      BrokerageData.logAgentActivity({
        ...entry,
        timestamp: time.toISOString(),
        status: Math.random() > 0.05 ? 'success' : 'error',
        latency: (Math.random() * 2 + 0.5).toFixed(1),
      });
    }
  }

  function renderView() {
    seedActivityLog();

    const metrics = BrokerageData.agentMetrics;
    const metricCount = Object.keys(metrics).length || 1;
    const totalRequests = Object.values(metrics).reduce((s, m) => s + m.requests, 0);
    const avgLatency = (Object.values(metrics).reduce((s, m) => s + m.avgLatency, 0) / metricCount).toFixed(1);
    const avgSuccess = (Object.values(metrics).reduce((s, m) => s + m.successRate, 0) / metricCount).toFixed(1);
    const totalTokens = Object.values(metrics).reduce((s, m) => s + m.tokensUsed, 0);
    const agents = AgentManager.getAllAgents();

    return `
      <section class="page-band">
        <div class="shell">
          <div class="geap-page-header">
            <div>
              <h1>Agent Fabric</h1>
              <p style="color: var(--geap-text-secondary, #64748b);">Monitor and govern your AI agent fleet</p>
            </div>
            <span class="geap-badge geap-badge--green"><span class="geap-badge-dot geap-badge-dot--active"></span> All Systems Operational</span>
          </div>
        </div>
      </section>

      <section class="shell" style="padding-top: 20px; padding-bottom: 40px;">
        <!-- Metrics Row -->
        <div class="fabric-metrics-grid animate-fade-in">
          <div class="geap-stat-card">
            <div style="font-size: 20px;">📊</div>
            <span class="geap-stat-label">Total Requests</span>
            <span class="geap-stat-value">${totalRequests.toLocaleString()}</span>
            <span class="geap-stat-change positive">↑ 12% vs last week</span>
          </div>
          <div class="geap-stat-card">
            <div style="font-size: 20px;">⚡</div>
            <span class="geap-stat-label">Avg Response Time</span>
            <span class="geap-stat-value">${avgLatency}s</span>
            <span class="geap-stat-change positive">↓ 0.3s improvement</span>
          </div>
          <div class="geap-stat-card">
            <div style="font-size: 20px;">✅</div>
            <span class="geap-stat-label">Success Rate</span>
            <span class="geap-stat-value">${avgSuccess}%</span>
            <span class="geap-stat-change positive">↑ 0.5% vs last week</span>
          </div>
          <div class="geap-stat-card">
            <div style="font-size: 20px;">🔤</div>
            <span class="geap-stat-label">Tokens Consumed</span>
            <span class="geap-stat-value">${(totalTokens / 1000).toFixed(0)}K</span>
            <span class="geap-stat-change">~$${(totalTokens * 0.00001).toFixed(2)} cost</span>
          </div>
        </div>

        <!-- Agent Fleet Cards -->
        <h2 style="margin: 24px 0 16px; font-size: 18px;">Agent Fleet</h2>
        <div class="fabric-agents-grid animate-fade-in">
          ${agents.map(a => {
            const m = metrics[a.id] || { requests: 0, avgLatency: 0.0, successRate: 100, tokensUsed: 0, uptime: 100, errors: 0 };
            return `
              <div class="fabric-agent-card">
                <div class="fabric-agent-header">
                  <span style="font-size: 24px;">${a.icon}</span>
                  <div style="flex: 1;">
                    <div style="font-weight: 600;">${a.name}</div>
                    <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8);">${a.description}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="geap-badge-dot geap-badge-dot--active"></span>
                    <span style="font-size: 11px; color: #34d399;">Active</span>
                  </div>
                </div>
                <div class="fabric-agent-metrics">
                  <div class="fabric-metric">
                    <div class="fabric-metric-value">${m.requests}</div>
                    <div class="fabric-metric-label">Requests</div>
                  </div>
                  <div class="fabric-metric">
                    <div class="fabric-metric-value">${m.avgLatency}s</div>
                    <div class="fabric-metric-label">Avg Latency</div>
                  </div>
                  <div class="fabric-metric">
                    <div class="fabric-metric-value">${m.successRate}%</div>
                    <div class="fabric-metric-label">Success Rate</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Activity Log + Routing Map -->
        <div style="display: grid; grid-template-columns: 7fr 3fr; gap: 20px; margin-top: 24px;">
          <!-- Activity Log -->
          <div class="fabric-activity-log animate-fade-in">
            <div class="activity-log-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600;">Activity Log</span>
                <span class="geap-badge geap-badge--green"><span class="geap-badge-dot geap-badge-dot--active"></span> Live</span>
              </div>
            </div>
            <div class="activity-log-body" id="activity-log-body">
              ${renderLogEntries()}
            </div>
          </div>

          <!-- Routing Map -->
          <div class="routing-map animate-fade-in">
            <div class="routing-map-content">
              <div class="flow-node" style="min-width: 140px;">
                <div style="font-weight: 600;">📨 Incoming Request</div>
              </div>
              <div class="flow-connector"></div>
              <div class="flow-node router" style="min-width: 140px;">
                <div style="font-weight: 600;">🧠 Intent Classifier</div>
              </div>
              <div class="flow-connector"></div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${agents.map(a => {
                  const m = metrics[a.id] || { requests: 0, avgLatency: 0.0, successRate: 100, tokensUsed: 0, uptime: 100, errors: 0 };
                  return `
                    <div class="flow-node" style="font-size: 11px; min-width: auto; padding: 10px;">
                      <div>${a.icon}</div>
                      <div style="font-weight: 600; margin-top: 2px;">${a.name.split(' ')[0]}</div>
                      <div style="color: var(--geap-text-tertiary, #94a3b8); margin-top: 2px;">${m.requests} reqs</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Governance Panel -->
        <div class="governance-panel animate-fade-in" style="margin-top: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 600; font-size: 16px;">🛡️ Governance & Safety</span>
            <span class="geap-badge geap-badge--blue">6 active rules</span>
          </div>
          ${renderGovernanceRules()}
        </div>
      </section>
    `;
  }

  function renderLogEntries() {
    const log = BrokerageData.agentActivityLog;
    if (!log || log.length === 0) return '<div style="padding: 16px; color: var(--geap-text-tertiary, #94a3b8); text-align: center;">No activity yet</div>';

    return log.slice(0, 12).map(entry => `
      <div class="log-entry">
        <span class="log-timestamp">${formatLogTime(entry.timestamp)}</span>
        <span class="log-agent">${entry.agent || 'Unknown'}</span>
        <span class="log-query">${entry.query || '—'}</span>
        <span class="geap-badge ${entry.status === 'success' ? 'geap-badge--green' : 'geap-badge--red'}">${entry.status || '—'}</span>
      </div>
    `).join('');
  }

  function formatLogTime(timestamp) {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderGovernanceRules() {
    const rules = [
      { id: 'safety', name: 'Content Safety Filter', desc: 'Block harmful or inappropriate content in agent responses', active: state.governance?.safety !== false },
      { id: 'disclaimers', name: 'Financial Advice Disclaimer', desc: 'Append disclaimers to all investment-related responses', active: state.governance?.disclaimers !== false },
      { id: 'pii', name: 'PII Detection', desc: 'Detect and redact personally identifiable information', active: state.governance?.pii !== false },
      { id: 'rateLimiting', name: 'Rate Limiting', desc: 'Limit requests to 100/minute per user', active: state.governance?.rateLimiting !== false },
      { id: 'escalation', name: 'Human Escalation Trigger', desc: 'Escalate to human agent for complex account issues', active: state.governance?.escalation !== false },
      { id: 'audit', name: 'Audit Logging', desc: 'Log all agent interactions for compliance review', active: state.governance?.audit !== false },
    ];

    return rules.map(rule => `
      <div class="governance-rule">
        <div>
          <div style="font-size: 13px; font-weight: 500;">${rule.name}</div>
          <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8);">${rule.desc}</div>
        </div>
        <div class="toggle-switch ${rule.active ? 'active' : ''}" onclick="AgentFabric.toggleRule('${rule.id}', this)"></div>
      </div>
    `).join('');
  }

  function toggleRule(ruleId, element) {
    if (!state.governance) {
      state.governance = {};
    }
    const isActive = element.classList.contains('active');
    state.governance[ruleId] = !isActive;
    element.classList.toggle('active');
  }

  function bindEvents() {
    // Start live log simulation
    if (logInterval) clearInterval(logInterval);
    logInterval = setInterval(() => {
      // Skip simulating activity log records if audit logging is disabled
      if (state.governance?.audit === false) return;

      const entry = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      BrokerageData.logAgentActivity({
        ...entry,
        status: Math.random() > 0.03 ? 'success' : 'error',
        latency: (Math.random() * 2 + 0.5).toFixed(1),
      });

      const logBody = document.getElementById('activity-log-body');
      if (logBody) {
        logBody.innerHTML = renderLogEntries();
      }
    }, 8000 + Math.random() * 4000);
  }

  function cleanup() {
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
    }
  }

  return { renderView, bindEvents, cleanup, toggleRule };
})();
