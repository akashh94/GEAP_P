/* ═══════════════════════════════════════════════════════════════
   Apex Brokerage — Portfolios View Module
   Renders portfolio allocations, holdings, and compliance checks.
   ═══════════════════════════════════════════════════════════════ */

function getSelectedAccountHoldings(account) {
  if (account && account.id && account.id.startsWith("etrade_")) {
    return account.holdings || [];
  }
  return (typeof BrokerageData !== "undefined" ? BrokerageData.holdings : []) || [];
}

function isShowDataEnabledLocal() {
  if (typeof window !== 'undefined' && window.isShowDataEnabled) {
    return window.isShowDataEnabled();
  }
  const isLive = typeof BrokerageData !== 'undefined' && BrokerageData.getLiveMode && BrokerageData.getLiveMode();
  const isTest = (typeof window !== "undefined" && window.__e2e_test_active__) || 
                 (typeof process !== "undefined" && process.env && (process.env.NODE_ENV === "test" || process.env.PORT === "3099")) ||
                 (typeof global !== "undefined" && (typeof global.it === "function" || typeof global.test === "function"));
  const isDemo = typeof window !== "undefined" && window.location && typeof window.location.search === "string" && window.location.search.includes("demo=true");
  return isLive || isTest || isDemo;
}

function renderPortfolios() {
  const showData = isShowDataEnabledLocal();
  if (!showData) {
    return `
      <section class="portfolio-header">
        <div class="shell">
          <div class="page-title-row">
            <h1>Portfolios</h1>
            <div class="toolbar">
              <span class="geap-skeleton-text" style="width: 150px; height: 32px; border-radius: 4px;"></span>
            </div>
          </div>
          <nav class="portfolio-tabs" aria-label="Portfolio tabs">
            <a href="#" class="active"><span class="geap-skeleton-text" style="width: 80px;"></span></a>
            <a href="#"><span class="geap-skeleton-text" style="width: 90px;"></span></a>
            <a href="#"><span class="geap-skeleton-text" style="width: 100px;"></span></a>
          </nav>
        </div>
      </section>

      <section class="portfolio-summary">
        <div class="shell portfolio-summary__grid">
          <div class="field">
            <label><span class="geap-skeleton-text" style="width: 60px; margin-bottom: 4px; display: block;"></span></label>
            <div class="geap-skeleton-text" style="height: 44px; border-radius: 4px; width: 100%;"></div>
          </div>
          <div class="summary-metric">
            <span><span class="geap-skeleton-text" style="width: 110px;"></span></span>
            <strong><span class="geap-skeleton-text" style="width: 120px; height: 18px; margin-top: 4px;"></span></strong>
            <span><span class="geap-skeleton-text" style="width: 130px;"></span></span>
            <strong><span class="geap-skeleton-text" style="width: 90px; height: 18px; margin-top: 4px;"></span></strong>
          </div>
          <div class="summary-metric">
            <span><span class="geap-skeleton-text" style="width: 140px;"></span></span>
            <strong><span class="geap-skeleton-text" style="width: 130px; height: 18px; margin-top: 4px;"></span></strong>
            <span><span class="geap-skeleton-text" style="width: 90px;"></span></span>
            <strong><span class="geap-skeleton-text" style="width: 150px; height: 18px; margin-top: 4px;"></span></strong>
          </div>
          <div class="summary-metric">
            <span><span class="geap-skeleton-text" style="width: 150px;"></span></span>
            <strong><span class="geap-skeleton-text" style="width: 120px; height: 18px; margin-top: 4px;"></span></strong>
          </div>
          <div class="summary-action">
            <span class="geap-skeleton-text" style="width: 120px; height: 34px; border-radius: 4px;"></span>
          </div>
        </div>
      </section>

      <section class="shell" style="margin-top: 24px;">
        <div class="geap-skeleton-card" style="height: 300px; display: flex; flex-direction: column; gap: 12px; align-items: stretch;">
          <span class="geap-skeleton-text" style="width: 150px; height: 24px; margin-bottom: 12px;"></span>
          <span class="geap-skeleton-line" style="width: 100%;"></span>
          <span class="geap-skeleton-line" style="width: 95%;"></span>
          <span class="geap-skeleton-line" style="width: 90%;"></span>
          <span class="geap-skeleton-line" style="width: 80%;"></span>
        </div>
      </section>
      ${renderDisclosures()}
    `;
  }

  const account = selectedAccount();
  if (!account) {
    return `
      <section class="portfolio-header">
        <div class="shell">
          <div class="page-title-row">
            <h1>Portfolios</h1>
          </div>
        </div>
      </section>
      <section class="portfolio-summary" style="background: var(--band); padding: 3rem 0;">
        <div class="shell" style="display: flex; justify-content: center;">
          <div class="empty-state-card" style="background: var(--panel); border: 1px solid var(--line); padding: 3rem 2rem; border-radius: 12px; text-align: center; max-width: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; box-shadow: 0 2px 12px rgba(0,0,0,0.02); width: 100%;">
            <div style="font-size: 3rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));">🔌</div>
            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--purple-bright);">E*TRADE Connection Required</h3>
            <p style="color: var(--muted); margin: 0; max-width: 420px; font-size: 0.9rem; line-height: 1.6;">
              Your portfolio holdings, allocations, and historical values are offline. Connect your E*TRADE account to view your portfolio data.
            </p>
            <button class="button etrade-connect-prompt-btn" type="button" style="margin-top: 0.5rem; border-radius: 6px; padding: 10px 24px; font-size: 0.85rem; font-weight: 700; border: none; box-shadow: 0 4px 12px rgba(109,40,217,0.25);">🔌 Connect E*TRADE Account</button>
          </div>
        </div>
      </section>
    `;
  }
  const holdings = getSelectedAccountHoldings(account);
  const totalEquitiesVal = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const cashVal = (account && account.id && account.id.startsWith("etrade_")) 
    ? account.cashBalance 
    : (typeof BrokerageData !== "undefined" ? BrokerageData.account.cashBalance : 0);
  const totalVal = totalEquitiesVal + cashVal;

  const equitiesPct = totalVal > 0 ? ((totalEquitiesVal / totalVal) * 100).toFixed(1) + '%' : '0.0%';
  const cashPct = totalVal > 0 ? ((cashVal / totalVal) * 100).toFixed(1) + '%' : '0.0%';

  const allocation = account.allocation || {
    taxLoss: "$0.00",
    portfolioName: "Standard Portfolio",
    rows: []
  };

  let activeTabContent = '';
  if (state.portfolioTab === "risk") {
    activeTabContent = renderRiskAssessment(account, holdings);
  } else if (state.portfolioTab === "positions") {
    activeTabContent = renderPositionsTab(holdings, totalEquitiesVal);
  } else if (state.portfolioTab === "gains") {
    activeTabContent = renderGainsTab(holdings);
  } else if (state.portfolioTab === "historical") {
    activeTabContent = renderHistoricalTab();
  } else {
    activeTabContent = `
      <section class="allocation-card">
        <h2>Allocation</h2>
        <div class="mini-tabs" role="tablist" aria-label="Allocation mode">
          <button type="button" data-allocation-mode="asset" aria-selected="${state.allocationMode === "asset"}">Asset class</button>
          <button type="button" data-allocation-mode="sector" aria-selected="${state.allocationMode === "sector"}">Sector</button>
        </div>
        ${state.allocationMode === "sector" ? renderSectorAllocation(allocation) : renderAssetAllocation(totalEquitiesVal, cashVal, totalVal, equitiesPct, cashPct)}
      </section>

      <section class="holdings-sections">
        ${renderHoldingSection("Equities", "Total equities", "100.0%", equitiesPct, typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(totalEquitiesVal) : "$" + totalEquitiesVal.toFixed(2))}
        ${renderHoldingSection("Cash", "Total cash", "0.0%", cashPct, typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(cashVal) : "$" + cashVal.toFixed(2))}
      </section>
    `;
  }

  return `
    <section class="portfolio-header">
      <div class="shell">
        <div class="page-title-row">
          <h1>Portfolios</h1>
          <div class="toolbar">
            <button class="text-button" type="button" data-refresh>Refresh <span>${mockData.user.refreshedAt}</span></button>
            <a href="/support" data-route>Help</a>
            <button class="icon-button" type="button" aria-label="Print">P</button>
            <button class="icon-button" type="button" aria-label="Download">D</button>
          </div>
        </div>
        <nav class="portfolio-tabs" aria-label="Portfolio tabs">
          <a href="#" onclick="state.portfolioTab = 'positions'; render(); return false;" ${state.portfolioTab === 'positions' ? 'aria-current="page"' : ''}>Positions</a>
          <a href="#" onclick="state.portfolioTab = 'allocation'; render(); return false;" ${(state.portfolioTab === 'allocation' || !state.portfolioTab) ? 'aria-current="page"' : ''}>Allocation</a>
          <a href="#" onclick="state.portfolioTab = 'performance'; render(); return false;" ${state.portfolioTab === 'performance' ? 'aria-current="page"' : ''}>Performance</a>
          <a href="#" onclick="state.portfolioTab = 'historical'; render(); return false;" ${state.portfolioTab === 'historical' ? 'aria-current="page"' : ''}>Historical Value</a>
          <a href="#" onclick="state.portfolioTab = 'gains'; render(); return false;" ${state.portfolioTab === 'gains' ? 'aria-current="page"' : ''}>Gains &amp; Losses</a>
          <a href="#" onclick="state.portfolioTab = 'risk'; render(); return false;" ${state.portfolioTab === 'risk' ? 'aria-current="page"' : ''}>Risk Assessment</a>
          <a href="#" onclick="state.portfolioTab = 'income'; render(); return false;" ${state.portfolioTab === 'income' ? 'aria-current="page"' : ''}>Estimated Income</a>
        </nav>
      </div>
    </section>

    <section class="portfolio-summary">
      <div class="shell portfolio-summary__grid">
        <div class="field">
          <label for="account-select">Account</label>
          <select id="account-select">
            ${mockData.accounts
              .filter((item) => !item.bank)
              .map((item) => `<option value="${item.id}" ${item.id === account.id ? "selected" : ""}>${item.label} ${item.masked}</option>`)
              .join("")}
          </select>
          <p>${account.subtitle || account.type}</p>
        </div>
        <div class="summary-metric">
          <span>Net Account Value</span>
          <strong class="positive">${account.netValue}</strong>
          <span>Tax Loss Harvesting</span>
          <strong>${allocation.taxLoss}</strong>
          <a href="/accounts/portfolios" data-route>Unenroll</a>
        </div>
        <div class="summary-metric">
          <span>Total Unrealized Gain</span>
          <strong class="positive">${allocation.unrealizedGain || "$0.00"}</strong>
          <span>My Portfolio</span>
          <strong>${allocation.portfolioName}</strong>
          <a href="/accounts/documents" data-route>Investment Proposal</a>
        </div>
        <div class="summary-metric">
          <span>Day's Gain Unrealized</span>
          <strong class="${moneyToneClass(account.dayGainTone)}">${account.dayGain || "$0.00"}</strong>
        </div>
        <div class="summary-action">
          <button class="outline-button" type="button">Move Money</button>
        </div>
      </div>
    </section>

    ${state.portfolioTab === "risk" ? "" : `
    <section class="shell">
      <div class="notice">
        <span class="notice__icon">i</span>
        <div><strong>Register now:</strong> "Core Portfolios Quarterly Commentary featuring Morgan Stanley's Global Investment Office" webinar.<br>Join this webinar live or on demand to hear quarterly market commentary.</div>
      </div>
    </section>
    `}

    ${activeTabContent}
    ${renderDisclosures()}
  `;
}

