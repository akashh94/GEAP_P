/* ═══════════════════════════════════════════════════════════════
   GEAP — Chat Panel UI & Logic (adapted for E*TRADE shell)
   Renders the AI chat panel, handles messaging, agent selection
   ═══════════════════════════════════════════════════════════════ */

const Chat = (() => {

  let initialized = false;
  let currentAgentId = 'auto';
  let conversationHistory = [];
  let isStreaming = false;

  // Voice & Avatar States
  let voiceEnabled = false;
  let recognition = null;
  let isListening = false;
  let speechUtterance = null;
  let currentAvatarState = 'idle';

  // ── Suggestions per route ──
  const pageSuggestions = {
    dashboard: [
      'Account briefing',
      'Explain my portfolio',
      'Should I refinance and use the proceeds to rebalance?',
      'How do I withdraw money?',
      'Test PII scrubber shield',
    ],
    portfolios: [
      'Analyze my holdings',
      'Should I refinance and use the proceeds to rebalance?',
      'How do I withdraw money?',
      'Test PII scrubber shield',
    ],
    trading: [
      'What order type should I use?',
      'Is AAPL a good buy right now?',
      'Help me set a limit order',
    ],
    'agent-studio': [
      'How do agents work?',
      'What can the portfolio agent do?',
      'How is routing configured?',
    ],
    'agent-fabric': [
      'Show me agent performance',
      'Which agent is busiest?',
      'Any errors today?',
    ],
  };

  function detectPage() {
    const path = window.location.pathname;
    if (path.includes('agent-studio')) return 'agent-studio';
    if (path.includes('agent-fabric')) return 'agent-fabric';
    if (path.includes('portfolio')) return 'portfolios';
    if (path.includes('trading')) return 'trading';
    if (path.includes('watch-list')) return 'watch-lists';
    if (path.includes('balance')) return 'balances';
    if (path.includes('activity')) return 'activity';
    return 'dashboard';
  }

  function getWelcomeMessage() {
    const page = detectPage();
    const welcomes = {
      dashboard: "I can see you're on the Complete View dashboard. I can analyze your accounts, explain your day's gains, or help you understand any data you see here.",
      portfolios: "I see you're reviewing your portfolio allocation. I can break down your holdings, explain the allocation chart, suggest rebalancing, or analyze any position.",
      trading: "You're on the Trading page. I can help you choose the right order type, look up stock quotes, or walk you through placing a trade.",
      'watch-lists': "You're looking at your Watch Lists. I can analyze any of these symbols, compare them, or help you decide which to trade.",
      balances: "You're viewing your account balances. I can explain your buying power, available funds, or help with transfers.",
      activity: "You're looking at account activity. I can help you find specific transactions or explain any entries.",
      'agent-studio': "You're in Agent Studio. I can explain how agents work, what each one does, or how the routing logic is configured.",
      'agent-fabric': "You're viewing the Agent Fabric dashboard. I can explain the metrics, agent performance, or how the governance rules work.",
    };
    return welcomes[page] || "I can help with portfolio analysis, trading, market research, and account support. What would you like to know?";
  }

  function renderAvatar(agentId, stateClass = 'idle') {
    const agent = agentId === 'auto' ? { name: 'Auto Router', icon: '✨', avatarStyle: 'neural' } : AgentManager.getAgent(agentId);
    if (!agent) return `<span class="chat-agent-avatar">✨</span>`;
    const style = agent.avatarStyle || 'neural';

    if (style === 'neural') {
      return `
        <div class="neural-avatar ${stateClass}" id="neural-avatar" title="${agent.name}">
          <div class="neural-core"></div>
          <div class="neural-waves">
            <span class="wave-bar bar-1"></span>
            <span class="wave-bar bar-2"></span>
            <span class="wave-bar bar-3"></span>
            <span class="wave-bar bar-4"></span>
            <span class="wave-bar bar-5"></span>
          </div>
        </div>
      `;
    } else {
      return `<span class="chat-agent-avatar" style="font-size: 20px; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--geap-surface-secondary); border: 1px solid var(--geap-border);">${agent.icon || '✨'}</span>`;
    }
  }

  function setAvatarState(state) {
    currentAvatarState = state;
    const neuralAvatar = document.getElementById('neural-avatar');
    if (neuralAvatar) {
      neuralAvatar.className = `neural-avatar ${state}`;
    }
  }

  function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    if (!recognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        const voiceBtn = document.getElementById('chat-voice-btn');
        if (voiceBtn) {
          voiceBtn.classList.add('listening');
          voiceBtn.textContent = '🛑';
          voiceBtn.title = 'Stop listening';
        }
      };

      recognition.onend = () => {
        isListening = false;
        const voiceBtn = document.getElementById('chat-voice-btn');
        if (voiceBtn) {
          voiceBtn.classList.remove('listening');
          voiceBtn.textContent = '🎤';
          voiceBtn.title = 'Start voice typing';
        }
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = (input.value + " " + transcript).trim();
          autoResize(input);
          input.focus();
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isListening = false;
      };
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }

  function toggleVoiceOutput() {
    voiceEnabled = !voiceEnabled;
    const toggleBtn = document.getElementById('chat-audio-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = voiceEnabled ? '🔊' : '🔇';
      toggleBtn.classList.toggle('active', voiceEnabled);
    }
    if (!voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAvatarState('idle');
    }
  }

  function cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/\[\[WIDGET:.*?\]\]/g, '')
      .replace(/[*#`_\-]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/&[a-z0-9#]+;/gi, '')
      .trim();
  }

  function speakResponse(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    speechUtterance = new SpeechSynthesisUtterance(cleanedText);
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.name.includes('Google US English')) ||
                        voices.find(v => v.name.includes('Samantha')) ||
                        voices.find(v => v.lang.startsWith('en'));
    
    if (selectedVoice) {
      speechUtterance.voice = selectedVoice;
    }

    speechUtterance.onstart = () => {
      setAvatarState('speaking');
    };

    speechUtterance.onend = () => {
      setAvatarState('idle');
    };

    speechUtterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setAvatarState('idle');
    };

    window.speechSynthesis.speak(speechUtterance);
  }

  // ── Initialize Chat Panel ──
  function init() {
    if (initialized) return;
    initialized = true;

    const panel = document.getElementById('agent-panel');
    if (!panel) return;

    const defaultAgent = AgentManager.getAgent('portfolio-analyst');

    panel.innerHTML = `
      <!-- Chat Header -->
      <div class="agent-panel__header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="chat-avatar-container">
            ${renderAvatar('auto', currentAvatarState)}
          </div>
          <div>
            <strong id="chat-agent-name">Auto (AI Routing)</strong>
            <span style="font-size: 11px; color: #34d399; display: block;">● Online</span>
          </div>
        </div>
        <div class="agent-panel__header-controls">
          <button type="button" class="chat-audio-toggle" id="chat-audio-toggle" onclick="Chat.toggleVoiceOutput()" title="Toggle voice readout">🔇</button>
          <button type="button" class="icon-button" data-close-agent aria-label="Close assistant">x</button>
        </div>
      </div>

      <!-- Agent Selector -->
      <div class="agent-selector" id="agent-selector">
        <button class="agent-chip active" data-agent="auto" onclick="Chat.selectAgent('auto')">🤖 Auto</button>
        ${(AgentManager.getAllAgents ? AgentManager.getAllAgents() : []).map(a => `
          <button class="agent-chip" data-agent="${a.id}" onclick="Chat.selectAgent('${a.id}')">${a.icon} ${a.name.split(' ')[0]}</button>
        `).join('')}
      </div>

      <!-- Messages -->
      <div class="chat-messages" id="chat-messages">
        <div class="chat-message assistant">
          <div class="message-avatar">
            ${renderAvatar('auto', 'idle')}
          </div>
          <div class="message-content">
            <p><strong>Welcome to the GEAP AI Assistant!</strong></p>
            <p>${getWelcomeMessage()}</p>
            ${!GeapApp.getApiKey() ? `<p style="margin-top: 8px;"><button class="outline-button" onclick="GeapApp.showApiKeyModal()">🔑 Set API Key to enable AI</button></p>` : ''}
          </div>
        </div>
      </div>

      <!-- Suggestions -->
      <div class="suggestion-chips" id="chat-suggestions">
        ${getSuggestionChips()}
      </div>

      <!-- Input Area -->
      <div class="agent-panel__composer">
        <button type="button" class="chat-voice-btn" id="chat-voice-btn" onclick="Chat.toggleVoiceInput()" title="Start voice typing">🎤</button>
        <textarea class="chat-input" id="chat-input"
          placeholder="Ask me anything..."
          rows="1"
          onkeydown="Chat.handleKeyDown(event)"
          oninput="Chat.autoResize(this)"></textarea>
        <button type="button" class="chat-send-btn" onclick="Chat.handleSend()">Send</button>
      </div>
    `;

    // Re-bind the close button
    panel.querySelector('[data-close-agent]').addEventListener('click', () => {
      panel.hidden = true;
      const launcher = document.querySelector('.chat-launcher');
      if (launcher) launcher.setAttribute('aria-expanded', 'false');
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setAvatarState('idle');
      }
    });
  }

  function getSuggestionChips() {
    const page = detectPage();
    const suggestions = pageSuggestions[page] || pageSuggestions.dashboard;
    return suggestions.map(s => {
      let sendText = s;
      if (s === 'Test PII scrubber shield') {
        sendText = 'Test PII scrubber: my SSN is 111-22-3333 and my account is 1234-5678';
      }
      return `<button class="suggestion-chip" onclick="Chat.sendMessage('${sendText.replace(/'/g, "\\'")}')">${s}</button>`;
    }).join('');
  }

  // ── Agent Selection ──
  function selectAgent(agentId) {
    currentAgentId = agentId;

    document.querySelectorAll('.agent-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.agent === agentId);
    });

    if (agentId === 'auto') {
      updateHeader('Auto (AI Routing)');
    } else {
      const agent = AgentManager.getAgent(agentId);
      updateHeader(agent.name);
    }
  }

  function updateHeader(name) {
    const container = document.getElementById('chat-avatar-container');
    const nameEl = document.getElementById('chat-agent-name');
    if (container) {
      container.innerHTML = renderAvatar(currentAgentId, currentAvatarState);
    }
    if (nameEl) nameEl.textContent = name;
  }

  const INVESTMENT_DISCLAIMER = `

---
⚠️ **Compliance Disclaimer**: *Investment products are not FDIC insured, are not bank guarantees, and may lose value. Past performance is no guarantee of future results. This information does not constitute a recommendation or personalized financial advice. Securities products are offered by Morgan Stanley Smith Barney LLC, Member SIPC.*`;

  const ESCALATION_LINK = `

---
📞 **Need Assistance?** It looks like you're asking about money movement. To securely process transfers, withdrawals, or wires, please [Contact a Human Agent](tel:888-454-0555) (888-454-0555) or visit our [Pay & Transfer Center](/pay-transfer).`;

  function scrubPiiForAudit(text) {
    if (!text) return '';
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED SSN]')
      .replace(/\b\d{4}-\d{4}\b/g, '[REDACTED ACCOUNT]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED EMAIL]')
      .replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, '[REDACTED PHONE]');
  }

  function preprocessQuery(queryText) {
    let processedText = queryText;
    const normalized = queryText.toLowerCase();
    let redactedTypes = [];

    // Content Safety Check
    if (state.governance?.safety !== false) {
      if (normalized.includes("jailbreak") || normalized.includes("ignore instruction") || normalized.includes("override prompt")) {
        return { blocked: true, text: queryText, redactedTypes };
      }
    }

    // PII Redaction
    const piiEnabled = (state.aiSettings && state.aiSettings.piiScrubbingEnabled !== undefined)
      ? state.aiSettings.piiScrubbingEnabled
      : (state.governance?.pii !== false);

    if (piiEnabled) {
      const originalText = processedText;
      processedText = processedText
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED SSN]')
        .replace(/\b\d{4}-\d{4}\b/g, '[REDACTED ACCOUNT]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED EMAIL]')
        .replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, '[REDACTED PHONE]');
      
      if (processedText !== originalText) {
        if (originalText.match(/\b\d{3}-\d{2}-\d{4}\b/)) redactedTypes.push('SSN');
        if (originalText.match(/\b\d{4}-\d{4}\b/)) redactedTypes.push('Account Number');
        if (originalText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)) redactedTypes.push('Email');
        if (originalText.match(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/)) redactedTypes.push('Phone Number');
      }
    }

    return { blocked: false, text: processedText, redactedTypes };
  }

  function postprocessResponse(responseText, queryText) {
    let processedResponse = responseText;

    const hasInvestmentTerms = (text) => {
      const terms = [/portfolio/i, /\bbuy\b/i, /rebalance/i, /\bstock\b/i, /invest/i, /\bshares\b/i, /\betf\b/i, /\bfund\b/i];
      return terms.some(regex => regex.test(text));
    };

    const hasMoneyMovementTerms = (text) => {
      const terms = [/withdraw/i, /\bwire\b/i, /transfer/i, /money movement/i];
      return terms.some(regex => regex.test(text));
    };

    // Financial Disclaimer
    if (state.governance?.disclaimers !== false) {
      if (hasInvestmentTerms(responseText) || hasInvestmentTerms(queryText)) {
        processedResponse += INVESTMENT_DISCLAIMER;
      }
    }

    // Human Escalation Link
    if (state.governance?.escalation !== false) {
      if (hasMoneyMovementTerms(responseText) || hasMoneyMovementTerms(queryText)) {
        processedResponse += ESCALATION_LINK;
      }
    }

    return processedResponse;
  }

  // ── Send Message ──
  async function sendMessage(text) {
    if (!text || !text.trim() || isStreaming) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setAvatarState('thinking');

    const originalMessage = text.trim();
    
    // 1. Run preprocessing (PII Redaction & Safety Check)
    const preprocessResult = preprocessQuery(originalMessage);
    
    if (preprocessResult.blocked) {
      addMessageToUI('user', originalMessage, null, preprocessResult.redactedTypes);
      
      const suggestionsEl = document.getElementById('chat-suggestions');
      if (suggestionsEl) suggestionsEl.style.display = 'none';
      
      const safetyResponse = `⚠️ **Safety Alert**: Your message has been blocked by the content safety filter. System instructions and model guardrails cannot be overridden.`;
      
      const typingEl = showTypingIndicator();
      isStreaming = true;
      
      setTimeout(() => {
        if (typingEl) typingEl.remove();
        addMessageToUI('assistant', safetyResponse, '🛡️', {
          agentName: 'Safety Guardrail',
          agentId: 'safety-guardrail',
          latency: '0.1',
          sources: ['Firm Content Moderation Rules'],
          memoryRef: ''
        });
        speakResponse(safetyResponse);
        
        if (state.governance?.audit !== false) {
          BrokerageData.logAgentActivity({
            agent: 'Safety Guardrail',
            agentId: 'safety-guardrail',
            query: scrubPiiForAudit(originalMessage).substring(0, 80),
            status: 'error',
            latency: '0.1',
          });
        }
        isStreaming = false;
      }, 800);
      return;
    }

    const message = preprocessResult.text;
    addMessageToUI('user', message, null, preprocessResult.redactedTypes);

    const suggestionsEl = document.getElementById('chat-suggestions');
    if (suggestionsEl) suggestionsEl.style.display = 'none';

    // Server-side ADK supervisor handles agent routing
    const agent = AgentManager.getAgent(currentAgentId === 'auto' ? 'portfolio-analyst' : currentAgentId);
    updateHeader(agent.name);

    conversationHistory.push({ role: 'user', parts: [{ text: message }] });

    const typingEl = showTypingIndicator();
    isStreaming = true;

    // Check if it's one of the high-value demo queries (case-insensitive match) and no API key is set
    let mockResponse = null;
    const normalizedMsg = message.toLowerCase();

    const isPiiTestQuery = normalizedMsg.includes("test pii scrubber");
    const isAiAnalyzerQuery = normalizedMsg.includes("run deep ai portfolio analysis") || normalizedMsg.includes("ai analyzer for account");
    if (isPiiTestQuery) {
      mockResponse = `### 🛡️ GEAP Privacy Shield Demonstration
      
I have intercepted and processed your message. Before transmitting any prompt content to the external LLM, the **GEAP Security Engine** automatically scanned the query and scrubbed all sensitive information:
* **Social Security Number**: Redacted to \`[REDACTED SSN]\`
* **Account Number**: Redacted to \`[REDACTED ACCOUNT]\`

The underlying model received only the sanitized version: 
*\`Test PII scrubber: my SSN is [REDACTED SSN] and my account is [REDACTED ACCOUNT]\`*

This prevents credential leakage and ensures strict compliance with Morgan Stanley data governance guidelines.

You can customize these rules and toggle specific sources in the [AI Settings Page](/ai-settings).`;
    } else if (isAiAnalyzerQuery) {
      mockResponse = `### 📊 Deep AI Portfolio Health & Optimization Analysis
      
I have compiled a comprehensive portfolio diagnostic report for **${message.split("account: ")[1] || "your selected account"}** using the **Portfolio Analyst** agent. 

Our optimization engine has analyzed your holdings, diversification balance, tax efficiency, and yield performance. Below is the interactive visual diagnostic dashboard and recommended workflows:

[[WIDGET:AI_PORTFOLIO_ANALYZER]]

---
*Disclaimer: All recommendations are for educational purposes. Please consult your wealth advisor prior to execution.*`;
    } else if (normalizedMsg.includes("comprehensive risk analysis") || normalizedMsg.includes("run active risk analysis") || (normalizedMsg.includes("risk") && normalizedMsg.includes("analysis")) || normalizedMsg.includes("rebalance my portfolio") || normalizedMsg.includes("rebalance")) {
      mockResponse = `### 📊 AI Portfolio Risk Analysis & Diagnostic

Our diagnostics have analyzed your active holdings against regulatory and custom firm guidelines. We have identified elevated concentration and sector exposure thresholds:

#### ⚡ Current Exposure vs. Policy Thresholds
| Dimension | Active Portfolio | Firm Policy Limit | Risk Status |
| :--- | :---: | :---: | :---: |
| **Technology Sector** | **78.0%** | 50.0% | 🚨 High Risk |
| **MSFT Concentration** | **15.9%** | 15.0% | 🚨 High Risk |
| **Portfolio Beta** | **1.42** | 1.20 | ⚠️ Elevated |

#### 💡 Actionable Rebalancing Recommendation
To reduce technology concentration risk, bring **MSFT** below the **15%** limit, and increase asset stability, we recommend **selling 50 shares of MSFT** and reallocating the proceeds into **BND (Vanguard Total Bond Market ETF)**.

[[WIDGET:REBALANCE_FORM]]`;
    }

    if (normalizedMsg.includes("retirement") || normalizedMsg.includes("monte carlo") || normalizedMsg.includes("glide path") || normalizedMsg.includes("planning & retirement")) {
      mockResponse = `### ✦ GEAP Retirement Health Check & Projections

I have generated your retirement planning health check analysis based on your target retirement age of **65 (in 2046)** and current retirement savings rate. 

#### 📊 Retirement Health Summary
* **Savings Progress**: **$84,230.15** (On Track)
* **Projected Value (Age 65)**: **$1,245,000**
* **Success Probability**: **84%** based on 1,000 Monte Carlo simulations.

Use the **interactive chart widget** and speed dial options below to visualize your wealth path:

[[WIDGET:RETIREMENT_CHARTS]]

---
*Disclaimer: Projections are simulated using historical covariance models and do not guarantee future returns.*`;
    }

    if (normalizedMsg.includes("tax loss") || normalizedMsg.includes("tax-loss") || normalizedMsg.includes("harvesting") || normalizedMsg.includes("tax harvest")) {
      mockResponse = `### 📝 Tax-Loss Harvesting Opportunity Analysis
Based on your current portfolio holdings, the **Tax Specialist** and **Portfolio Analyst** agents have identified harvestable capital losses that can be used to offset capital gains or up to $3,000 of ordinary income.

#### 🔍 Identified Harvest Candidates:
* **KO (Coca-Cola)**: 50 shares @ $76.84 | Unrealized Loss: **-$96.00**
* **MBLY (Mobileye)**: 120 shares @ $10.54 | Unrealized Loss: **-$24.00**
* **RIVN (Rivian)**: 80 shares @ $18.12 | Unrealized Loss: **-$12.00**

**Total Harvestable Loss**: **-$132.00**

#### 💡 Strategy Recommendation:
To harvest these losses, you can sell the positions above and immediately reinvest the proceeds in a similar but not substantially identical asset (e.g. broad market ETFs) to maintain exposure while avoiding the SEC **Wash Sale Rule** (30-day window).

Would you like me to help you navigate to the [Trading Page](/trading) to execute these transactions?`;
    }

    const isOrchestrationQuery = normalizedMsg.includes("refinance") && (normalizedMsg.includes("rebalance") || normalizedMsg.includes("proceeds") || normalizedMsg.includes("refi"));
    if (isOrchestrationQuery) {
      mockResponse = `### ✦ GEAP Cross-Agent Wealth Orchestration Pipeline
      
I have initiated a cross-agent coordination workflow to analyze your refinancing and rebalancing scenario. Three specialized agents have collaborated to formulate this recommendation:

1. **Mortgage Agent** 🏡 Analyzed refinancing rates and home equity.
2. **Portfolio Analyst** 📊 Analyzed cash infusion rebalancing scenarios.
3. **Trade Assistant** ⚡ Prepared draft order staging.

#### 🏡 Step 1: Mortgage Agent Analysis
* **Current Mortgage**: $320,000 @ 6.25%
* **Refinance Quote (Morgan Stanley Home Loans)**: 30-Year Fixed at **5.25%** (Monthly savings: **+$240**)
* **Cash-Out Recommendation**: Extract **$50,000** home equity at a 5.50% cost of capital.

#### 📊 Step 2: Portfolio Analyst Recommendation
* **Proceeds Allocation**: Reinvesting the $50,000 cash-out proceeds into your Core Brokerage portfolio (**...6408**).
* **Diversification Shift**: Deploying cash into under-allocated sectors to trim technology risk:
  * **Diversified Bonds (BND)**: Increase allocation from **3.1%** to **35.0%** (deploying $35,000).
  * **International Equities (VXUS)**: Introduce a **15.0%** allocation (deploying $15,000).
* **Beta Reduction**: Reduces portfolio Beta from **1.42** (High Volatility) to **1.08** (Balanced Market Volatility).

#### ⚡ Step 3: Trade Assistant Preview (Draft Mode)
* Orders are prepared in **Draft Mode** (requires manual review before execution).
* Staged **BUY 480 BND** @ $72.15 (Est: $34,632)
* Staged **BUY 260 VXUS** @ $57.50 (Est: $14,950)

[[WIDGET:ORCHESTRATION_GRAPH]]

---
*Disclaimer: Refinance rates and investment recommendations are subject to credit approval and suitability reviews.*`;
    }

    const isWithdrawQuery = normalizedMsg.includes("withdraw") || normalizedMsg.includes("transfer");
    const isWireQuery = normalizedMsg.includes("wire") || normalizedMsg.includes("large transfer") || normalizedMsg.includes("withdraw 10000") || normalizedMsg.includes("withdraw $10000");

    if (isWireQuery) {
      mockResponse = `### 🚨 Human Advisor Escalation Required
      
I am unable to authorize or execute outbound wire transfers or cash withdrawals via the autonomous AI assistant. Under Morgan Stanley security guardrails, all wire requests require **human-in-the-loop verification** to prevent unauthorized transfers and fraud.

**Actions taken:**
1. Routed your wire transfer intent to your **Morgan Stanley Team**.
2. Staged a secure wire transaction draft.
3. Created a callback ticket (Reference ID: **MS-WIRE-84920**).

A member of your wealth advisory team will call you within **15 minutes** at your registered phone number to verify this wire transfer.

You can also contact the wire desk directly at **(888) 454-0555** or visit the [Pay & Transfer Center](/pay-transfer) to review staged drafts.`;
    } else if (isWithdrawQuery) {
      const accountId = state.selectedAccountId || 'core';
      const accountsList = (typeof mockData !== 'undefined' && mockData.accounts) ? mockData.accounts : [];
      const activeAccount = accountsList.find(a => a.id === accountId);
      const accountType = activeAccount ? activeAccount.type : 'Brokerage';
      const accountLabel = activeAccount ? activeAccount.label : 'CORE - Ind Brokerage';

      if (accountType === 'Custodial') {
        mockResponse = `⚠️ **Legal Compliance Gate Alert**
        
Your active account context is a **Custodial UTMA/UGMA Account** (${accountLabel}). 

Under regulatory rules (Uniform Transfers to Minors Act), funds in this account belong irrevocably to the beneficiary (**Elcie Lejnieks**). Custodians may only withdraw funds for the direct benefit of the minor. 

**Enforcement Actions:**
1. **Tool Blocked**: Automated outbound electronic transfer tools have been disabled for this account type.
2. **Routing Update**: Your request has been routed to the **Compliance Auditor Agent** for document review.
3. **Escalation**: Direct wire requests require paper form submission or human advisor verification.

To proceed with custodian authorization, please call our compliance desk at (888) 454-0555 or contact your [Morgan Stanley Wealth Team](/support).`;
      } else if (accountType === 'Bank') {
        mockResponse = `### 🏦 Checking Account Money Movement
        
Your active account context is a **Morgan Stanley Private Bank Checking Account** (${accountLabel}). 

Checking accounts support direct cash withdrawals, transfers, and ACH wires. 

**Available Cash**: **${activeAccount ? (activeAccount.available || '$6,941.26') : '$6,941.26'}**

You can:
* Go to the [Pay & Transfer Center](/pay-transfer) to initiate a transfer.
* [Order checks](/support) or view debit card status.
* Ask me to draft a transfer request to another of your accounts.`;
      } else {
        mockResponse = `### 📊 Brokerage Account Money Movement
        
Your active account context is an **Individual Brokerage Account** (${accountLabel}). 

To withdraw cash from this brokerage account, the funds must first be settled cash. 

**Details**:
* **Total Value**: **${activeAccount ? (activeAccount.netValue || '$12,734.88') : '$12,734.88'}**
* **Available Cash (Settle/Buying Power)**: **${activeAccount ? (activeAccount.available || '$246.19') : '$246.19'}**

*Note: Selling equity holdings requires **T+1 business day settlement** before cash can be wired out. If you withdraw more than the available settled cash, you will automatically initiate a **Margin Loan** subject to current margin interest rates.*

Would you like to review [Rebalance Options](/accounts/portfolios) or view the [Trading Page](/trading) to free up cash?`;
      }
    }

    if (!mockResponse && (normalizedMsg.includes("triage") || normalizedMsg.includes("alerts"))) {
      mockResponse = `### ⚠️ Alert Triage & Recommendations
I have triaged your active alerts and categorized them by urgency:

#### 🚨 High Priority (Action Required)
* **Concentration Flag (MSFT)**: Position is at **15.9%** ($35,614.40). Risk parameters recommend trimming to below 15% to maintain diversification.
* **Missing Beneficiary**: Brokerage account lacks estate instructions.

#### 📅 Medium Priority (Market Events)
* **Earnings Upcoming**: **NVDA** reports earnings next Thursday. Implied volatility is elevated.
* **Price Target Reached**: **AAPL** crossed its $190 target threshold.

#### 💡 Recommended Next Step
View your full inbox and filter by category on the [Alerts Page](/alerts) to clear resolved notifications.`;
    }

    if (!mockResponse && !GeapApp.getApiKey()) {

      // Dashboard Demo Queries
      if (normalizedMsg.includes("briefing")) {
        mockResponse = `### 📋 Account Briefing
Here is a summary of your accounts and items requiring attention as of **June 8, 2026**:

#### 💰 Balances & Performance
* **Total Assets**: **$52,430.20**
* **Day's Gain**: **+$340.50 (+0.65%)**
* **Cash Balance**: **$1,540.20** across all checking/brokerage accounts.

#### ⚠️ Items Requiring Attention (2 Alerts)
1. **Concentration Risk (High)**: Your position in **MSFT** represents **15.9%** ($35,614.40) of your brokerage account, which exceeds the standard **15%** single-stock threshold.
2. **Estate Planning (Medium)**: Your Brokerage account (***1864**) has **no beneficiary** designated.

#### 💡 Recommended Actions
* [ ] Review [Rebalance Ideas](/accounts/portfolios) to reduce concentration in MSFT.
* [ ] Go to [Profile & Settings](/profile) to add a primary beneficiary.`;
      } else if (normalizedMsg.includes("explain my portfolio") || normalizedMsg.includes("diversified") || normalizedMsg.includes("portfolio explanation")) {
        mockResponse = `### 📈 Portfolio Analysis
Here is a breakdown of your portfolio holdings and allocation:

#### 📊 Sector Allocation
* **Technology**: **78.0%** ($35,614.40) — heavily concentrated.
* **Cash & Equivalents**: **20.0%** ($10,486.04) — high liquidity.
* **Financials/Other**: **12.0%** ($6,329.76).

#### ⚡ Active Movers Today
* **NVDA** (Lead Gainer): **+2.45%** today, driving **+$125.40** of your gain.
* **MSFT**: **+0.12%** today, lagging but stable.

#### 🛡️ Concentration Assessment
You hold **5 active positions**, with **MSFT** representing the single largest risk driver. Because it exceeds 15% of your total assets, you are highly exposed to software sector volatility.

#### 💡 Suggested Action
You can view sector metrics and trigger rebalancing suggestions on the [Portfolios Page](/accounts/portfolios).`;
      } else if (normalizedMsg.includes("take me to the agent fabric") || normalizedMsg.includes("agent fabric")) {
        mockResponse = `### 🗺️ Navigation Assistant
        I will redirect you to the **AI Admin / Agent Fabric** view now.
        
        Redirecting you to [Agent Fabric](/agent-fabric)...`;
        
        // Trigger redirect after a short delay
        setTimeout(() => {
          if (typeof routeTo === 'function') {
            routeTo('/agent-fabric');
          }
        }, 1500);
      }

      // Portfolio Page Demo Queries
      else if (normalizedMsg.includes("analyze my holdings")) {
        mockResponse = `### 📈 Holdings Analysis
Your portfolio consists of 5 positions valued at **$48,912.74**:
* **MSFT**: 92 shares @ $387.11 (**$35,614.40**) — Weight: **72.8%** | Return: **+14.2%**
* **NVDA**: 110 shares @ $95.34 (**$10,486.04**) — Weight: **21.4%** | Return: **+8.5%**
* **AAPL**: 12 shares @ $185.12 (**$2,221.44**) — Weight: **4.5%** | Return: **-2.1%**
* **Cash**: **$1,540.20** — Weight: **3.1%**

**Observation**: Your holdings are heavily dominated by MSFT and tech sector growth. Underperforming positions like AAPL should be reviewed.`;
      } else if (normalizedMsg.includes("underperforming")) {
        mockResponse = `### 📉 Underperforming Stocks
Based on total returns:
* **AAPL** is currently down **-2.1%** from your cost basis, representing a loss of **-$48.20**.
* All other positions (MSFT, NVDA) are positive.

**Tip**: Consider if tax-loss harvesting or reallocating this capital into diversified index assets fits your strategy.`;
      } else if (normalizedMsg.includes("rebalancing")) {
        mockResponse = `### ⚖️ Rebalancing Suggestions
To reduce technology concentration and rebalance back to a standard 60/40 allocation:
1. **Trim MSFT**: Sell **20 shares** of MSFT (~$7,742) to bring its weight down to a safer 55%.
2. **Reallocate to Diversified Assets**: Deploy the proceeds into broad-market ETFs or increase your cash reserves to take advantage of market dips.`;
      }

      // Trading Page Demo Queries
      else if (normalizedMsg.includes("order type")) {
        mockResponse = `### ⚡ Guide to Order Types
Here are the main order types you can use on E*TRADE:
1. **Market Order**: Executes immediately at the best available price. Use when speed of execution is your top priority.
2. **Limit Order**: Executes only at your specified price or better. Use when you want price certainty and are willing to wait.
3. **Stop Order**: Becomes a market order once a stop price is triggered. Use to protect against downside losses.`;
      } else if (normalizedMsg.includes("aapl a good buy") || normalizedMsg.includes("buy aapl")) {
        mockResponse = `### 🔬 AAPL Market Analysis (Mock Research)
* **Current Price**: **$185.12** (+0.45%)
* **Valuation**: P/E ratio is **28.2**, which is in-line with its 5-year average.
* **Bull Case**: Robust service revenue growth and upcoming AI software features.
* **Bear Case**: Slower hardware upgrade cycles and valuation premium relative to earnings growth.

*Educational note: Always assess whether AAPL fits your risk tolerance and portfolio diversification goals.*`;
      } else if (normalizedMsg.includes("set a limit order")) {
        mockResponse = `### 📝 Setting a Limit Order
Follow these steps to set a limit order:
1. Go to the [Trading Page](/trading).
2. Enter the symbol (e.g., **AAPL**).
3. Select **Buy** and order type **Limit**.
4. Set your Limit Price (e.g., **$183.00** if you want to buy when the price drops).
5. Enter the quantity and click **Preview Order**.`;
      }

      // Agent Studio Page Demo Queries
      else if (normalizedMsg.includes("agents work")) {
        mockResponse = `### 🤖 How GEAP Agents Work
The platform runs a multi-agent system built on the Google Enterprise Agent Platform (GEAP):
1. **Auto Router**: Classifies your query and forwards it to the best-suited agent.
2. **Specialized Agents**: Each agent is equipped with a custom system prompt and a specific set of mock read-tools (e.g., \`getPortfolioHoldings\`, \`getQuote\`).
3. **Tool Execution**: Agents execute tool queries in real time to fetch data and formulate a response.`;
      } else if (normalizedMsg.includes("portfolio agent do")) {
        mockResponse = `### 📊 Portfolio Analyst Capabilities
The Portfolio Analyst agent can:
* Access \`getPortfolioHoldings\` to see your current shares, costs, and weights.
* Access \`getSectorAllocation\` to see sector exposure.
* Recommend rebalancing steps and flag concentration risks.
* Calculate total returns and day's change impact.`;
      } else if (normalizedMsg.includes("routing configured")) {
        mockResponse = `### 🗺️ Routing Configuration
Routing is handled dynamically in [agents.js](file:///Users/klejnieks/Graveyard/GEAP/public/js/agents.js):
* **Keyword Matching**: Checks query text for thematic keywords (e.g., 'rebalance' -> Portfolio Analyst, 'buy' -> Trade Assistant).
* **Page Bias**: Adds routing weight depending on the SPA view you are currently viewing, making the assistant context-aware.`;
      }

      // Agent Fabric Page Demo Queries
      else if (normalizedMsg.includes("agent performance")) {
        mockResponse = `### 📊 Agent Fleet Metrics
Here is a snapshot of current performance from the Agent Fabric:
* **Active Agents**: **4** (Portfolio, Trade, Research, Support)
* **Success Rate**: **99.8%**
* **Avg Response Time**: **1.2s**
* **Active Sessions**: **42**
* All systems are operating normally.`;
      } else if (normalizedMsg.includes("busiest")) {
        mockResponse = `### 🔥 Busiest Agent
The **Portfolio Analyst** agent is currently the busiest, handling **45%** of all customer requests today, followed by **Market Research** (30%).`;
      } else if (normalizedMsg.includes("bloomberg") || normalizedMsg.includes("inflation")) {
        const allowed = state.aiSettings?.allowedSources || {};
        if (allowed.bloomberg === false) {
          mockResponse = `Access Blocked: The source "Bloomberg" is currently blacklisted in your AI Settings. I cannot retrieve information from it.`;
        } else {
          mockResponse = `### Bloomberg Economic Survey: Inflation at 2.4%
Bloomberg economists report core CPI has moderated to 2.4% year-over-year. The Fed is expected to hold rates steady but signal a cut for the September meeting. [Source: Bloomberg]`;
        }
      } else if (normalizedMsg.includes("spacex") || normalizedMsg.includes("starlink")) {
        const allowed = state.aiSettings?.allowedSources || {};
        const yahooAllowed = allowed.yahoo !== false;
        const bloombergAllowed = allowed.bloomberg !== false;
        const reutersAllowed = allowed.reuters !== false;

        if (!yahooAllowed && !bloombergAllowed && !reutersAllowed) {
          mockResponse = `I am sorry, Ken. I am unable to find any information regarding a SpaceX IPO from the allowed public or private sources configured in your AI Settings. Please check your AI Settings page to ensure all desired sources are enabled, or try a different query.`;
        } else {
          let responses = [];
          if (yahooAllowed) {
            responses.push(`### SpaceX Valuation Hits $210 Billion; Starlink IPO Speculation Grows\nSpaceX is executing a secondary tender offer valuing the private aerospace giant at $210 billion. While Elon Musk has stated SpaceX itself will remain private to focus on Mars missions, rumors persist that Starlink, its satellite internet division, could be spun off for an IPO by late 2026 as its cash flow turns positive. [Source: Yahoo Finance]`);
          }
          if (bloombergAllowed) {
            responses.push(`### Bloomberg Analysis: Starlink Spin-Off Eyed for Potential 2026 Listing\nSpaceX satellite unit Starlink is achieving positive free cash flow. Wall Street analysts suggest a Starlink spin-off and IPO could unlock significant value, potentially valuing the satellite division at $80 billion independently. Elon Musk has noted that Starlink will only IPO once cash flow becomes highly predictable. [Source: Bloomberg]`);
          }
          if (reutersAllowed) {
            responses.push(`### SpaceX Prepares Tender Offer at Record Valuation, IPO Deferred\nReuters sources indicate SpaceX has no active plans for a parent-company IPO in 2026, citing Elon Musk's long-term goal of keeping control to fund colonization of Mars. However, discussions about a Starlink public debut remain on the table depending on regulatory approvals and launch cadence of the Starship fleet. [Source: Reuters]`);
          }
          mockResponse = responses.join('\n\n');
        }
      } else if (normalizedMsg.includes("navigate") || normalizedMsg.includes("go to portfolios")) {
        if (state.aiSettings && state.aiSettings.accessMode === 'read-only') {
          mockResponse = `🔒 **Read-Only Mode Active**: All writing actions and navigation are blocked by your AI Settings guardrail. Navigation is unavailable.`;
        } else {
          mockResponse = `### Navigation Assistant
I will redirect you to the Portfolios view now.

Redirecting to [Portfolios](/accounts/portfolios)...`;
          setTimeout(() => {
            if (typeof routeTo === 'function') {
              routeTo('/accounts/portfolios');
            }
          }, 1500);
        }
      }
    }

    if (mockResponse) {
      // Apply post-processing
      const finalMockResponse = postprocessResponse(mockResponse, message);

      let provenance = {
        agentName: agent.name,
        agentId: agent.id,
        latency: (Math.random() * 0.4 + 0.3).toFixed(1),
        sources: ['E*TRADE Connected API', 'Internal Portfolio Database'],
        memoryRef: ''
      };

      if (isAiAnalyzerQuery) {
        provenance = {
          agentName: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          latency: '1.4',
          sources: ['E*TRADE Connected API', 'Internal Portfolio Database', 'Firm Asset Models'],
          memoryRef: 'References May 28 NVDA Trim Decision and June 2 Asset Policy updates.'
        };
      } else if (normalizedMsg.includes("comprehensive risk analysis") || normalizedMsg.includes("run active risk analysis") || (normalizedMsg.includes("risk") && normalizedMsg.includes("analysis")) || normalizedMsg.includes("rebalance my portfolio") || normalizedMsg.includes("rebalance")) {
        provenance = {
          agentName: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          latency: '1.1',
          sources: ['E*TRADE Connected API', 'SEC Edgar Whitelist', 'Compliance Diagnostic Rules'],
          memoryRef: 'References decision on May 28 to maintain high technology exposure.'
        };
      } else if (normalizedMsg.includes("retirement") || normalizedMsg.includes("monte carlo") || normalizedMsg.includes("glide path") || normalizedMsg.includes("planning & retirement")) {
        provenance = {
          agentName: 'Retirement Guide',
          agentId: 'retirement-guide',
          latency: '1.3',
          sources: ['E*TRADE Connected API', 'Monte Carlo Simulator Engine', 'IRC Section 401(k) Guidelines'],
          memoryRef: 'References May 12 Goal Planning session.'
        };
      } else if (normalizedMsg.includes("tax loss") || normalizedMsg.includes("tax-loss") || normalizedMsg.includes("harvesting") || normalizedMsg.includes("tax harvest")) {
        provenance = {
          agentName: 'Tax Specialist',
          agentId: 'tax-specialist',
          latency: '1.0',
          sources: ['E*TRADE Connected API', 'IRC Wash Sale Guidelines', 'Internal Portfolio Database'],
          memoryRef: 'References May 24 Tax Profile Update.'
        };
      } else if (normalizedMsg.includes("refinance") && (normalizedMsg.includes("rebalance") || normalizedMsg.includes("proceeds") || normalizedMsg.includes("refi"))) {
        provenance = {
          agentName: 'Wealth Orchestrator (Multi-Agent Flow)',
          agentId: 'orchestrator',
          latency: '1.9',
          sources: ['Morgan Stanley Home Loans API', 'E*TRADE Connected API', 'Compliance Diagnostic Rules'],
          memoryRef: 'References May 18 Refinance Inquiry and June 2 Asset Policy updates.'
        };
      } else if (normalizedMsg.includes("test pii scrubber")) {
        provenance = {
          agentName: 'Safety Guardrail (PII Scrubber Node)',
          agentId: 'safety-guardrail',
          latency: '0.15',
          sources: ['GEAP Local Ruleset', 'Firm Security Policy'],
          memoryRef: ''
        };
      } else if (normalizedMsg.includes("withdraw") || normalizedMsg.includes("transfer")) {
        const accountId = state.selectedAccountId || 'core';
        const accountsList = (typeof mockData !== 'undefined' && mockData.accounts) ? mockData.accounts : [];
        const activeAccount = accountsList.find(a => a.id === accountId);
        const accountType = activeAccount ? activeAccount.type : 'Brokerage';
        
        if (accountType === 'Custodial') {
          provenance = {
            agentName: 'Compliance Auditor (Custodial Guardrail)',
            agentId: 'compliance-auditor',
            latency: '0.95',
            sources: ['Uniform Transfers to Minors Act (UTMA) SEC. 9', 'IRC Section 7511', 'Morgan Stanley Trust Policy'],
            memoryRef: 'Redundant safety lock activated due to minor beneficiary account type.'
          };
        } else if (accountType === 'Bank') {
          provenance = {
            agentName: 'Private Bank Assistant',
            agentId: 'bank-assistant',
            latency: '0.65',
            sources: ['Private Bank Direct Deposit Guidelines', 'ACH Settlement Rules'],
            memoryRef: ''
          };
        } else {
          provenance = {
            agentName: 'Brokerage Assistant',
            agentId: 'brokerage-assistant',
            latency: '0.8',
            sources: ['SEC Settlement Rule T+1', 'Margin Agreement Disclosures'],
            memoryRef: ''
          };
        }
      } else if (normalizedMsg.includes("wire") || normalizedMsg.includes("large transfer") || normalizedMsg.includes("withdraw 10000") || normalizedMsg.includes("withdraw $10000")) {
        provenance = {
          agentName: 'Customer Support (Escalation Node)',
          agentId: 'customer-support',
          latency: '0.6',
          sources: ['Morgan Stanley Security Policy', 'Wire Desk API', 'Human Handoff Protocols'],
          memoryRef: 'Triggered human-in-the-loop override due to high-risk wire request.'
        };
      } else if (normalizedMsg.includes("briefing")) {
        provenance = {
          agentName: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          latency: '0.8',
          sources: ['E*TRADE Connected API', 'Compliance Diagnostic Rules'],
          memoryRef: 'References your preference on June 2 to monitor MSFT concentration.'
        };
      } else if (normalizedMsg.includes("explain my portfolio") || normalizedMsg.includes("diversified") || normalizedMsg.includes("portfolio explanation")) {
        provenance = {
          agentName: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          latency: '0.8',
          sources: ['E*TRADE Connected API', 'Bloomberg RSS'],
          memoryRef: 'References your decision on May 28 to reject NVDA trim.'
        };
      }

      setTimeout(() => {
        if (typingEl) typingEl.remove();
        addMessageToUI('assistant', finalMockResponse, agent.icon, provenance);
        speakResponse(finalMockResponse);
        conversationHistory.push({ role: 'model', parts: [{ text: finalMockResponse }] });

        if (state.governance?.audit !== false) {
          BrokerageData.logAgentActivity({
            agent: provenance.agentName,
            agentId: provenance.agentId,
            query: scrubPiiForAudit(message).substring(0, 80),
            status: 'success',
            latency: provenance.latency,
          });
        }

        isStreaming = false;
      }, 1000);
      return;
    }

    try {
      // Build context: page awareness + agent-specific tool data
      let contextData = '';

      // Get consistent unified context
      const contextPayload = ContextEngine.getContextPayload(agent.id);
      contextData += ContextEngine.formatContextToMarkdown(contextPayload);

      // Add agent-specific tool data
      agent.tools.forEach(toolName => {
        contextData += '\n\n' + AgentManager.callTool(toolName);
      });

      const systemPromptWithData = agent.systemPrompt +
        '\n\nIMPORTANT: You are aware of which page the user is currently viewing in the E*TRADE platform. ' +
        'Reference what they can see on screen when relevant. If they ask a vague question, use the page context to infer what they mean. ' +
        'For example, if they are on the Portfolios page and ask "what does this mean?", they likely mean the allocation data visible on that page.' +
        '\n\nCURRENT DATA (use this to answer the user\'s question):\n' + contextData;

      // Filter tools based on agent config to sandbox tool usage
      const agentTools = GeminiAPI.toolDeclarations.filter(t => agent.tools.includes(t.name));

      const response = await GeminiAPI.sendMessage(
        conversationHistory,
        systemPromptWithData,
        agentTools
      );

      // Apply post-processing
      const finalResponse = postprocessResponse(response, message);

      if (typingEl) typingEl.remove();
      addMessageToUI('assistant', finalResponse, agent.icon);
      speakResponse(finalResponse);
      conversationHistory.push({ role: 'model', parts: [{ text: finalResponse }] });

      if (state.governance?.audit !== false) {
        BrokerageData.logAgentActivity({
          agent: agent.name,
          agentId: agent.id,
          query: scrubPiiForAudit(message).substring(0, 80),
          status: 'success',
          latency: (Math.random() * 2 + 0.5).toFixed(1),
        });
      }

    } catch (error) {
      if (typingEl) typingEl.remove();
      const errMsg = `I encountered an error: ${error.message}. Please try again.`;
      addMessageToUI('assistant', errMsg, '⚠️');
      speakResponse(errMsg);

      if (state.governance?.audit !== false) {
        BrokerageData.logAgentActivity({
          agent: agent.name,
          agentId: agent.id,
          query: scrubPiiForAudit(message).substring(0, 80),
          status: 'error',
          latency: '0',
        });
      }
    }

    isStreaming = false;

    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-16);
    }
  }

  // ── UI Helpers ──
  function getOrchestrationGraphHtml() {
    return `
      <div class="orchestration-graph" style="margin: 14px 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); font-family: sans-serif;">
        <strong style="font-size: 11px; color: #1e293b; display: block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">🛡️ GEAP Active Orchestration Pipeline</strong>
        <div style="display: flex; align-items: center; justify-content: space-between; position: relative; gap: 8px;">
          <!-- Node 1 -->
          <div class="graph-node" style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #eef2ff; border: 2px solid #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 0 8px rgba(79,70,229,0.15);">🏡</div>
            <strong style="font-size: 10px; display: block; color: #1e293b; margin-top: 4px; font-weight: 700;">Mortgage Agent</strong>
            <span style="font-size: 8px; color: #166534; font-weight: 600;">Refinance OK</span>
          </div>
          <!-- Arrow 1 -->
          <div style="display: flex; align-items: center; justify-content: center; flex: 0.5;">
            <span style="color: #4f46e5; font-size: 12px; animation: pulseGlow 1.5s infinite;">➔</span>
          </div>
          <!-- Node 2 -->
          <div class="graph-node" style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #faf5ff; border: 2px solid #9333ea; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 0 8px rgba(147,51,234,0.15);">📊</div>
            <strong style="font-size: 10px; display: block; color: #1e293b; margin-top: 4px; font-weight: 700;">Portfolio Analyst</strong>
            <span style="font-size: 8px; color: #166534; font-weight: 600;">Rebalance OK</span>
          </div>
          <!-- Arrow 2 -->
          <div style="display: flex; align-items: center; justify-content: center; flex: 0.5;">
            <span style="color: #9333ea; font-size: 12px; animation: pulseGlow 1.5s infinite;">➔</span>
          </div>
          <!-- Node 3 -->
          <div class="graph-node" style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #ecfdf5; border: 2px solid #059669; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 0 8px rgba(5,150,105,0.15);">⚡</div>
            <strong style="font-size: 10px; display: block; color: #1e293b; margin-top: 4px; font-weight: 700;">Trade Assistant</strong>
            <span style="font-size: 8px; color: #2563eb; font-weight: 600;">Staged (Draft)</span>
          </div>
        </div>
        <div style="margin-top: 12px; padding: 8px; background: #f1f5f9; border-radius: 6px; font-size: 9px; color: #475569; line-height: 1.3; border-left: 3px solid #6b2d9b; text-align: left;">
          ⚙️ <strong>Handoff Telemetry:</strong> Refinance options approved ➡️ Rebalancing allocations computed (BND & VXUS) ➡️ Trade orders generated under Draft Mode.
        </div>
      </div>
    `;
  }

  function getRebalanceFormHtml() {
    const msftPrice = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? (BrokerageData.getHolding('MSFT')?.currentPrice || 445.18) : 445.18;
    const bndPrice = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? (BrokerageData.getHolding('BND')?.currentPrice || 72.15) : 72.15;
    const cash = typeof BrokerageData !== 'undefined' && BrokerageData.account ? BrokerageData.account.cashBalance : 14869.92;

    const msftProceeds = 50 * msftPrice;
    const bndCost = 300 * bndPrice;
    const netProceeds = msftProceeds - bndCost;
    const newCash = cash + netProceeds;

    const formattedMsftProceeds = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(msftProceeds) : `$${msftProceeds.toFixed(2)}`;
    const formattedBndCost = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(bndCost) : `$${bndCost.toFixed(2)}`;
    const formattedNetProceeds = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(netProceeds) : `$${netProceeds.toFixed(2)}`;
    const formattedNewCash = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(newCash) : `$${newCash.toFixed(2)}`;

    const aiSettings = (state.aiSettings) ? state.aiSettings : {
      accessMode: 'read-write',
      tradeExecutionMode: 'execute'
    };

    let guardrailBanner = '';
    let btnDisabledAttr = '';
    let inputsDisabledAttr = '';
    let btnText = '✦ Execute Rebalance';
    let btnStyle = '';

    if (aiSettings.accessMode === 'read-only') {
      guardrailBanner = `
        <div class="rebalance-guardrail-banner" style="background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; line-height: 1.4; font-weight: 500;">
          🔒 <strong>Read-Only Mode Active</strong>: All writing actions and trades are blocked by your AI Settings guardrail.
        </div>
      `;
      btnDisabledAttr = 'disabled';
      inputsDisabledAttr = 'disabled';
      btnText = 'Execution Blocked (Read-Only)';
      btnStyle = 'opacity: 0.55; cursor: not-allowed; background: #94a3b8; border-color: #94a3b8;';
    } else if (aiSettings.tradeExecutionMode === 'never') {
      guardrailBanner = `
        <div class="rebalance-guardrail-banner" style="background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; line-height: 1.4; font-weight: 500;">
          ⚠️ <strong>Trade Execution Disabled</strong>: Trading is disabled in your customer AI Settings.
        </div>
      `;
      btnDisabledAttr = 'disabled';
      btnText = 'Execution Blocked (Disabled)';
      btnStyle = 'opacity: 0.55; cursor: not-allowed; background: #94a3b8; border-color: #94a3b8;';
    } else if (aiSettings.tradeExecutionMode === 'draft') {
      guardrailBanner = `
        <div class="rebalance-guardrail-banner" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; line-height: 1.4; font-weight: 500;">
          📝 <strong>Draft Mode Active</strong>: This order will be staged in your review queue for manual execution.
        </div>
      `;
      btnText = '✦ Stage Rebalance Order';
    }

    return `
      <div class="chat-rebalance-card">
        <div class="chat-rebalance-header">
          <strong>Interactive Rebalance Ticket</strong>
          <span class="geap-badge badge-purple" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;">Pending Approval</span>
        </div>
        
        ${guardrailBanner}

        <div class="rebalance-trade-row">
          <div class="trade-side-badge sell">SELL</div>
          <div class="trade-details">
            <div class="symbol-line">
              <strong>MSFT</strong> <span class="holding-name">Microsoft Corp</span>
            </div>
            <div class="trade-inputs">
              <label>Shares: 
                <input type="number" id="rebalance-sell-shares" class="rebalance-input" value="50" min="1" max="80" oninput="Chat.updateRebalanceEstimates()" ${inputsDisabledAttr}>
              </label>
              <span class="price-multiplier">@ $${msftPrice.toFixed(2)}</span>
            </div>
          </div>
          <div class="trade-value" id="rebalance-sell-val">${formattedMsftProceeds}</div>
        </div>

        <div class="rebalance-trade-row">
          <div class="trade-side-badge buy">BUY</div>
          <div class="trade-details">
            <div class="symbol-line">
              <strong>BND</strong> <span class="holding-name">Vanguard Total Bond Market</span>
            </div>
            <div class="trade-inputs">
              <label>Shares: 
                <input type="number" id="rebalance-buy-shares" class="rebalance-input" value="300" min="1" oninput="Chat.updateRebalanceEstimates()" ${inputsDisabledAttr}>
              </label>
              <span class="price-multiplier">@ $${bndPrice.toFixed(2)}</span>
            </div>
          </div>
          <div class="trade-value" id="rebalance-buy-val">${formattedBndCost}</div>
        </div>

        <div class="rebalance-divider"></div>

        <div class="rebalance-summary">
          <div class="summary-line">
            <span>Net Proceeds:</span>
            <strong id="rebalance-net-val" class="net-positive">${formattedNetProceeds}</strong>
          </div>
          <div class="summary-line">
            <span>New Cash Balance:</span>
            <span id="rebalance-cash-val">${formattedNewCash}</span>
          </div>
        </div>

        <button id="execute-rebalance-btn" class="rebalance-execute-btn" onclick="Chat.executeRebalanceTrade(this)" ${btnDisabledAttr} style="${btnStyle}">
          ${btnText}
        </button>

        <div id="rebalance-status-container" class="rebalance-status-container" style="display: none; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; color: #475569;">
          <div class="rebalance-spinner"></div>
          <span id="rebalance-status-text">Verifying cash reserves and routing orders...</span>
        </div>
      </div>
    `;
  }

  function updateRebalanceEstimates() {
    const msftPrice = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? (BrokerageData.getHolding('MSFT')?.currentPrice || 445.18) : 445.18;
    const bndPrice = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? (BrokerageData.getHolding('BND')?.currentPrice || 72.15) : 72.15;
    const cash = typeof BrokerageData !== 'undefined' && BrokerageData.account ? BrokerageData.account.cashBalance : 14869.92;

    const sellInput = document.getElementById('rebalance-sell-shares');
    const buyInput = document.getElementById('rebalance-buy-shares');
    if (!sellInput || !buyInput) return;

    const sellShares = parseInt(sellInput.value) || 0;
    const buyShares = parseInt(buyInput.value) || 0;

    const msftProceeds = sellShares * msftPrice;
    const bndCost = buyShares * bndPrice;
    const netProceeds = msftProceeds - bndCost;
    const newCash = cash + netProceeds;

    const sellValEl = document.getElementById('rebalance-sell-val');
    const buyValEl = document.getElementById('rebalance-buy-val');
    const netValEl = document.getElementById('rebalance-net-val');
    const cashValEl = document.getElementById('rebalance-cash-val');

    if (sellValEl) sellValEl.textContent = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(msftProceeds) : `$${msftProceeds.toFixed(2)}`;
    if (buyValEl) buyValEl.textContent = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(bndCost) : `$${bndCost.toFixed(2)}`;
    
    if (netValEl) {
      netValEl.textContent = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(netProceeds) : `$${netProceeds.toFixed(2)}`;
      if (netProceeds >= 0) {
        netValEl.className = 'net-positive';
      } else {
        netValEl.className = 'net-negative';
      }
    }
    if (cashValEl) cashValEl.textContent = typeof BrokerageData !== 'undefined' && typeof BrokerageData.formatCurrency === 'function' ? BrokerageData.formatCurrency(newCash) : `$${newCash.toFixed(2)}`;
  }

  function executeRebalanceTrade(btn) {
    const sellInput = document.getElementById('rebalance-sell-shares');
    const buyInput = document.getElementById('rebalance-buy-shares');
    const statusContainer = document.getElementById('rebalance-status-container');
    const statusText = document.getElementById('rebalance-status-text');

    if (!sellInput || !buyInput || !statusContainer || !statusText) return;

    const sellShares = parseInt(sellInput.value) || 0;
    const buyShares = parseInt(buyInput.value) || 0;

    const msftHolding = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? BrokerageData.getHolding('MSFT') : null;
    if (msftHolding && sellShares > msftHolding.shares) {
      alert(`Cannot sell ${sellShares} shares of MSFT. You only hold ${msftHolding.shares} shares.`);
      return;
    }

    btn.style.display = 'none';
    sellInput.disabled = true;
    buyInput.disabled = true;
    statusContainer.style.display = 'flex';

    const msftPrice = msftHolding ? msftHolding.currentPrice : 445.18;
    const bndPrice = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getHolding === 'function' ? (BrokerageData.getHolding('BND')?.currentPrice || 72.15) : 72.15;

    const isDraft = (state.aiSettings && state.aiSettings.tradeExecutionMode === 'draft');

    const steps = isDraft ? [
      { text: "Validating order parameters and account context...", delay: 0 },
      { text: "Securing compliance approval via GEAP Safety Engine...", delay: 600 },
      { text: "Drafting order ticket in manual execution queue...", delay: 1200 },
      { text: "Staging confirmation details...", delay: 1800 }
    ] : [
      { text: "Verifying cash reserves and routing orders...", delay: 0 },
      { text: "Securing compliance approval via GEAP Safety Engine...", delay: 600 },
      { text: "Executing trades in Morgan Stanley clearance network...", delay: 1200 },
      { text: "Simulating clearing and logging audit trails...", delay: 1800 }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        statusText.textContent = step.text;
      }, step.delay);
    });

    setTimeout(() => {
      if (typeof BrokerageData !== 'undefined') {
        const msft = typeof BrokerageData.getHolding === 'function' ? BrokerageData.getHolding('MSFT') : null;
        const bnd = typeof BrokerageData.getHolding === 'function' ? BrokerageData.getHolding('BND') : null;

        if (!isDraft) {
          if (msft) msft.shares -= sellShares;
          if (bnd) bnd.shares += buyShares;

          const netProceeds = (sellShares * msftPrice) - (buyShares * bndPrice);
          if (BrokerageData.account) {
            BrokerageData.account.cashBalance = +(BrokerageData.account.cashBalance + netProceeds).toFixed(2);
          }

          if (typeof BrokerageData.recalculatePortfolio === 'function') {
            BrokerageData.recalculatePortfolio();
          }
        }

        if (typeof BrokerageData.logAgentActivity === 'function') {
          BrokerageData.logAgentActivity({
            agent: 'Portfolio Analyst',
            agentId: 'portfolio-analyst',
            query: isDraft 
              ? `Draft/stage rebalance order: Trim MSFT by ${sellShares} shares, buy ${buyShares} shares of BND.`
              : `Execute active rebalance order: Trim MSFT by ${sellShares} shares, buy ${buyShares} shares of BND.`,
            status: 'success',
            latency: '1.4',
          });
        }
      }

      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        if (isDraft) {
          card.innerHTML = `
            <div class="rebalance-success-state">
              <div class="success-icon-wrapper" style="background: #e0f2fe; color: #0284c7; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                <svg class="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width: 24px; height: 24px;">
                  <circle class="success-checkmark__circle" cx="26" cy="26" r="25" fill="none" stroke="#0284c7" stroke-width="4"/>
                  <path class="success-checkmark__check" fill="none" stroke="#0284c7" stroke-width="4" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h3>Trade Order Staged</h3>
              <p class="success-desc">This order has been staged in your manual review queue. It will not be filled automatically.</p>
              <div class="success-details">
                <div><strong>Reference ID:</strong> STG-940215-REB</div>
                <div><strong>Status:</strong> Staged (Awaiting Manual Approval)</div>
              </div>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="rebalance-success-state">
              <div class="success-icon-wrapper">
                <svg class="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="success-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h3>Rebalance Executed Successfully</h3>
              <p class="success-desc">Portfolio holdings, cash balances, and sector weights have been updated in real-time.</p>
              <div class="success-details">
                <div><strong>Reference ID:</strong> TXN-940215-REB</div>
                <div><strong>Compliance Status:</strong> Passed (Clean Audit Logged)</div>
              </div>
            </div>
          `;
        }
      }

      if (typeof render === 'function') {
        render();
      }
    }, 2400);
  }

  function getRetirementWidgetHtml(activeTab = 'glidepath') {
    let svgContent = '';
    
    if (activeTab === 'glidepath') {
      svgContent = `
        <svg width="100%" height="180" viewBox="0 0 320 180" style="background: #f8fafc; border-radius: 8px;">
          <!-- Grid Lines -->
          <line x1="30" y1="30" x2="290" y2="30" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="60" x2="290" y2="60" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="90" x2="290" y2="90" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="120" x2="290" y2="120" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2" />
          <line x1="30" y1="150" x2="290" y2="150" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="30" y1="30" x2="30" y2="150" stroke="#cbd5e1" stroke-width="1.5" />

          <!-- Stacked Areas -->
          <!-- Cash (Top area, fill between Y=30 and Bonds top) -->
          <path d="M 30,30 L 95,30 L 160,30 L 225,30 L 290,30 L 290,48 L 225,48 L 160,48 L 95,42 L 30,36 Z" fill="rgba(52, 211, 153, 0.15)" stroke="#34D399" stroke-width="1.5" />
          <!-- Bonds (Middle area, fill between Bonds top and Equities top) -->
          <path d="M 30,36 L 95,42 L 160,48 L 225,48 L 290,48 L 290,114 L 225,102 L 160,84 L 95,66 L 30,54 Z" fill="rgba(251, 191, 36, 0.15)" stroke="#FBBF24" stroke-width="1.5" />
          <!-- Equities (Bottom area, fill between Equities top and Y=150) -->
          <path d="M 30,150 L 30,54 L 95,66 L 160,84 L 225,102 L 290,114 L 290,150 Z" fill="rgba(79, 142, 247, 0.15)" stroke="#4F8EF7" stroke-width="1.5" />

          <!-- Labels -->
          <text x="30" y="165" font-size="9" fill="#64748b" text-anchor="middle">Age 35</text>
          <text x="95" y="165" font-size="9" fill="#64748b" text-anchor="middle">Age 45</text>
          <text x="160" y="165" font-size="9" fill="#64748b" text-anchor="middle">Age 55</text>
          <text x="225" y="165" font-size="9" fill="#64748b" text-anchor="middle">Age 65</text>
          <text x="290" y="165" font-size="9" fill="#64748b" text-anchor="middle">Age 75</text>

          <text x="25" y="34" font-size="8" fill="#94a3b8" text-anchor="end">100%</text>
          <text x="25" y="94" font-size="8" fill="#94a3b8" text-anchor="end">50%</text>
          <text x="25" y="154" font-size="8" fill="#94a3b8" text-anchor="end">0%</text>
          
          <!-- Legend -->
          <text x="35" y="22" font-size="8" fill="#4F8EF7" font-weight="700">■ Equities</text>
          <text x="95" y="22" font-size="8" fill="#FBBF24" font-weight="700">■ Bonds</text>
          <text x="155" y="22" font-size="8" fill="#34D399" font-weight="700">■ Cash</text>
        </svg>
      `;
    } else if (activeTab === 'montecarlo') {
      svgContent = `
        <svg width="100%" height="180" viewBox="0 0 320 180" style="background: #f8fafc; border-radius: 8px;">
          <!-- Grid Lines -->
          <line x1="30" y1="20" x2="290" y2="20" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="63" x2="290" y2="63" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="107" x2="290" y2="107" stroke="#e2e8f0" stroke-width="1" />
          <line x1="30" y1="150" x2="290" y2="150" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="30" y1="20" x2="30" y2="150" stroke="#cbd5e1" stroke-width="1.5" />

          <!-- Shaded probability band -->
          <path d="M 30,137 Q 160,110 290,29 L 290,130 Q 160,135 30,137 Z" fill="rgba(107, 45, 155, 0.08)" />

          <!-- Target Line ($1.0M) -->
          <line x1="30" y1="107" x2="290" y2="107" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4" />
          <text x="285" y="103" font-size="8" fill="#64748b" text-anchor="end">Target: $1.0M</text>

          <!-- Projection Curves -->
          <path d="M 30,137 Q 160,110 290,29" fill="none" stroke="#22c55e" stroke-width="2" />
          <path d="M 30,137 Q 160,125 290,98" fill="none" stroke="#6B2D9B" stroke-width="2.5" />
          <path d="M 30,137 Q 160,135 290,130" fill="none" stroke="#ef4444" stroke-width="2" />

          <!-- Labels -->
          <text x="30" y="165" font-size="9" fill="#64748b" text-anchor="middle">2026</text>
          <text x="160" y="165" font-size="9" fill="#64748b" text-anchor="middle">2036</text>
          <text x="290" y="165" font-size="9" fill="#64748b" text-anchor="middle">2046</text>

          <text x="25" y="24" font-size="8" fill="#94a3b8" text-anchor="end">$3.0M</text>
          <text x="25" y="67" font-size="8" fill="#94a3b8" text-anchor="end">$2.0M</text>
          <text x="25" y="111" font-size="8" fill="#94a3b8" text-anchor="end">$1.0M</text>
          
          <!-- Legend Overlay -->
          <text x="40" y="35" font-size="8" fill="#22c55e" font-weight="600">▲ 90% (Optimistic)</text>
          <text x="40" y="47" font-size="8" fill="#6B2D9B" font-weight="600">■ 50% (Median)</text>
          <text x="40" y="59" font-size="8" fill="#ef4444" font-weight="600">▼ 10% (Conservative)</text>
        </svg>
      `;
    } else {
      svgContent = `
        <svg width="100%" height="180" viewBox="0 0 320 180" style="background: #f8fafc; border-radius: 8px;">
          <!-- Segmented Allocation Bar -->
          <rect x="30" y="45" width="260" height="24" rx="6" fill="#e2e8f0" />
          
          <rect x="30" y="45" width="117" height="24" rx="6" fill="#4F8EF7" />
          <rect x="141" y="45" width="6" height="24" fill="#4F8EF7" />
          <rect x="147" y="45" width="52" height="24" fill="#A78BFA" />
          <rect x="199" y="45" width="65" height="24" fill="#FBBF24" />
          <rect x="264" y="45" width="26" height="24" rx="6" fill="#34D399" />
          <rect x="264" y="45" width="6" height="24" fill="#34D399" />

          <!-- Legend -->
          <circle cx="40" cy="95" r="4" fill="#4F8EF7" />
          <text x="50" y="98" font-size="9" fill="#1e293b" font-weight="600">U.S. Equities (45%)</text>
          <text x="280" y="98" font-size="9" fill="#64748b" text-anchor="end">$37,903.57</text>

          <circle cx="40" cy="115" r="4" fill="#A78BFA" />
          <text x="50" y="118" font-size="9" fill="#1e293b" font-weight="600">Intl Equities (20%)</text>
          <text x="280" y="118" font-size="9" fill="#64748b" text-anchor="end">$16,846.03</text>

          <circle cx="40" cy="135" r="4" fill="#FBBF24" />
          <text x="50" y="138" font-size="9" fill="#1e293b" font-weight="600">Fixed Income (25%)</text>
          <text x="280" y="138" font-size="9" fill="#64748b" text-anchor="end">$21,057.54</text>

          <circle cx="40" cy="155" r="4" fill="#34D399" />
          <text x="50" y="158" font-size="9" fill="#1e293b" font-weight="600">Cash & Savings (10%)</text>
          <text x="280" y="158" font-size="9" fill="#64748b" text-anchor="end">$8,423.01</text>
          
          <text x="30" y="30" font-size="10" fill="#475569" font-weight="700">Retirement Allocation Mix</text>
        </svg>
      `;
    }

    return `
      <div class="chat-rebalance-card" id="retirement-widget-card">
        <div class="chat-rebalance-header" style="margin-bottom: 8px;">
          <strong>Retirement Path Projections</strong>
          <span class="geap-badge badge-purple" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;">Active Advisor</span>
        </div>

        <div class="retirement-chart-tabs" style="display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <button class="retirement-tab-btn ${activeTab === 'glidepath' ? 'active' : ''}" onclick="Chat.switchRetirementChartTab('glidepath')">Glide Path</button>
          <button class="retirement-tab-btn ${activeTab === 'montecarlo' ? 'active' : ''}" onclick="Chat.switchRetirementChartTab('montecarlo')">Monte Carlo</button>
          <button class="retirement-tab-btn ${activeTab === 'allocation' ? 'active' : ''}" onclick="Chat.switchRetirementChartTab('allocation')">Allocation</button>
        </div>

        <div class="retirement-chart-container" style="position: relative;">
          ${svgContent}
        </div>

        <!-- Speed Dial Action Buttons -->
        <div class="retirement-speed-dials" style="display: flex; gap: 6px; margin-top: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="speed-dial-btn" onclick="Chat.switchRetirementChartTab('glidepath')">✦ Glide Path</button>
          <button class="speed-dial-btn" onclick="Chat.switchRetirementChartTab('montecarlo')">✦ Monte Carlo</button>
          <button class="speed-dial-btn" onclick="Chat.switchRetirementChartTab('allocation')">✦ Allocation</button>
        </div>
      </div>
    `;
  }

  function switchRetirementChartTab(tabName) {
    const card = document.getElementById('retirement-widget-card');
    if (card) {
      card.outerHTML = getRetirementWidgetHtml(tabName);
    }
  }

  function renderVisualReview(data) {
    return `
      <div class="chat-rebalance-card" id="${data.widgetId || ''}">
        <!-- Header -->
        <div class="chat-rebalance-header" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 11px; color: var(--geap-text, #1e293b); font-weight: 700;">${data.title}</strong>
          <span class="geap-badge" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; ${data.badgeStyle || ''}">${data.badge}</span>
        </div>

        <!-- Net Worth Banner -->
        <div class="analyzer-metric-row" style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--geap-border, #e2e8f0); padding-bottom: 10px;">
          <div style="text-align: left;">
            <span style="font-size: 9px; color: var(--geap-text-secondary, #64748b); display: block; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Net Assets</span>
            <strong style="font-size: 1.1rem; color: var(--purple-bright, #6B2D9B); font-weight: 800;">${data.netAssets}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9px; color: var(--geap-text-secondary, #64748b); display: block; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Day's Change</span>
            <strong style="font-size: 1.1rem; color: ${data.dayChangeColor}; font-weight: 800;">${data.dayChange}</strong>
          </div>
        </div>

        <!-- Health Score circular gauge -->
        <div style="display: flex; gap: 12px; align-items: center; background: var(--geap-surface-secondary, #f8fafc); border: 1px solid var(--geap-border, #e2e8f0); border-radius: 10px; padding: 10px; margin-bottom: 14px;">
          <div style="position: relative; width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            <svg width="44" height="44" viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 44px; height: 44px;">
              <path stroke="var(--geap-border, #e2e8f0)" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="${data.scoreColor}" stroke-width="3.2" stroke-dasharray="${data.healthScore}, 100" stroke-linecap="round" fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div style="position: absolute; text-align: center; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
              <span style="font-size: 11px; font-weight: 800; color: var(--geap-text, #1e293b); line-height: 1;">${data.healthScore}</span>
              <span style="font-size: 6px; color: var(--geap-text-secondary, #64748b); text-transform: uppercase; font-weight: 600; margin-top: 1px;">Score</span>
            </div>
          </div>
          <div style="text-align: left; flex: 1;">
            <strong style="font-size: 10px; color: ${data.scoreColor}; display: block; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;">${data.scoreLabel}</strong>
            <span style="font-size: 9.5px; color: var(--geap-text-secondary, #64748b); line-height: 1.35; display: block; margin-top: 1px;">${data.scoreDesc}</span>
          </div>
        </div>

        <!-- Asset Allocation bar -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--geap-text-secondary, #64748b); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.03em;">
            <span>Asset Class Allocation</span>
            <span>${data.equitiesPct}% Equities / ${data.cashPct}% Cash</span>
          </div>
          <div style="height: 6px; border-radius: 3px; display: flex; overflow: hidden; background: var(--geap-surface-tertiary, #f1f3f5);">
            <div style="width: ${data.equitiesPct}%; background: linear-gradient(90deg, #7c3aed, #a855f7); height: 100%;"></div>
            <div style="width: ${data.cashPct}%; background: #06b6d4; height: 100%;"></div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 5px; font-size: 8.5px;">
            <span style="display: flex; align-items: center; gap: 4px; color: var(--geap-text, #1e293b); font-weight: 500;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #7c3aed; display: inline-block;"></span>
              Equities (${data.equitiesVal})
            </span>
            <span style="display: flex; align-items: center; gap: 4px; color: var(--geap-text, #1e293b); font-weight: 500;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #06b6d4; display: inline-block;"></span>
              Cash (${data.cashVal})
            </span>
          </div>
        </div>

        <!-- Top Holdings & Sector Allocation side-by-side or stacked -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 9px; color: var(--geap-text-secondary, #64748b); font-weight: 600; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.03em;">Portfolio Breakdown</div>
          
          <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 8px;">
            <!-- Holdings Mini-Table -->
            <div style="border: 1px solid var(--geap-border, #e2e8f0); border-radius: 6px; overflow: hidden; background: var(--geap-surface, #ffffff);">
              <div style="background: var(--geap-surface-secondary, #f8fafc); padding: 4px 6px; font-size: 8px; font-weight: 700; color: var(--geap-text-secondary, #64748b); border-bottom: 1px solid var(--geap-border, #e2e8f0); text-transform: uppercase; letter-spacing: 0.02em;">Top Holdings</div>
              <div style="display: flex; flex-direction: column;">
                ${data.holdingsHtml}
              </div>
            </div>

            <!-- Sectors progress bars -->
            <div style="border: 1px solid var(--geap-border, #e2e8f0); border-radius: 6px; padding: 6px; background: var(--geap-surface, #ffffff); display: flex; flex-direction: column; gap: 6px; justify-content: center;">
              ${data.sectorsHtml}
            </div>
          </div>
        </div>

        <!-- Alerts -->
        ${data.alertsHtml || ''}

        <!-- Actions -->
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          ${data.ctaHtml}
        </div>

        <!-- Status indicator for action -->
        ${data.statusId ? `
          <div id="${data.statusId}" class="rebalance-status-container" style="display: none; align-items: center; gap: 6px; margin-top: 10px; font-size: 10px; color: var(--geap-text-secondary, #64748b);">
            <div class="rebalance-spinner"></div>
            <span>${data.statusText || 'Executing...'}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  function getAiPortfolioAnalyzerWidgetHtml() {
    const accountId = state.selectedAccountId || 'core';
    
    if (accountId.startsWith("etrade_")) {
      const liveAccounts = BrokerageData.getLiveAccounts ? BrokerageData.getLiveAccounts() : [];
      const acc = liveAccounts.find(a => a.accountIdKey === accountId.replace("etrade_", "")) || liveAccounts[0];
      if (!acc) return `<div class="chat-rebalance-card">Error: E*TRADE Live account data not found.</div>`;
      
      const totalVal = BrokerageData.formatCurrency(acc.totalValue);
      const cashVal = BrokerageData.formatCurrency(acc.cashBalance);
      const equitiesVal = BrokerageData.formatCurrency(acc.totalValue - acc.cashBalance);
      
      const dayChangeVal = acc.dayChange || 0;
      const dayChangePctVal = acc.dayChangePercent || 0;
      const dayChangeStr = `${BrokerageData.formatChange(dayChangeVal)} (${BrokerageData.formatPercent(dayChangePctVal)})`;
      
      const totalValueNum = acc.totalValue || 0;
      const cashValNum = acc.cashBalance || 0;
      const cashPct = totalValueNum > 0 ? Math.round((cashValNum / totalValueNum) * 100) : 0;
      const equitiesPct = 100 - cashPct;
      
      let healthScore = 100;
      let scoreLabel = "Optimized";
      let scoreColor = "#10b981"; // green
      let scoreDesc = "Your E*TRADE account holdings and cash levels are healthy.";
      let alertsHtml = "";
      let ctaHtml = "";
      
      let maxConcentration = 0;
      let concentratedSymbol = "";
      if (acc.holdings && acc.holdings.length > 0) {
        acc.holdings.forEach(h => {
          if (h.weight > maxConcentration) {
            maxConcentration = h.weight;
            concentratedSymbol = h.symbol;
          }
        });
      }
      
      if (maxConcentration > 20) {
        const excess = Math.round(maxConcentration - 15);
        healthScore -= Math.min(40, excess * 2);
        alertsHtml += `
          <div style="background: #fff1f2; border: 1px solid #fecaca; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
            <span style="font-size: 13px;">⚠️</span>
            <div>
              <strong style="color: #be123c; font-size: 10.5px; display: block; font-weight: 700;">Single-Stock Concentration</strong>
              <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
                Your position in <strong>${concentratedSymbol}</strong> accounts for <strong>${maxConcentration.toFixed(1)}%</strong> of your holdings, exceeding the 15% safety threshold.
              </span>
            </div>
          </div>
        `;
        ctaHtml += `
          <button class="rebalance-execute-btn" onclick="triggerChatQuery('suggest rebalancing order to reduce concentration in ${concentratedSymbol}', 'portfolio-analyst')" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
            ✦ Trim ${concentratedSymbol}
          </button>
        `;
      }
      
      if (cashPct > 20) {
        healthScore -= Math.min(25, Math.round((cashPct - 20) * 1.2));
        alertsHtml += `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
            <span style="font-size: 13px;">💡</span>
            <div>
              <strong style="color: #b45309; font-size: 10.5px; display: block; font-weight: 700;">Excess Cash Yield Drag</strong>
              <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
                You are holding <strong>${cashPct}%</strong> cash. Sweeping excess cash into high-yield sweep assets (4.50% APY) could generate extra yields.
              </span>
            </div>
          </div>
        `;
        if (!ctaHtml) {
          ctaHtml += `
            <button class="rebalance-execute-btn" onclick="triggerChatQuery('recommend high yield cash sweep', 'portfolio-analyst')" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
              ✦ Sweep Cash
            </button>
          `;
        }
      }
      
      if (healthScore < 65) {
        scoreLabel = "Concentration Risk";
        scoreColor = "#ef4444"; // red
        scoreDesc = "High concentration risk detected. Immediate rebalancing is recommended.";
      } else if (healthScore < 85) {
        scoreLabel = "Moderate Yield Drag";
        scoreColor = "#f59e0b"; // yellow
        scoreDesc = "Sub-optimal cash allocation or minor diversification gaps.";
      }
      
      if (!ctaHtml) {
        ctaHtml = `
          <button class="rebalance-execute-btn" onclick="triggerChatQuery('run active risk analysis', 'portfolio-analyst')" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
            ✦ Run Active Risk Analysis
          </button>
        `;
      }
      
      let holdingsHtml = "";
      if (acc.holdings && acc.holdings.length > 0) {
        holdingsHtml = acc.holdings.slice(0, 3).map(h => `
          <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
            <div>
              <strong style="color: var(--geap-text, #1e293b);">${h.symbol}</strong>
              <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">${h.shares} shrs</span>
            </div>
            <div style="text-align: right;">
              <span style="color: var(--geap-text, #1e293b); font-weight: 500;">${BrokerageData.formatCurrency(h.marketValue)}</span>
              <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">${h.weight.toFixed(1)}%</span>
            </div>
          </div>
        `).join('');
      } else {
        holdingsHtml = `<div style="padding: 10px; text-align: center; color: var(--geap-text-secondary, #64748b); font-size: 9.5px;">No active holdings.</div>`;
      }
      
      let sectorsHtml = "";
      const sectors = acc.sectorAllocation || {};
      if (Object.keys(sectors).length > 0) {
        sectorsHtml = Object.entries(sectors)
          .sort((a, b) => b[1].weight - a[1].weight)
          .slice(0, 3)
          .map(([sectorName, data]) => {
            const weight = data.weight;
            const color = data.color || '#64748b';
            return `
              <div style="text-align: left;">
                <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
                  <span style="font-weight: 500; color: var(--geap-text, #1e293b); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 60px;">${sectorName}</span>
                  <strong style="color: var(--geap-text, #1e293b);">${weight.toFixed(1)}%</strong>
                </div>
                <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
                  <div style="width: ${weight}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
                </div>
              </div>
            `;
          }).join('');
      } else {
        sectorsHtml = `<div style="text-align: center; color: var(--geap-text-secondary, #64748b); font-size: 8.5px;">No sector exposure.</div>`;
      }
      
      return renderVisualReview({
        widgetId: "analyzer-widget-etrade",
        title: "✦ Live E*TRADE Diagnostics",
        badge: "Live Mode",
        badgeStyle: "background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;",
        netAssets: totalVal,
        dayChange: dayChangeStr,
        dayChangeColor: acc.dayChange >= 0 ? 'var(--positive)' : 'var(--negative)',
        healthScore: healthScore,
        scoreColor: scoreColor,
        scoreLabel: scoreLabel,
        scoreDesc: scoreDesc,
        equitiesPct: equitiesPct,
        cashPct: cashPct,
        equitiesVal: equitiesVal,
        cashVal: cashVal,
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-etrade-status",
        statusText: "Analyzing E*TRADE positions..."
      });
    }
    
    if (accountId === "main") {
      const acc = mockData.accounts.find(a => a.id === 'main');
      const netAssets = acc ? acc.netValue : "$18,427.55";
      const dayChange = acc ? acc.dayGain : "-$82.14 (-0.44%)";
      const dayChangeTone = acc ? acc.dayGainTone : "negative";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">BAC</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">148 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$8,008.28</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">43.5%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">KO</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">77 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$5,916.68</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">32.0%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">BND</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">38 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$2,741.70</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">15.0%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Financials</span>
            <strong style="color: var(--geap-text, #1e293b);">43.5%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 43.5%; height: 100%; background: #3b82f6; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Consumer</span>
            <strong style="color: var(--geap-text, #1e293b);">32.0%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 32%; height: 100%; background: #ec4899; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Bonds</span>
            <strong style="color: var(--geap-text, #1e293b);">15.0%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 15%; height: 100%; background: #10b981; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #fff1f2; border: 1px solid #fecaca; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">⚠️</span>
          <div>
            <strong style="color: #be123c; font-size: 10.5px; display: block; font-weight: 700;">Single-Stock Concentration</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              Your position in <strong>BAC</strong> represents <strong>43.5%</strong> of holdings. This exceeds the 15% threshold, exposing you to high volatility.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="Chat.executeConcentrationTrim(this)" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Trim BAC Concentration
        </button>
        <button class="rebalance-execute-btn" onclick="routeTo('/accounts/portfolios')" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          View Sector Alloc
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-main",
        title: "✦ Portfolio Optimization Dashboard",
        badge: "Ind Brokerage",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: dayChangeTone === 'positive' ? 'var(--positive)' : 'var(--negative)',
        healthScore: 54,
        scoreColor: "#ef4444",
        scoreLabel: "Poor Diversification",
        scoreDesc: "Overconcentrated position in a single financial sector asset.",
        equitiesPct: 85,
        cashPct: 15,
        equitiesVal: "$15,663.85",
        cashVal: "$2,763.70",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-main-status",
        statusText: "Staging order: Sell 100 BAC, reallocate to BND..."
      });
    }
    
    if (accountId === "core") {
      const acc = mockData.accounts.find(a => a.id === 'core');
      const netAssets = acc ? acc.netValue : "$12,734.88";
      const dayChange = acc ? acc.dayGain : "$56.41 (0.44%)";
      const dayChangeTone = acc ? acc.dayGainTone : "positive";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">QQQ</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">12 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$6,200.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">48.7%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">RIVN</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">226 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$4,100.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">32.2%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">MBLY</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">231 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$2,434.88</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">19.1%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Tech Index</span>
            <strong style="color: var(--geap-text, #1e293b);">48.7%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 48.7%; height: 100%; background: #7c3aed; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Automotive</span>
            <strong style="color: var(--geap-text, #1e293b);">32.2%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 32.2%; height: 100%; background: #3b82f6; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Hardware</span>
            <strong style="color: var(--geap-text, #1e293b);">19.1%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 19.1%; height: 100%; background: #10b981; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #eef2ff; border: 1px solid #e0e7ff; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">📊</span>
          <div>
            <strong style="color: #312e81; font-size: 10.5px; display: block; font-weight: 700;">Dollar-Cost Averaging</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              To maximize the compounding potential of this smart beta allocation, we suggest setting up a recurring <strong>$250 monthly Auto-Investment</strong>.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="Chat.executeAutoInvest(this)" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Enable Auto-Investing
        </button>
        <button class="rebalance-execute-btn" onclick="state.portfolioTab = 'risk'; render(); triggerChatQuery('run active risk analysis', 'portfolio-analyst');" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          Run Risk Diagnostic
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-core",
        title: "✦ Smart Beta Strategy Optimization",
        badge: "Core Portfolios",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: dayChangeTone === 'positive' ? 'var(--positive)' : 'var(--negative)',
        healthScore: 88,
        scoreColor: "#10b981",
        scoreLabel: "Optimized Allocation",
        scoreDesc: "Active Smart Beta portfolio outperforming baseline benchmarks.",
        equitiesPct: 98,
        cashPct: 2,
        equitiesVal: "$12,492.12",
        cashVal: "$242.76",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-core-status",
        statusText: "Configuring recurring transfer plan..."
      });
    }
    
    if (accountId === "elcie") {
      const acc = mockData.accounts.find(a => a.id === 'elcie');
      const netAssets = acc ? acc.netValue : "$3,608.94";
      const dayChange = acc ? acc.dayGain : "-$11.08 (-0.29%)";
      const dayChangeTone = acc ? acc.dayGainTone : "negative";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">AAPL</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">9 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$1,800.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">49.9%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">BND</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">21 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$1,490.49</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">41.3%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Technology</span>
            <strong style="color: var(--geap-text, #1e293b);">49.9%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 49.9%; height: 100%; background: #7c3aed; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Bonds</span>
            <strong style="color: var(--geap-text, #1e293b);">41.3%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 41.3%; height: 100%; background: #10b981; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #eef2ff; border: 1px solid #e0e7ff; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">🎓</span>
          <div>
            <strong style="color: #312e81; font-size: 10.5px; display: block; font-weight: 700;">Glide Path Transition</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              As the beneficiary approaches college age, we recommend transitioning to an age-based targets fund to shield savings.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="Chat.executeGlidePathTransition(this)" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Transition to Glide Path
        </button>
        <button class="rebalance-execute-btn" onclick="triggerChatQuery('tax loss harvesting analysis', 'portfolio-analyst')" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          Harvest Losses
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-elcie",
        title: "✦ UTMA/UGMA Education Optimization",
        badge: "Custodial UGMA",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: dayChangeTone === 'positive' ? 'var(--positive)' : 'var(--negative)',
        healthScore: 82,
        scoreColor: "#10b981",
        scoreLabel: "Balanced Target",
        scoreDesc: "Age-appropriate asset distribution with moderate loss harvest opportunities.",
        equitiesPct: 75,
        cashPct: 25,
        equitiesVal: "$2,708.94",
        cashVal: "$900.00",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-elcie-status",
        statusText: "Transitioning allocation model..."
      });
    }
    
    if (accountId === "checking") {
      const acc = mockData.accounts.find(a => a.id === 'checking');
      const netAssets = acc ? acc.netValue : "$6,941.26";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">Liquid Cash</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">Private Bank</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">${netAssets}</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">100.0%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Bank Sweep</span>
            <strong style="color: var(--geap-text, #1e293b);">100.0%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 100%; height: 100%; background: #06b6d4; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">💡</span>
          <div>
            <strong style="color: #b45309; font-size: 10.5px; display: block; font-weight: 700;">Sub-Optimal Cash Yield</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              You are holding ${netAssets} in cash earning near-zero (0.05%) interest. Sweeping <strong>$4,941.26</strong> to high-yield sweep yields <strong>4.50% APY</strong> (+$222/yr).
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="Chat.executeYieldSweep(this)" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Sweep Excess Cash ($4,941)
        </button>
        <button class="rebalance-execute-btn" onclick="routeTo('/pay-transfer')" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          Transfer to Brokerage
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-checking",
        title: "✦ Cash Yield Optimization Analysis",
        badge: "Private Checking",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: "+$0.00 (0.00%)",
        dayChangeColor: "var(--geap-text-secondary)",
        healthScore: 45,
        scoreColor: "#ef4444",
        scoreLabel: "Sub-Optimal Yield",
        scoreDesc: "Idle liquid cash represents a drag on your net yield strategy.",
        equitiesPct: 0,
        cashPct: 100,
        equitiesVal: "$0.00",
        cashVal: netAssets,
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-checking-status",
        statusText: "Moving funds to High-Yield Cash sweep..."
      });
    }
    
    if (accountId === "individual") {
      const acc = mockData.accounts.find(a => a.id === 'individual');
      const netAssets = acc ? acc.netValue : "$4,285.17";
      const dayChange = acc ? acc.dayGain : "$18.95 (0.44%)";
      const dayChangeTone = acc ? acc.dayGainTone : "positive";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">MSFT</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">5 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$2,200.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">51.3%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">VTI</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">5 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$1,321.05</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">30.8%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Technology</span>
            <strong style="color: var(--geap-text, #1e293b);">51.3%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 51.3%; height: 100%; background: #7c3aed; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Broad Market</span>
            <strong style="color: var(--geap-text, #1e293b);">30.8%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 30.8%; height: 100%; background: #3b82f6; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #eef2ff; border: 1px solid #e0e7ff; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">💡</span>
          <div>
            <strong style="color: #312e81; font-size: 10.5px; display: block; font-weight: 700;">Diversification Check</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              Review combined allocations across all linked accounts to check for tech overlap.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="routeTo('/accounts/portfolios')" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Analyze Sector Allocation
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-individual",
        title: "✦ Asset Allocation Optimizer",
        badge: "Individual Brokerage",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: dayChangeTone === 'positive' ? 'var(--positive)' : 'var(--negative)',
        healthScore: 85,
        scoreColor: "#10b981",
        scoreLabel: "Well Diversified",
        scoreDesc: "Assets and sectors are properly distributed across multiple categories.",
        equitiesPct: 82,
        cashPct: 18,
        equitiesVal: "$3,521.05",
        cashVal: "$764.12",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml
      });
    }
    
    if (accountId === "stock") {
      const acc = mockData.accounts.find(a => a.id === 'stock');
      const netAssets = acc ? acc.netValue : "$5,914.92";
      const dayChange = acc ? acc.dayGain : "$136.78 (2.37%)";
      const dayChangeTone = acc ? acc.dayGainTone : "positive";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">MSFT RSU</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">11 shrs</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$5,114.92</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">86.5%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">MSFT Opt</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">3 contracts</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$800.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">13.5%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Company Stock</span>
            <strong style="color: var(--geap-text, #1e293b);">86.5%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 86.5%; height: 100%; background: #7c3aed; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Derivatives</span>
            <strong style="color: var(--geap-text, #1e293b);">13.5%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 13.5%; height: 100%; background: #ec4899; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">🛡️</span>
          <div>
            <strong style="color: #b45309; font-size: 10.5px; display: block; font-weight: 700;">Vesting Concentration Hedging</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              Your upcoming vestings are heavily tied to company equity. Consider options collars to hedge.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="Chat.viewVestingSchedule(this)" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ View Vesting Schedule
        </button>
        <button class="rebalance-execute-btn" onclick="triggerChatQuery('explain option collars', 'market-research')" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          Option Collars
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-stock",
        title: "✦ Equity Award Vesting & Tax Strategy",
        badge: "Stock Plan",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: dayChangeTone === 'positive' ? 'var(--positive)' : 'var(--negative)',
        healthScore: 62,
        scoreColor: "#f59e0b",
        scoreLabel: "Vesting Concentration",
        scoreDesc: "High exposure to single employer stock awards with upcoming vestings.",
        equitiesPct: 100,
        cashPct: 0,
        equitiesVal: netAssets,
        cashVal: "$0.00",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml,
        statusId: "analyzer-stock-status",
        statusText: "Loading vesting calendar details..."
      });
    }
    
    if (accountId === "morgan_stanley") {
      const account = mockData.morganStanleyAccount;
      const netAssets = account ? account.assets : "$8,104.31";
      const dayChange = account ? `${account.dayGain} (${account.dayGainPct})` : "+$34.20 (+0.42%)";
      
      let holdingsHtml = `
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--geap-border, #e2e8f0);">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">MS Growth</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">Private Fund</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$4,200.00</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">51.8%</span>
          </div>
        </div>
        <div style="padding: 5px 6px; font-size: 9.5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--geap-text, #1e293b);">Fixed Inc</strong>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); margin-left: 4px;">MS Bonds</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--geap-text, #1e293b); font-weight: 500;">$2,283.45</span>
            <span style="font-size: 8px; color: var(--geap-text-secondary, #64748b); display: block;">28.2%</span>
          </div>
        </div>
      `;
      
      let sectorsHtml = `
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Growth Funds</span>
            <strong style="color: var(--geap-text, #1e293b);">51.8%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 51.8%; height: 100%; background: #7c3aed; border-radius: 2px;"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 1px;">
            <span style="font-weight: 500; color: var(--geap-text, #1e293b);">Fixed Income</span>
            <strong style="color: var(--geap-text, #1e293b);">28.2%</strong>
          </div>
          <div style="height: 3.5px; border-radius: 2px; background: var(--geap-surface-tertiary, #f1f3f5); overflow: hidden;">
            <div style="width: 28.2%; height: 100%; background: #10b981; border-radius: 2px;"></div>
          </div>
        </div>
      `;
      
      let alertsHtml = `
        <div style="background: #eef2ff; border: 1px solid #e0e7ff; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 6px; align-items: flex-start; text-align: left;">
          <span style="font-size: 13px;">📞</span>
          <div>
            <strong style="color: #312e81; font-size: 10.5px; display: block; font-weight: 700;">Wealth Review Scheduled</strong>
            <span style="color: #4f4f4f; font-size: 9.5px; line-height: 1.3; display: block; margin-top: 1px;">
              Annual private wealth reviews help align long-term tax and inheritance distributions.
            </span>
          </div>
        </div>
      `;
      
      let ctaHtml = `
        <button class="rebalance-execute-btn" onclick="alert('Advisory Call requested. Your private advisor will contact you within 24 hours.')" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; background: var(--purple-bright, #6B2D9B);">
          ✦ Schedule Advisor Call
        </button>
        <button class="rebalance-execute-btn" onclick="routeTo('/planning')" style="flex: 1; background: transparent; border-color: #6B2D9B; color: #6B2D9B; font-size: 0.8rem; padding: 8px 12px;">
          View Retirement Plan
        </button>
      `;

      return renderVisualReview({
        widgetId: "analyzer-widget-ms",
        title: "✦ Morgan Stanley Private Wealth Analysis",
        badge: "Private Wealth",
        badgeStyle: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
        netAssets: netAssets,
        dayChange: dayChange,
        dayChangeColor: "var(--positive)",
        healthScore: 80,
        scoreColor: "#10b981",
        scoreLabel: "Conservative Balanced",
        scoreDesc: "Assets are appropriately positioned for capital preservation and security.",
        equitiesPct: 80,
        cashPct: 20,
        equitiesVal: "$6,483.45",
        cashVal: "$1,620.86",
        holdingsHtml: holdingsHtml,
        sectorsHtml: sectorsHtml,
        alertsHtml: alertsHtml,
        ctaHtml: ctaHtml
      });
    }
    
    return `<div class="chat-rebalance-card">Error: Unrecognized account context "${accountId}".</div>`;
  }

  function executeYieldSweep(btn) {
    const statusContainer = document.getElementById('analyzer-checking-status');
    if (!statusContainer) return;
    
    btn.style.display = 'none';
    statusContainer.style.display = 'flex';
    
    setTimeout(() => {
      const sweepAmt = 4941.26;
      if (typeof mockData !== 'undefined' && Array.isArray(mockData.accounts)) {
        const checking = mockData.accounts.find(a => a.id === 'checking');
        if (checking) {
          checking.netValue = "$2,000.00";
          checking.available = "$2,000.00";
          checking.totalBalance = "$2,000.00";
        }
        
        // Add yield assets into checking or create a new row or just keep totals updated.
        // Let's also update the total asset figures if we want, but checking netValue change
        // is visible on next dashboard redraw. Let's make sure total assets are not reduced
        // since it is just swept within Morgan Stanley.
      }
      
      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        card.innerHTML = `
          <div class="rebalance-success-state">
            <div class="success-icon-wrapper" style="background: #ecfdf5; color: #059669; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 4;">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>Yield Sweep Activated</h3>
            <p class="success-desc">Transferred $4,941.26 from Checking into High-Yield Savings (compounding at 4.50% APY).</p>
            <div class="success-details">
              <div><strong>Reference ID:</strong> SWP-820941-APY</div>
              <div><strong>Status:</strong> Active & Compounding</div>
            </div>
          </div>
        `;
      }
      
      if (typeof render === 'function') {
        render();
      }
      
      if (typeof BrokerageData !== 'undefined' && typeof BrokerageData.logAgentActivity === 'function') {
        BrokerageData.logAgentActivity({
          agent: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          query: 'Yield sweep transaction of $4,941.26 from Checking (-8152) to High-Yield Cash Sweep.',
          status: 'success',
          latency: '0.8',
        });
      }
    }, 2000);
  }

  function executeConcentrationTrim(btn) {
    const statusContainer = document.getElementById('analyzer-main-status');
    if (!statusContainer) return;
    
    btn.style.display = 'none';
    statusContainer.style.display = 'flex';
    
    setTimeout(() => {
      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        card.innerHTML = `
          <div class="rebalance-success-state">
            <div class="success-icon-wrapper" style="background: #e0f2fe; color: #0284c7; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 4;">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>BAC Rebalance Staged</h3>
            <p class="success-desc">Sell 100 shares of BAC at market price (~$5,411) and buy 75 shares of BND. Staged in your review queue.</p>
            <div class="success-details">
              <div><strong>Reference ID:</strong> STG-094186-BAC</div>
              <div><strong>Status:</strong> Staged for Customer Review</div>
            </div>
          </div>
        `;
      }
      
      if (typeof BrokerageData !== 'undefined' && typeof BrokerageData.logAgentActivity === 'function') {
        BrokerageData.logAgentActivity({
          agent: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          query: 'Staged trim concentration order: Sell 100 shares BAC, buy 75 shares BND.',
          status: 'success',
          latency: '1.2',
        });
      }
    }, 2000);
  }

  function executeAutoInvest(btn) {
    const statusContainer = document.getElementById('analyzer-core-status');
    if (!statusContainer) return;
    
    btn.style.display = 'none';
    statusContainer.style.display = 'flex';
    
    setTimeout(() => {
      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        card.innerHTML = `
          <div class="rebalance-success-state">
            <div class="success-icon-wrapper" style="background: #ecfdf5; color: #059669; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 4;">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>Auto-Investing Enabled</h3>
            <p class="success-desc">Configured recurring monthly transfer of $250.00 from checking to your CORE Smart Beta Portfolio on the 1st of every month.</p>
            <div class="success-details">
              <div><strong>Reference ID:</strong> AUT-094186-DCA</div>
              <div><strong>Status:</strong> Active (First Transfer July 1st)</div>
            </div>
          </div>
        `;
      }
      
      if (typeof BrokerageData !== 'undefined' && typeof BrokerageData.logAgentActivity === 'function') {
        BrokerageData.logAgentActivity({
          agent: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          query: 'Configured monthly Auto-Investment plan ($250/mo) for CORE portfolio.',
          status: 'success',
          latency: '0.9',
         });
      }
    }, 2000);
  }

  function executeGlidePathTransition(btn) {
    const statusContainer = document.getElementById('analyzer-elcie-status');
    if (!statusContainer) return;
    
    btn.style.display = 'none';
    statusContainer.style.display = 'flex';
    
    setTimeout(() => {
      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        card.innerHTML = `
          <div class="rebalance-success-state">
            <div class="success-icon-wrapper" style="background: #e0f2fe; color: #0284c7; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 4;">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>Target Glide Path Activated</h3>
            <p class="success-desc">Staged a model allocation shift to Target-Date Custodial Glide Path (Gradual automated stock-to-bond reallocation).</p>
            <div class="success-details">
              <div><strong>Reference ID:</strong> GLD-094186-UTMA</div>
              <div><strong>Status:</strong> Staged for Custodial Approval</div>
            </div>
          </div>
        `;
      }
      
      if (typeof BrokerageData !== 'undefined' && typeof BrokerageData.logAgentActivity === 'function') {
        BrokerageData.logAgentActivity({
          agent: 'Portfolio Analyst',
          agentId: 'portfolio-analyst',
          query: 'Staged model transition to age-based Custodial Glide Path for UTMA/UGMA.',
          status: 'success',
          latency: '1.1',
        });
      }
    }, 2000);
  }

  function viewVestingSchedule(btn) {
    const statusContainer = document.getElementById('analyzer-stock-status');
    if (!statusContainer) return;
    
    btn.style.display = 'none';
    statusContainer.style.display = 'flex';
    
    setTimeout(() => {
      const card = btn.closest('.chat-rebalance-card');
      if (card) {
        card.innerHTML = `
          <div class="rebalance-success-state" style="text-align: left;">
            <h3 style="text-align: center; margin-bottom: 12px; margin-top: 0;">🗓️ Upcoming Vesting Calendar</h3>
            <div style="font-size: 11px; color: #475569; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span><strong>July 15, 2026</strong></span>
                <span>50 RSU shares Vesting</span>
                <span>Est. Value: $1,850</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                <span><strong>Oct 15, 2026</strong></span>
                <span>50 RSU shares Vesting</span>
                <span>Est. Value: $1,920</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                <span><strong>Jan 15, 2027</strong></span>
                <span>120 Option contracts Vest</span>
                <span>Est. Value: $3,100</span>
              </div>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 10px; text-align: center;">
              *RSUs are configured with "Sell-to-Cover" for tax withholding.
            </div>
          </div>
        `;
      }
      
      if (typeof BrokerageData !== 'undefined' && typeof BrokerageData.logAgentActivity === 'function') {
        BrokerageData.logAgentActivity({
          agent: 'Support Agent',
          agentId: 'customer-support',
          query: 'Queried upcoming Stock Plan vesting schedule details.',
          status: 'success',
          latency: '0.7',
        });
      }
    }, 1500);
  }

  function addMessageToUI(role, content, icon, provenanceOrRedacted) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const div = document.createElement('div');
    div.className = `chat-message ${role}`;

    let avatarContent;
    if (role === 'user') {
      avatarContent = 'You';
    } else if (icon && icon !== '✨' && icon !== '🤖' && (!AgentManager.getAllAgents || !AgentManager.getAllAgents().some(a => a.icon === icon))) {
      avatarContent = `<span style="font-size: 20px; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--geap-surface-secondary); border: 1px solid var(--geap-border);">${icon}</span>`;
    } else {
      avatarContent = renderAvatar(currentAgentId, 'idle');
    }

    const formattedContent = GeapApp.renderMarkdown(content);

    let html = formattedContent;
    if (content.includes('[[WIDGET:REBALANCE_FORM]]')) {
      const widgetHtml = getRebalanceFormHtml();
      html = html.replace('<p>[[WIDGET:REBALANCE_FORM]]</p>', widgetHtml)
                 .replace('[[WIDGET:REBALANCE_FORM]]', widgetHtml);
    }
    if (content.includes('[[WIDGET:RETIREMENT_CHARTS]]')) {
      const widgetHtml = getRetirementWidgetHtml();
      html = html.replace('<p>[[WIDGET:RETIREMENT_CHARTS]]</p>', widgetHtml)
                 .replace('[[WIDGET:RETIREMENT_CHARTS]]', widgetHtml);
    }
    if (content.includes('[[WIDGET:AI_PORTFOLIO_ANALYZER]]')) {
      const widgetHtml = getAiPortfolioAnalyzerWidgetHtml();
      html = html.replace('<p>[[WIDGET:AI_PORTFOLIO_ANALYZER]]</p>', widgetHtml)
                 .replace('[[WIDGET:AI_PORTFOLIO_ANALYZER]]', widgetHtml);
    }
    if (content.includes('[[WIDGET:ORCHESTRATION_GRAPH]]')) {
      const widgetHtml = getOrchestrationGraphHtml();
      html = html.replace('<p>[[WIDGET:ORCHESTRATION_GRAPH]]</p>', widgetHtml)
                 .replace('[[WIDGET:ORCHESTRATION_GRAPH]]', widgetHtml);
    }

    let piiAlertHtml = '';
    if (role === 'user' && Array.isArray(provenanceOrRedacted) && provenanceOrRedacted.length > 0) {
      piiAlertHtml = `
        <div class="chat-pii-alert" style="margin: 8px 0 0 0; padding: 8px 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 11px; color: #b45309; display: flex; align-items: center; gap: 8px; font-family: sans-serif; text-align: left; border-left: 4px solid #f59e0b; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
          <span style="font-size: 14px;">🛡️</span>
          <span><strong>GEAP Privacy Shield:</strong> Redacted sensitive ${provenanceOrRedacted.join(', ')} before transmitting to LLM.</span>
        </div>
      `;
    }

    let provenanceHtml = '';
    if (role === 'assistant' && provenanceOrRedacted && typeof provenanceOrRedacted === 'object' && !Array.isArray(provenanceOrRedacted)) {
      provenanceHtml = `
        <div class="message-provenance" style="margin-top: 12px; font-size: 11px; padding: 10px 14px; background: #fdfdfd; border: 1px solid #e9e9f2; border-radius: 10px; display: flex; flex-direction: column; gap: 5px; color: #475569; border-left: 4px solid #6b2d9b; font-family: sans-serif; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size: 9.5px; font-weight: 700; color: #6b2d9b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <span>✦</span> Why This Answer? (GEAP Provenance & Compliance)
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>🤖 <strong>Agent:</strong> ${provenanceOrRedacted.agentName}</span>
            <span>⏱️ <strong>Latency:</strong> ${provenanceOrRedacted.latency}s</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>🔍 <strong>Sources:</strong> ${provenanceOrRedacted.sources.join(', ')}</span>
            <span style="font-size: 10px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px; flex-shrink: 0;">● Compliance Checked</span>
          </div>
          ${provenanceOrRedacted.memoryRef ? `<div style="font-size: 10px; color: #8b5cf6; margin-top: 2px; border-top: 1px dashed #ede9f6; padding-top: 4px;">🧠 <strong>Memory Cross-Reference:</strong> ${provenanceOrRedacted.memoryRef}</div>` : ''}
        </div>
      `;
    }

    div.innerHTML = `
      <div class="message-avatar">${avatarContent}</div>
      <div class="message-content">
        ${html}
        ${piiAlertHtml}
        ${provenanceHtml}
      </div>
    `;

    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return null;

    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="message-avatar">${renderAvatar(currentAgentId, 'thinking')}</div>
      <div class="message-content">
        <div class="chat-typing">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (text) {
      input.value = '';
      autoResize(input);
      sendMessage(text);
    }
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function updateAgentSelector() {
    const el = document.getElementById('agent-selector');
    if (!el) return;
    el.innerHTML = `
      <button class="agent-chip ${currentAgentId === 'auto' ? 'active' : ''}" data-agent="auto" onclick="Chat.selectAgent('auto')">🤖 Auto</button>
      ${(AgentManager.getAllAgents ? AgentManager.getAllAgents() : []).map(a => `
        <button class="agent-chip ${a.id === currentAgentId ? 'active' : ''}" data-agent="${a.id}" onclick="Chat.selectAgent('${a.id}')">${a.icon} ${a.name.split(' ')[0]}</button>
      `).join('')}
    `;
  }

  return {
    init,
    sendMessage,
    selectAgent,
    handleKeyDown,
    handleSend,
    autoResize,
    updateAgentSelector,
    getCurrentAgentId() { return currentAgentId; },
    toggleVoiceInput,
    toggleVoiceOutput,
    updateRebalanceEstimates,
    executeRebalanceTrade,
    switchRetirementChartTab,
    executeYieldSweep,
    executeConcentrationTrim,
    executeAutoInvest,
    executeGlidePathTransition,
    viewVestingSchedule,
  };
})();

