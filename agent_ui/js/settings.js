/* ═══════════════════════════════════════════════════════════════
   GEAP — Customer AI Settings & Guardrails Page
   ═══════════════════════════════════════════════════════════════ */

function renderAISettings() {
  const settings = state.aiSettings;
  return `
    <section class="page-band">
      <div class="shell">
        <div class="page-title-row">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">AI Settings & Guardrails</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Manage security guardrails, trade permissions, and information access rights.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="settings-status-indicator" style="font-size: 12px; color: #64748b; font-weight: 500; opacity: 0; transition: opacity 0.3s;">✓ Guardrails auto-saved</span>
            <button class="text-button" type="button" data-refresh>Refresh <span>${mockData.user.refreshedAt}</span></button>
          </div>
        </div>
      </div>
    </section>

    <section class="shell" style="margin-top: 24px; margin-bottom: 40px;">
      <div class="settings-grid">
        
        <!-- Left Column: System Guardrails -->
        <div class="geap-card" style="padding: 24px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6B2D9B, #4F8EF7);"></div>
          
          <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 20px 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span>🔒</span> System Access & Guardrails
          </h2>

          <!-- 1. Access Mode -->
          <div class="settings-group">
            <h3 class="settings-group-title">
              <span>👤</span> System Access Level
            </h3>
            <div class="settings-options-list">
              <label class="radio-card ${settings.accessMode === 'read-only' ? 'active' : ''}">
                <input type="radio" name="accessMode" value="read-only" ${settings.accessMode === 'read-only' ? 'checked' : ''}>
                <div class="radio-card-content">
                  <span class="radio-card-title">Read-Only Access</span>
                  <span class="radio-card-desc">AI can only inspect your portfolio, balances, and account summaries. All UI page routing, rebalancing tools, and write parameters are fully blocked.</span>
                </div>
              </label>

              <label class="radio-card ${settings.accessMode === 'read-write' ? 'active' : ''}">
                <input type="radio" name="accessMode" value="read-write" ${settings.accessMode === 'read-write' ? 'checked' : ''}>
                <div class="radio-card-content">
                  <span class="radio-card-title">Read-Write Access (Recommended)</span>
                  <span class="radio-card-desc">AI can navigate the platform UI, select account views, switch charts, and stage rebalance tickets on your behalf.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 2. Trade Execution Guardrails -->
          <div class="settings-group">
            <h3 class="settings-group-title">
              <span>⚡</span> Trade Execution Guardrails
            </h3>
            <div class="settings-options-list">
              <label class="radio-card ${settings.tradeExecutionMode === 'execute' ? 'active' : ''}">
                <input type="radio" name="tradeExecutionMode" value="execute" ${settings.tradeExecutionMode === 'execute' ? 'checked' : ''}>
                <div class="radio-card-content">
                  <span class="radio-card-title">Execute Trades Directly</span>
                  <span class="radio-card-desc">AI can execute rebalance trades directly after your confirmation click in the interactive chat ticket. Holdings and cash are modified instantly.</span>
                </div>
              </label>

              <label class="radio-card ${settings.tradeExecutionMode === 'draft' ? 'active' : ''}">
                <input type="radio" name="tradeExecutionMode" value="draft" ${settings.tradeExecutionMode === 'draft' ? 'checked' : ''}>
                <div class="radio-card-content">
                  <span class="radio-card-title">Draft / Stage Trades Only</span>
                  <span class="radio-card-desc">AI can only prepare trade tickets/widgets. Clicking execution stages the order in your manual review queue; no holdings are updated directly.</span>
                </div>
              </label>

              <label class="radio-card ${settings.tradeExecutionMode === 'never' ? 'active' : ''}">
                <input type="radio" name="tradeExecutionMode" value="never" ${settings.tradeExecutionMode === 'never' ? 'checked' : ''}>
                <div class="radio-card-content">
                  <span class="radio-card-title">Never Execute Trades</span>
                  <span class="radio-card-desc">Blocks all trade actions, rebalancing, and buying/selling commands. The AI cannot stage or execute any trading operations.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 3. Security Settings -->
          <div class="settings-group">
            <h3 class="settings-group-title">
              <span>🛡️</span> Privacy & Security
            </h3>
            <div class="switch-row">
              <div class="switch-row-info">
                <span class="switch-row-title">Active PII Scrubbing</span>
                <span class="switch-row-desc">Automatically redact personally identifiable data (SSNs, accounts, emails, and phone numbers) before sending chat query payloads.</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="settings-pii-scrub" ${settings.piiScrubbingEnabled ? 'checked' : ''}>
                <span aria-hidden="true"></span>
              </label>
            </div>
          </div>

        </div>

        <!-- Right Column: Information Sources Whitelist/Blacklist -->
        <div class="geap-card" style="padding: 24px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 20px;">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 6px 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span>🌐</span> Info Source Management
            </h2>
            <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">Whitelist or blacklist specific public research libraries and private account documents accessible by the AI.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Public Sources (Market Research)</span>
            
            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">📰</span>
                <span>Yahoo Finance</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge public">Public</span>
                <label class="switch">
                  <input type="checkbox" data-source="yahoo" ${settings.allowedSources.yahoo ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">🏛️</span>
                <span>SEC Edgar</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge public">Public</span>
                <label class="switch">
                  <input type="checkbox" data-source="sec" ${settings.allowedSources.sec ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">💼</span>
                <span>Bloomberg</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge public">Public</span>
                <label class="switch">
                  <input type="checkbox" data-source="bloomberg" ${settings.allowedSources.bloomberg ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">🌐</span>
                <span>Reuters</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge public">Public</span>
                <label class="switch">
                  <input type="checkbox" data-source="reuters" ${settings.allowedSources.reuters ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">⭐</span>
                <span>Morningstar</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge public">Public</span>
                <label class="switch">
                  <input type="checkbox" data-source="morningstar" ${settings.allowedSources.morningstar ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Private Sources (Account Access)</span>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">📊</span>
                <span>Portfolio Holdings</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge private">Private</span>
                <label class="switch">
                  <input type="checkbox" data-source="private_holdings" ${settings.allowedSources.private_holdings ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">📜</span>
                <span>Transaction History</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge private">Private</span>
                <label class="switch">
                  <input type="checkbox" data-source="private_transactions" ${settings.allowedSources.private_transactions ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div class="source-checkbox-item">
              <label class="source-checkbox-label">
                <span class="source-checkbox-logo-icon">📝</span>
                <span>Tax Records & Statements</span>
              </label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="source-checkbox-badge private">Private</span>
                <label class="switch">
                  <input type="checkbox" data-source="private_tax" ${settings.allowedSources.private_tax ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- Save Toast Notification -->
    <div id="settings-save-toast" class="settings-save-toast">
      <span class="toast-checkmark">✓</span>
      <span>AI settings auto-saved successfully</span>
    </div>
  `;
}