function renderRiskAssessment(account, holdings = []) {
  // Card 1: Single-Stock Exposure
  let maxWeightVal = 0;
  let maxSymbol = 'None';
  const totalEquitiesVal = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  if (totalEquitiesVal > 0) {
    const maxHolding = holdings.reduce((max, h) => h.marketValue > max.marketValue ? h : max, holdings[0]);
    maxWeightVal = (maxHolding.marketValue / totalEquitiesVal) * 100;
    maxSymbol = maxHolding.symbol;
  }
  
  let concentrationBadgeText = "Low Risk";
  let concentrationBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
  let concentrationText = "No active equity holdings to analyze.";
  if (totalEquitiesVal > 0) {
    if (maxWeightVal > 15.0) {
      concentrationBadgeText = "High Risk";
      concentrationBadgeStyle = "background: #fef2f2; color: #ef4444; border: 1px solid #fecaca;";
      concentrationText = `${maxSymbol} position exceeds 15% single-holding limit.`;
    } else if (maxWeightVal > 10.0) {
      concentrationBadgeText = "Elevated";
      concentrationBadgeStyle = "background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;";
      concentrationText = `${maxSymbol} position is elevated but within limit.`;
    } else {
      concentrationBadgeText = "Low Risk";
      concentrationBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
      concentrationText = `${maxSymbol} position is within the 15% single-holding limit.`;
    }
  }

  // Card 2: Portfolio Beta
  const sectorBetas = {
    'Technology':      1.35,
    'Consumer Disc.':  1.2,
    'Financials':      1.1,
    'ETF - Broad':     1.0,
    'ETF - Tech':      1.35,
    'ETF - Bonds':     0.15,
    'ETF - Commodity': 0.2,
    'Healthcare':      0.7,
    'Other':           1.0
  };
  const cashVal = (account && account.id && account.id.startsWith("etrade_")) 
    ? account.cashBalance 
    : (typeof BrokerageData !== "undefined" ? BrokerageData.account.cashBalance : 0);
  const totalVal = totalEquitiesVal + cashVal;

  let weightedBetaSum = 0;
  holdings.forEach(h => {
    const b = sectorBetas[h.sector] || 1.0;
    weightedBetaSum += (h.marketValue / totalVal) * b;
  });
  const portfolioBeta = totalVal > 0 ? +weightedBetaSum.toFixed(2) : 0;

  let betaBadgeText = "Moderate";
  let betaBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
  let betaText = "Aligned with broad market volatility.";
  if (totalVal > 0) {
    if (portfolioBeta > 1.25) {
      betaBadgeText = "Elevated";
      betaBadgeStyle = "background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;";
      betaText = "Highly reactive to market volatility.";
    } else if (portfolioBeta < 0.50) {
      betaBadgeText = "Low Volatility";
      betaBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
      betaText = "Conservative posture with lower volatility.";
    } else {
      betaBadgeText = "Moderate";
      betaBadgeStyle = "background: #eef7fc; color: #4F8EF7; border: 1px solid #bce0fd;";
      betaText = "Aligned with broad market volatility.";
    }
  } else {
    betaBadgeText = "Low Risk";
    betaBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
    betaText = "No portfolio assets to calculate volatility.";
  }

  // Card 3: Sector Exposure
  const sectorAlloc = {};
  holdings.forEach(h => {
    sectorAlloc[h.sector] = (sectorAlloc[h.sector] || 0) + h.marketValue;
  });
  if (cashVal > 0) {
    sectorAlloc['Cash'] = (sectorAlloc['Cash'] || 0) + cashVal;
  }

  let maxSectorName = 'None';
  let maxSectorPct = 0;
  if (totalVal > 0) {
    const maxSector = Object.entries(sectorAlloc).reduce((max, s) => s[1] > max[1] ? s : max, [null, 0]);
    maxSectorName = maxSector[0];
    maxSectorPct = (maxSector[1] / totalVal) * 100;
  }

  let sectorBadgeText = "Low Risk";
  let sectorBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
  let sectorText = "No active sector exposure to analyze.";
  if (totalVal > 0) {
    if (maxSectorPct > 30.0) {
      sectorBadgeText = "High Risk";
      sectorBadgeStyle = "background: #fef2f2; color: #ef4444; border: 1px solid #fecaca;";
      sectorText = `${maxSectorName} sector concentration exceeds benchmark.`;
    } else if (maxSectorPct > 20.0) {
      sectorBadgeText = "Elevated";
      sectorBadgeStyle = "background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;";
      sectorText = `${maxSectorName} sector exposure is elevated but balanced.`;
    } else {
      sectorBadgeText = "Low Risk";
      sectorBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
      sectorText = `${maxSectorName} sector exposure is within balanced limits.`;
    }
  }

  // Card 4: Estate Planning
  const hasBeneficiary = account && (account.beneficiary === true || (account.label && (account.label.includes("UTMA") || account.label.includes("UGMA") || account.label.includes("Custodial") || account.label.includes("Trust") || account.label.includes("IRA"))));
  let estateBadgeText = "Incomplete";
  let estateBadgeStyle = "background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;";
  let estateValueText = "None";
  let estateText = "Missing beneficiary designation for this account.";
  if (hasBeneficiary) {
    estateBadgeText = "Complete";
    estateBadgeStyle = "background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;";
    estateValueText = "Designated";
    estateText = "Beneficiary designation active for this account.";
  }

  return `
    <section class="shell" style="margin-top: 24px;">
      <div class="content-grid" style="padding-top: 0; padding-bottom: 0;">
        
        <!-- Left Column: Risk Cards & Diagnostics -->
        <div>
          <!-- Diagnostics Hero Card -->
          <div class="geap-card" style="margin-bottom: 24px; padding: 24px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6B2D9B, #4F8EF7);"></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #1e293b;">✦ AI Portfolio Risk Diagnostic</h2>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">GEAP Real-Time Asset Analysis</p>
              </div>
              <span class="geap-badge" style="background: #eef7fc; color: #4F8EF7; border: 1px solid #bce0fd; font-size: 11px; padding: 2px 8px; border-radius: 9999px;">Active Monitoring</span>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #334155; margin-bottom: 20px;">
              The Google Enterprise Agent Platform monitors your active account portfolio against standard regulatory and custom firm compliance policies. Our diagnostics have detected sector concentration and single-stock exposure thresholds that may exceed standard risk parameters.
            </p>
            <button class="outline-button" onclick="if (typeof triggerChatQuery !== 'undefined') { triggerChatQuery('Run a comprehensive risk analysis on my portfolios and active account holdings.'); } return false;" 
                    style="background: #6B2D9B; color: #fff; border-color: #6B2D9B; display: flex; align-items: center; gap: 6px;">
              <span>✦ Run Active Risk Analysis</span>
            </button>
          </div>
 
          <!-- Risk Factor Grid -->
          <div class="risk-factor-grid">
            <!-- Card 1: Concentration -->
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Single-Stock Exposure</span>
                <span class="geap-badge" style="${concentrationBadgeStyle} font-size: 11px; padding: 1px 6px; border-radius: 4px;">${concentrationBadgeText}</span>
              </div>
              <strong style="font-size: 24px; font-weight: 700; color: #1e293b;">${maxWeightVal.toFixed(1)}%</strong>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">${concentrationText}</div>
            </div>
 
            <!-- Card 2: Volatility -->
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Portfolio Beta</span>
                <span class="geap-badge" style="${betaBadgeStyle} font-size: 11px; padding: 1px 6px; border-radius: 4px;">${betaBadgeText}</span>
              </div>
              <strong style="font-size: 24px; font-weight: 700; color: #1e293b;">${portfolioBeta.toFixed(2)}</strong>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">${betaText}</div>
            </div>
 
            <!-- Card 3: Sector Concentration -->
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Sector Exposure</span>
                <span class="geap-badge" style="${sectorBadgeStyle} font-size: 11px; padding: 1px 6px; border-radius: 4px;">${sectorBadgeText}</span>
              </div>
              <strong style="font-size: 24px; font-weight: 700; color: #1e293b;">${maxSectorPct.toFixed(1)}%</strong>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">${sectorText}</div>
            </div>
 
            <!-- Card 4: Estate Protection -->
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Estate Planning</span>
                <span class="geap-badge" style="${estateBadgeStyle} font-size: 11px; padding: 1px 6px; border-radius: 4px;">${estateBadgeText}</span>
              </div>
              <strong style="font-size: 24px; font-weight: 700; color: #1e293b;">${estateValueText}</strong>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">${estateText}</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Compliance Policies -->
        <div>
          <div class="geap-card" style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; height: 100%;">
            <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Active AI Safeguards</h3>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Safety Filter</span>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">PII Redaction</span>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Financial Disclaimers</span>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Audit Compliance Logging</span>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Human Escalation Router</span>
                <span style="font-size: 11px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 4px;">● Ready</span>
              </div>
            </div>
            
            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.4;">
              All advisor interactions are audited and logged for compliance monitoring. Visit the <a href="/agent-fabric" data-route style="color: #6B2D9B; font-weight: 600; text-decoration: underline;">Agent Fabric</a> to inspect active routing histories.
            </div>
          </div>
        </div>

      </div>
    </section>
  `;
}

