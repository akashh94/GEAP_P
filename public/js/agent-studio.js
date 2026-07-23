/* ═══════════════════════════════════════════════════════════════
   GEAP — Agent Studio (adapted for E*TRADE SPA shell)
   Visual agent builder: agent list, flow diagram, config panel, test console
   ═══════════════════════════════════════════════════════════════ */

const AgentStudio = (() => {

  let selectedAgentId = 'portfolio-analyst';

  const agentConfigs = {
    'portfolio-analyst': { model: 'gemini-2.5-flash', temperature: 0.3, tools: ['getPortfolioHoldings', 'getAccountSummary', 'getSectorAllocation'] },
    'trade-assistant': { model: 'gemini-2.5-flash', temperature: 0.4, tools: ['getQuote', 'getPortfolioHoldings', 'getAccountSummary', 'getMarketSummary'] },
    'market-research': { model: 'gemini-2.5-flash', temperature: 0.5, tools: ['getQuote', 'getMarketSummary', 'getPortfolioHoldings'] },
    'customer-support': { model: 'gemini-2.5-flash', temperature: 0.7, tools: ['getAccountSummary', 'getFAQ'] },
    'ken-agent': { model: 'gemini-2.5-flash', temperature: 0.5, tools: ['getPortfolioHoldings', 'getAccountSummary', 'searchFinancialInfo'] },
    'market-research-super-agent': { model: 'gemini-2.5-flash', temperature: 0.5, tools: ['getQuote', 'getMarketSummary', 'getPortfolioHoldings', 'navigateToPage', 'searchFinancialInfo'] },
    'mortgage-agent': { model: 'gemini-2.5-flash', temperature: 0.5, tools: ['getAccountSummary', 'navigateToPage', 'searchFinancialInfo'] },
  };

  function renderView() {
    const agents = AgentManager.getAllAgents();
    const selected = AgentManager.getAgent(selectedAgentId);
    
    let config = agentConfigs[selectedAgentId];
    if (!config && selected) {
      config = {
        model: selected.model || 'gemini-2.5-flash',
        temperature: selected.temperature !== undefined ? selected.temperature : 0.5,
        tools: selected.tools || []
      };
      agentConfigs[selectedAgentId] = config;
    }

    return `
      <section class="page-band">
        <div class="shell">
          <div class="geap-page-header">
            <div>
              <h1>Agent Studio</h1>
              <p style="color: var(--geap-text-secondary, #64748b);">Design, configure, and test AI agents</p>
            </div>
            <span class="geap-badge geap-badge--green"><span class="geap-badge-dot geap-badge-dot--active"></span> GEAP Connected</span>
          </div>
        </div>
      </section>

      <section class="shell" style="padding-top: 20px; padding-bottom: 40px;">
        <div class="studio-layout">

          <!-- LEFT: Agent List -->
          <div class="studio-sidebar">
            <div style="padding: 12px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--geap-text-secondary, #64748b);">Agent Fleet</div>
            <div class="studio-agent-list" id="studio-agent-list">
              ${agents.map(a => `
                <div class="studio-agent-item ${a.id === selectedAgentId ? 'active' : ''}" data-select-agent="${a.id}">
                  <span style="font-size: 20px;">${a.icon}</span>
                  <div>
                    <div style="font-weight: 600; font-size: 13px;">${a.name}</div>
                    <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8);">${a.description}</div>
                  </div>
                  <span class="geap-badge-dot geap-badge-dot--active" style="margin-left: auto;"></span>
                </div>
              `).join('')}
            </div>
            <div style="padding: 12px;">
              <button class="outline-button" style="width: 100%; font-size: 12px;" onclick="AgentStudio.showCreateModal()">+ Create New Agent</button>
            </div>
          </div>

          <!-- CENTER: Canvas -->
          <div class="studio-canvas">
            <div class="studio-canvas-header">
              <div>
                <span style="font-size: 18px; font-weight: 600;">${selected.icon} ${selected.name}</span>
                <span class="geap-badge geap-badge--green" style="margin-left: 8px;">Active</span>
              </div>
              <button class="outline-button" onclick="AgentStudio.saveChanges()">💾 Save Changes</button>
            </div>

            <!-- Flow Diagram -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 0;">
              <div class="flow-node" style="background: linear-gradient(135deg, #f0f4ff, #e8ecf4);">
                <div style="font-weight: 600;">👤 User Query</div>
                <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8); margin-top: 4px;">Natural language input</div>
              </div>
              <div class="flow-connector"></div>
              <div class="flow-node router">
                <div style="font-weight: 600;">🧠 Agent Router</div>
                <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8); margin-top: 4px;">Intent classification</div>
              </div>
              <div class="flow-connector"></div>
              <div class="flow-branches">
                ${agents.map(a => `
                  <div class="flow-node ${a.id === selectedAgentId ? 'active' : ''}" data-select-agent="${a.id}" style="min-width: 120px; font-size: 13px; cursor: pointer;">
                    <div>${a.icon}</div>
                    <div style="font-weight: 600; margin-top: 4px;">${a.name}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Test Console -->
            <div class="studio-test-console">
              <div class="test-console-header">
                <span style="font-weight: 600; font-size: 13px;">🧪 Test Console</span>
                <button class="link-button" onclick="AgentStudio.clearTest()">Clear</button>
              </div>
              <div class="test-console-body" id="test-console-body">
                <div style="color: var(--geap-text-tertiary, #94a3b8); font-size: 13px;">
                  Send a test message to see how "${selected.name}" responds...
                </div>
              </div>
              <div style="display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--geap-border, #e2e8f0);">
                <input type="text" id="test-console-input"
                       placeholder="Test query..." style="flex: 1; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;"
                       onkeydown="if(event.key==='Enter') AgentStudio.sendTest()">
                <button class="outline-button" onclick="AgentStudio.sendTest()">Send</button>
              </div>
            </div>
          </div>

          <!-- RIGHT: Config Panel -->
          <div class="studio-config">
            <div class="studio-config-section">
              <div class="studio-config-title">Model</div>
              <select style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;" id="config-model">
                <option value="gemini-2.5-flash" ${config.model === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash</option>
                <option value="gemini-2.5-pro" ${config.model === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro</option>
              </select>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">Avatar Style</div>
              <select style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;" id="config-avatar-style">
                <option value="neural" ${selected.avatarStyle === 'neural' || !selected.avatarStyle ? 'selected' : ''}>Neural Core (Animated)</option>
                <option value="emoji" ${selected.avatarStyle === 'emoji' ? 'selected' : ''}>Emoji Only</option>
              </select>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">Speech Voice Accent</div>
              <select style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;" id="config-voice-accent">
                <option value="us-female" ${selected.voiceAccent === 'us-female' || !selected.voiceAccent ? 'selected' : ''}>Google US English (Female)</option>
                <option value="us-male" ${selected.voiceAccent === 'us-male' ? 'selected' : ''}>Google US English (Male)</option>
                <option value="uk-female" ${selected.voiceAccent === 'uk-female' ? 'selected' : ''}>Google UK English (Female)</option>
                <option value="system-default" ${selected.voiceAccent === 'system-default' ? 'selected' : ''}>System Default</option>
              </select>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">Temperature</div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="range" min="0" max="1" step="0.1" value="${config.temperature}" id="config-temp" style="flex: 1; accent-color: var(--geap-blue, #4F8EF7);"
                       oninput="document.getElementById('temp-value').textContent = this.value">
                <span style="font-family: monospace; font-size: 13px;" id="temp-value">${config.temperature}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--geap-text-tertiary, #94a3b8); margin-top: 4px;">
                <span>Precise</span><span>Creative</span>
              </div>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">System Prompt</div>
              <textarea id="config-prompt" rows="10"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; font-family: monospace; line-height: 1.5; resize: vertical;"
              >${selected.systemPrompt}</textarea>
              <div style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8); margin-top: 4px;">
                ${selected.systemPrompt.length} characters
              </div>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">Tools (${config.tools.length})</div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${config.tools.map(t => `<span class="tool-chip">🔧 ${t}</span>`).join('')}
              </div>
            </div>
            <div class="studio-config-section">
              <div class="studio-config-title">Agent ID</div>
              <code style="font-size: 11px; color: var(--geap-text-tertiary, #94a3b8); font-family: monospace;">${selected.id}</code>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('[data-select-agent]').forEach(el => {
      el.addEventListener('click', () => {
        selectAgent(el.dataset.selectAgent);
      });
    });
  }

  function selectAgent(agentId) {
    selectedAgentId = agentId;
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = renderView();
      bindEvents();
    }
  }

  async function sendTest() {
    const input = document.getElementById('test-console-input');
    const body = document.getElementById('test-console-body');
    if (!input || !body) return;

    const query = input.value.trim();
    if (!query) return;
    input.value = '';

    const agent = AgentManager.getAgent(selectedAgentId);

    body.innerHTML += `
      <div style="margin-bottom: 8px;">
        <div style="color: var(--geap-blue, #4F8EF7); font-weight: 600; font-size: 11px;">USER</div>
        <div>${query}</div>
      </div>
    `;

    body.innerHTML += `<div id="test-loading" style="color: var(--geap-text-tertiary, #94a3b8);">Thinking...</div>`;
    body.scrollTop = body.scrollHeight;

    try {
      const systemPromptWithData = agent.systemPrompt + '\n\nCURRENT DATA:\n' + contextData;

      const response = await GeminiAPI.sendMessage(
        [{ role: 'user', parts: [{ text: query }] }],
        systemPromptWithData
      );

      const loading = document.getElementById('test-loading');
      if (loading) loading.remove();

      body.innerHTML += `
        <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="color: var(--geap-green, #34D399); font-weight: 600; font-size: 11px;">${agent.icon} ${agent.name}</div>
          <div style="margin-top: 4px;">${GeapApp.renderMarkdown(response)}</div>
        </div>
      `;
    } catch (e) {
      const loading = document.getElementById('test-loading');
      if (loading) loading.remove();
      body.innerHTML += `<div style="color: var(--geap-danger, #EF4444); font-size: 13px;">Error: ${e.message}</div>`;
    }

    body.scrollTop = body.scrollHeight;
  }

  function clearTest() {
    const body = document.getElementById('test-console-body');
    if (body) {
      const agent = AgentManager.getAgent(selectedAgentId);
      body.innerHTML = `<div style="color: var(--geap-text-tertiary, #94a3b8); font-size: 13px;">Send a test message to see how "${agent.name}" responds...</div>`;
    }
  }

  function saveChanges() {
    const model = document.getElementById('config-model').value;
    const temp = parseFloat(document.getElementById('config-temp').value);
    const prompt = document.getElementById('config-prompt').value;
    const avatarStyle = document.getElementById('config-avatar-style').value;
    const voiceAccent = document.getElementById('config-voice-accent').value;

    const agent = AgentManager.getAgent(selectedAgentId);
    if (agent) {
      agent.model = model;
      agent.temperature = temp;
      agent.systemPrompt = prompt;
      agent.avatarStyle = avatarStyle;
      agent.voiceAccent = voiceAccent;

      if (!agentConfigs[selectedAgentId]) {
        agentConfigs[selectedAgentId] = {};
      }
      agentConfigs[selectedAgentId].model = model;
      agentConfigs[selectedAgentId].temperature = temp;
      agentConfigs[selectedAgentId].systemPrompt = prompt;
      agentConfigs[selectedAgentId].avatarStyle = avatarStyle;
      agentConfigs[selectedAgentId].voiceAccent = voiceAccent;

      alert(`Changes saved successfully for ${agent.name}!`);
      selectAgent(selectedAgentId);

      // Trigger hot-reload dynamic reactive updates to the global Chat component
      if (typeof Chat !== 'undefined' && typeof Chat.updateAgentSelector === 'function') {
        Chat.updateAgentSelector();
        Chat.selectAgent(Chat.getCurrentAgentId());
      }
    }
  }

  function showCreateModal() {
    let modal = document.getElementById('create-agent-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'create-agent-modal';

    const toolList = AgentManager.getToolList();

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Create New Agent</h2>
        <form id="create-agent-form">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Agent Name</label>
            <input type="text" id="agent-name" required placeholder="e.g. Tax Helper" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
          </div>
          <div style="margin-bottom: 12px; display: flex; gap: 12px;">
            <div style="flex: 1;">
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Icon (Emoji)</label>
              <input type="text" id="agent-icon" required placeholder="e.g. 💸" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
            </div>
            <div style="flex: 2;">
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Theme Color</label>
              <select id="agent-icon-bg" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Description</label>
            <input type="text" id="agent-description" required placeholder="e.g. Assists with tax-loss harvesting queries" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">System Prompt</label>
            <textarea id="agent-prompt" required rows="4" placeholder="You are a helpful assistant..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: monospace; color: #1e293b;"></textarea>
          </div>
          <div style="margin-bottom: 12px; display: flex; gap: 12px;">
            <div style="flex: 1;">
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Avatar Style</label>
              <select id="agent-avatar-style" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
                <option value="neural">Neural Core (Animated)</option>
                <option value="emoji">Emoji Only</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Speech Accent</label>
              <select id="agent-voice-accent" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; color: #1e293b;">
                <option value="us-female">Google US English (Female)</option>
                <option value="us-male">Google US English (Male)</option>
                <option value="uk-female">Google UK English (Female)</option>
                <option value="system-default">System Default</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Equipped Tools</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; color: #475569;">
              ${toolList.map(t => `
                <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                  <input type="checkbox" name="agent-tools" value="${t}"> ${t}
                </label>
              `).join('')}
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="outline-button" onclick="AgentStudio.hideCreateModal()">Cancel</button>
            <button type="submit" class="outline-button" style="background: var(--purple-bright, #6B2D9B); color: #fff;">Create Agent</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('create-agent-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      AgentStudio.handleCreateSubmit();
    });
  }

  function hideCreateModal() {
    const modal = document.getElementById('create-agent-modal');
    if (modal) modal.remove();
  }

  function handleCreateSubmit() {
    const name = document.getElementById('agent-name').value.trim();
    const icon = document.getElementById('agent-icon').value.trim();
    const iconBg = document.getElementById('agent-icon-bg').value;
    const description = document.getElementById('agent-description').value.trim();
    const systemPrompt = document.getElementById('agent-prompt').value.trim();
    const avatarStyle = document.getElementById('agent-avatar-style').value;
    const voiceAccent = document.getElementById('agent-voice-accent').value;

    const checkedTools = [];
    document.querySelectorAll('input[name="agent-tools"]:checked').forEach(cb => {
      checkedTools.push(cb.value);
    });

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const config = {
      id,
      name,
      icon,
      iconBg,
      description,
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      tools: checkedTools,
      systemPrompt,
      avatarStyle,
      voiceAccent
    };

    AgentManager.registerAgent(config);

    agentConfigs[id] = {
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      tools: checkedTools
    };

    AgentStudio.hideCreateModal();
    AgentStudio.selectAgent(id);

    // Dynamic reactive update to the global Chat component
    if (typeof Chat !== 'undefined' && typeof Chat.updateAgentSelector === 'function') {
      Chat.updateAgentSelector();
    }
  }

  return { 
    renderView, 
    bindEvents, 
    selectAgent, 
    sendTest, 
    clearTest,
    saveChanges,
    showCreateModal,
    hideCreateModal,
    handleCreateSubmit
  };
})();