function bindAISettingsEvents() {
  const container = document.querySelector("#app");
  if (!container) return;

  // Add click handlers for radio cards
  container.querySelectorAll(".radio-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // If we clicked directly on the input, let it proceed
      if (e.target.tagName === 'INPUT') return;

      const input = card.querySelector('input[type="radio"]');
      if (input) {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  // Handle value changes
  container.addEventListener("change", (e) => {
    const target = e.target;
    if (!target) return;

    let changed = false;

    // 1. Access Mode Radios
    if (target.name === "accessMode") {
      state.aiSettings.accessMode = target.value;
      changed = true;
      
      // Update visual active classes
      container.querySelectorAll('input[name="accessMode"]').forEach(radio => {
        const card = radio.closest('.radio-card');
        if (card) {
          if (radio.checked) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    }

    // 2. Trade Execution Radios
    if (target.name === "tradeExecutionMode") {
      state.aiSettings.tradeExecutionMode = target.value;
      changed = true;

      // Update visual active classes
      container.querySelectorAll('input[name="tradeExecutionMode"]').forEach(radio => {
        const card = radio.closest('.radio-card');
        if (card) {
          if (radio.checked) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    }

    // 3. PII Scrubbing checkbox
    if (target.id === "settings-pii-scrub") {
      state.aiSettings.piiScrubbingEnabled = target.checked;
      changed = true;
    }

    // 4. Sources checkboxes
    if (target.dataset && target.dataset.source) {
      const sourceId = target.dataset.source;
      state.aiSettings.allowedSources[sourceId] = target.checked;
      changed = true;
    }

    if (changed) {
      // Save to localStorage
      try {
        localStorage.setItem("geap_ai_settings", JSON.stringify(state.aiSettings));
      } catch (err) {
        console.error("Failed to save settings to localStorage:", err);
      }

      // Show auto-save indicators
      const indicator = document.getElementById("settings-status-indicator");
      if (indicator) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        indicator.textContent = `✓ Guardrails auto-saved at ${timeStr}`;
        indicator.style.opacity = "1";
      }

      const toast = document.getElementById("settings-save-toast");
      if (toast) {
        toast.classList.add("show");
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
          toast.classList.remove("show");
        }, 2500);
      }
    }
  });
}