function renderAssetAllocation(totalEquitiesVal, cashVal, totalVal, equitiesPct, cashPct) {
  const eqPctNum = totalVal > 0 ? (totalEquitiesVal / totalVal) * 100 : 98.1;
  const gradientStr = `conic-gradient(#6B2D9B 0% ${eqPctNum}%, #22c55e ${eqPctNum}% 100%)`;

  return `
    <div class="allocation-body">
      <div class="donut" style="background: ${gradientStr};" aria-label="Asset allocation chart">
        <div class="donut__label">
          <strong>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(totalVal) : "$" + totalVal.toFixed(2)}</strong>
          <span>Market value</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset class</th>
              <th>Portfolio %</th>
              <th>Market value $</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total market value</strong></td>
              <td><strong>100.0%</strong></td>
              <td><strong>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(totalVal) : "$" + totalVal.toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td>Equities</td>
              <td>${equitiesPct}</td>
              <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(totalEquitiesVal) : "$" + totalEquitiesVal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Cash</td>
              <td>${cashPct}</td>
              <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(cashVal) : "$" + cashVal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSectorAllocation(allocation) {
  const rows = allocation.rows || [];
  let cum = 0;
  const colors = ['#6B2D9B', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  const gradientParts = rows.map((row, i) => {
    const pct = parseFloat(row.pct) || 0;
    const start = cum;
    cum += pct;
    return `${colors[i % colors.length]} ${start}% ${cum}%`;
  });
  const gradientStr = gradientParts.length > 0 ? `conic-gradient(${gradientParts.join(', ')})` : 'conic-gradient(#1177aa 0 100%)';

  return `
    <div class="allocation-body">
      <div class="donut" style="background: ${gradientStr};" aria-label="Sector allocation chart">
        <div class="donut__label">
          <strong>${allocation.totalMarketValue}</strong>
          <span>Market value</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Portfolio %</th>
              <th>Market value $</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Total market value</strong></td><td><strong>100.0%</strong></td><td><strong>${allocation.totalMarketValue}</strong></td></tr>
            ${rows.map((row) => `<tr><td>${row.label}</td><td>${row.pct}</td><td>${row.value}</td></tr>`).join("")}
            ${rows.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: var(--muted); padding: 12px;">No sector breakdown available.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPositionsTab(holdings, totalMarketValue) {
  return `
    <section class="positions-card" style="margin-top: 24px; background: var(--panel); padding: 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 20px;">Positions (${holdings.length})</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Price $</th>
              <th>Avg Cost $</th>
              <th>Portfolio %</th>
              <th>Day's Gain $</th>
              <th>Market Value $</th>
            </tr>
          </thead>
          <tbody>
            ${holdings.map(h => {
              const weight = totalMarketValue > 0 ? ((h.marketValue / totalMarketValue) * 100).toFixed(2) + '%' : '0.00%';
              const dayChangeClass = h.dayChange >= 0 ? 'positive' : 'negative';
              const dayChangeText = typeof BrokerageData !== "undefined"
                ? BrokerageData.formatChange(h.dayChangeTotal) + ' (' + BrokerageData.formatPercent(h.dayChangePct) + ')'
                : h.dayChangeTotal.toFixed(2);
              return `
                <tr>
                  <td><a href="/trading" data-route><strong>${h.symbol}</strong></a></td>
                  <td>${h.name}</td>
                  <td>${h.shares}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.currentPrice) : "$" + h.currentPrice.toFixed(2)}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.avgCost) : "$" + h.avgCost.toFixed(2)}</td>
                  <td>${weight}</td>
                  <td class="${dayChangeClass}">${dayChangeText}</td>
                  <td><strong>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.marketValue) : "$" + h.marketValue.toFixed(2)}</strong></td>
                </tr>
              `;
            }).join('')}
            ${holdings.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">No positions found in this portfolio.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGainsTab(holdings) {
  return `
    <section class="positions-card" style="margin-top: 24px; background: var(--panel); padding: 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 20px;">Gains &amp; Losses</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Avg Cost $</th>
              <th>Price $</th>
              <th>Total Cost $</th>
              <th>Current Value $</th>
              <th>Total Gain $</th>
            </tr>
          </thead>
          <tbody>
            ${holdings.map(h => {
              const gainClass = h.totalReturn >= 0 ? 'positive' : 'negative';
              const gainText = typeof BrokerageData !== "undefined"
                ? BrokerageData.formatChange(h.totalReturn) + ' (' + BrokerageData.formatPercent(h.totalReturnPct) + ')'
                : h.totalReturn.toFixed(2);
              return `
                <tr>
                  <td><a href="/trading" data-route><strong>${h.symbol}</strong></a></td>
                  <td>${h.name}</td>
                  <td>${h.shares}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.avgCost) : "$" + h.avgCost.toFixed(2)}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.currentPrice) : "$" + h.currentPrice.toFixed(2)}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.costBasis) : "$" + h.costBasis.toFixed(2)}</td>
                  <td>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(h.marketValue) : "$" + h.marketValue.toFixed(2)}</td>
                  <td class="${gainClass}">${gainText}</td>
                </tr>
              `;
            }).join('')}
            ${holdings.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">No holdings found.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderHistoricalTab() {
  const history = (typeof BrokerageData !== "undefined" ? BrokerageData.performanceHistory : []) || [];
  return `
    <section class="positions-card" style="margin-top: 24px; background: var(--panel); padding: 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 20px;">Historical Performance</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account Value</th>
            </tr>
          </thead>
          <tbody>
            ${history.slice().reverse().slice(0, 15).map(pt => `
              <tr>
                <td>${pt.date}</td>
                <td><strong>${typeof BrokerageData !== "undefined" ? BrokerageData.formatCurrency(pt.value) : "$" + pt.value.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
            ${history.length === 0 ? `<tr><td style="text-align: center; color: var(--muted); padding: 24px;">No history available.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderHoldingSection(title, totalLabel, target, portfolio, marketValue) {
  return `
    <section class="holding-section">
      <h3>${title}</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Symbol</th>
              <th>Qty</th>
              <th>Price $</th>
              <th>Target %</th>
              <th>Portfolio %</th>
              <th>Market value $</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/accounts/portfolios" data-route>&gt; ${totalLabel}</a></td>
              <td></td>
              <td></td>
              <td></td>
              <td><strong>${target}</strong></td>
              <td><strong>${portfolio}</strong></td>
              <td><strong>${marketValue}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}
