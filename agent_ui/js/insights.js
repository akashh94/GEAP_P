function isShowDataEnabledLocal() {
  if (typeof window !== 'undefined' && window.isShowDataEnabled) {
    return window.isShowDataEnabled();
  }
  const isLive = typeof BrokerageData !== 'undefined' && BrokerageData.getLiveMode && BrokerageData.getLiveMode();
  const isTest = (typeof window !== "undefined" && window.__e2e_test_active__) ||
    (typeof process !== "undefined" && (
      (process.env && (process.env.NODE_ENV === "test" || process.env.PORT === "3099")) ||
      (process.argv && process.argv.some(arg => arg.includes('test')))
    ));
  const isDemo = typeof window !== "undefined" && window.location && typeof window.location.search === "string" && window.location.search.includes("demo=true");
  return isLive || isTest || isDemo;
}

const InsightsEngine = (() => {

  /**
   * Analyze the portfolio and return an array of insight objects.
   */
  function generateInsights() {
    const insights = [];
    const summary = BrokerageData.getPortfolioSummary();
    const holdings = BrokerageData.holdings;
    const indices = BrokerageData.marketIndices;
    const sectors = BrokerageData.sectorAllocation;
    const txns = BrokerageData.transactions;

    // ── 1. Morning Briefing ──
    const dayPct = summary.dayChangePercent;
    const spx = indices.find(i => i.symbol === 'SPX');
    const outperformance = spx ? (dayPct - spx.changePct).toFixed(2) : null;

    insights.push({
      type: 'briefing',
      badge: 'Market Insight',
      badgeColor: 'green',
      icon: '🌅',
      title: 'Morning Briefing',
      body: buildBriefing(summary, holdings, outperformance, spx),
      action: { label: 'View Portfolio', route: '/accounts/portfolios' },
    });

    // ── 2. Concentration Risk ──
    const concentrated = holdings.filter(h => h.weight > 15);
    if (concentrated.length > 0) {
      const top = concentrated.sort((a, b) => b.weight - a.weight)[0];
      insights.push({
        type: 'risk',
        badge: 'Risk Alert',
        badgeColor: 'orange',
        icon: '⚠️',
        title: 'Concentration Alert',
        body: `<strong>${top.symbol}</strong> is ${top.weight.toFixed(1)}% of your portfolio ($${top.marketValue.toLocaleString()}). Single-stock positions above 15% increase risk.`,
        action: { label: 'Rebalance Ideas', route: '/accounts/portfolios?tab=risk' },
      });
    }

    // ── 3. Sector Tilt ──
    const sectorEntries = Object.entries(sectors).sort((a, b) => b[1].weight - a[1].weight);
    const topSector = sectorEntries[0];
    if (topSector && topSector[1].weight > 40) {
      insights.push({
        type: 'diversification',
        badge: 'Exposure Insight',
        badgeColor: 'blue',
        icon: '📊',
        title: 'Sector Concentration',
        body: `Your portfolio is <strong>${topSector[1].weight.toFixed(0)}% ${topSector[0]}</strong>. Broad market indices typically cap sector exposure at ~25%. Consider adding exposure to ETF - Bonds or Financials.`,
        action: { label: 'View Allocation', route: '/accounts/portfolios' },
      });
    }

    // ── 4. Top Mover Today ──
    const bestToday = [...holdings].sort((a, b) => b.dayChangePct - a.dayChangePct)[0];
    const worstToday = [...holdings].sort((a, b) => a.dayChangePct - b.dayChangePct)[0];
    if (bestToday && bestToday.dayChangePct > 0.5) {
      insights.push({
        type: 'mover',
        badge: 'Top Mover',
        badgeColor: 'green',
        icon: '🚀',
        title: 'Top Mover',
        body: `<strong>${bestToday.symbol}</strong> is up <strong>${bestToday.dayChangePct.toFixed(2)}%</strong> today (+$${bestToday.dayChangeTotal.toFixed(2)}). ` +
          (worstToday.dayChangePct < -0.5 ? `Meanwhile, ${worstToday.symbol} is down ${worstToday.dayChangePct.toFixed(2)}%.` : ''),
        bestSymbol: bestToday.symbol,
        bestPct: bestToday.dayChangePct,
        worstSymbol: worstToday.symbol,
        worstPct: worstToday.dayChangePct,
        action: null,
      });
    }

    return insights;
  }

  function buildBriefing(summary, holdings, outperformance, spx) {
    const dayDir = summary.dayChange >= 0 ? 'up' : 'down';
    const dayAmt = Math.abs(summary.dayChange).toFixed(2);
    const sorted = [...holdings].sort((a, b) => Math.abs(b.dayChangeTotal) - Math.abs(a.dayChangeTotal));
    const driver = sorted[0];
    const driverDir = driver.dayChangePct >= 0 ? '+' : '';

    let text = `Your portfolio is <strong>${dayDir} $${dayAmt}</strong> (${summary.dayChangePercent >= 0 ? '+' : ''}${summary.dayChangePercent.toFixed(2)}%) today, `;
    text += `led by <strong>${driver.symbol}</strong> (${driverDir}${driver.dayChangePct.toFixed(2)}%). `;

    if (outperformance && spx) {
      const op = parseFloat(outperformance);
      if (op > 0) {
        text += `You're <strong>outperforming</strong> the S&P 500 by ${Math.abs(op).toFixed(2)}pp today.`;
      } else {
        text += `S&P 500 is ahead by ${Math.abs(op).toFixed(2)}pp today.`;
      }
    }
    return text;
  }

  /** Generate a mini SVG sparkline */
  function miniSparkline(positive) {
    const points = positive
      ? '5,22 12,18 20,20 28,14 36,16 44,10 52,12 60,6'
      : '5,6 12,10 20,8 28,14 36,12 44,18 52,16 60,22';
    const color = positive ? '#22c55e' : '#ef4444';
    return `<svg width="65" height="28" viewBox="0 0 65 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  /** Generate a mini pie chart SVG for sector concentration */
  function miniPieChart(sectors) {
    const colors = ['#6B2D9B', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const entries = Object.entries(sectors).sort((a, b) => b[1].weight - a[1].weight);
    let cumulativePercent = 0;
    const slices = entries.map((entry, i) => {
      const [, data] = entry;
      const startAngle = cumulativePercent * 3.6;
      cumulativePercent += data.weight;
      const endAngle = cumulativePercent * 3.6;
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);
      return `<path d="M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.85"/>`;
    });
    return `<svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${slices.join('')}</svg>`;
  }

  /** Decorative wave SVG */
  function decorativeWave(color1, color2) {
    return `<svg class="insight-card-v2__decor" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <circle cx="160" cy="80" r="60" fill="${color1}" opacity="0.15"/>
      <circle cx="140" cy="60" r="40" fill="${color2}" opacity="0.2"/>
      <circle cx="180" cy="40" r="25" fill="${color1}" opacity="0.1"/>
    </svg>`;
  }

  function morningBriefingGraphic() {
    return `
      <svg class="insight-card-v2__graphic" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; right: -10px; bottom: -10px; width: 150px; height: 110px; pointer-events: none; z-index: 0;">
        <circle cx="60" cy="70" r="35" fill="url(#sun-glow)" />
        <circle cx="60" cy="70" r="14" fill="#FFF275" />
        <path d="M-10,130 Q30,60 80,85 T180,60 L180,130 Z" fill="url(#hill-back)" />
        <path d="M-20,130 Q50,75 110,90 T200,90 L200,130 Z" fill="url(#hill-mid)" />
        <path d="M0,130 Q80,85 170,120 L170,130 Z" fill="url(#hill-front)" />
        <defs>
          <radialGradient id="sun-glow" cx="60" cy="70" r="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFD54F" stop-opacity="0.9" />
            <stop offset="30%" stop-color="#FF8F00" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#FF8F00" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="hill-back" x1="80" y1="60" x2="80" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#D1C4E9" />
            <stop offset="100%" stop-color="#7E57C2" />
          </linearGradient>
          <linearGradient id="hill-mid" x1="110" y1="80" x2="110" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#B39DDB" />
            <stop offset="100%" stop-color="#5E35B1" />
          </linearGradient>
          <linearGradient id="hill-front" x1="85" y1="85" x2="85" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#9575CD" />
            <stop offset="100%" stop-color="#4527A0" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  function concentrationAlertGraphic() {
    return `
      <svg class="insight-card-v2__graphic" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; right: 0; bottom: -5px; width: 140px; height: 110px; pointer-events: none; z-index: 0;">
        <ellipse cx="80" cy="85" rx="45" ry="20" fill="#E6A100" opacity="0.2"/>
        <!-- Slice 1: Left Back -->
        <path d="M40,65 L40,77 A45,20 0 0,0 80,85 L80,73 Z" fill="#D48C00"/>
        <path d="M80,53 L40,65 A45,20 0 0,1 95,45 Z" fill="#FFE082"/>
        
        <!-- Slice 2: Top Right -->
        <path d="M80,85 L80,73 L95,45 L95,57 A45,20 0 0,1 125,65 L125,77 Z" fill="#E5A93C"/>
        <path d="M80,53 L95,45 A45,20 0 0,1 125,65 Z" fill="#FFECB3"/>
        
        <!-- Slice 3: Pulled Out Front -->
        <g transform="translate(-5, 12)">
          <path d="M80,53 L80,65 L125,65 L125,53 Z" fill="#FFA000" opacity="0.9"/>
          <path d="M80,53 L80,65 L40,65 L40,53 Z" fill="#FF8F00" opacity="0.9"/>
          <path d="M40,65 L40,77 A45,20 0 0,0 125,77 L125,65 A45,20 0 0,1 40,65 Z" fill="#FF8F00"/>
          <path d="M80,53 L40,65 A45,20 0 0,0 125,65 Z" fill="#FFE082"/>
        </g>
      </svg>
    `;
  }

  /**
   * Render the redesigned insights strip.
   */
  function renderInsightsStrip() {
    const showData = isShowDataEnabledLocal();
    if (!showData) {
      return `
        <div class="geap-insights-strip" id="insights-strip">
          <div class="insights-cards-row">
            <div class="insights-cards-main">
              <div class="insight-card-v2 animate-fade-in" style="background: #ffffff; border: 1px solid #ede9f6; border-radius: 16px;">
                <div class="insight-card-v2__inner">
                  <div class="insight-card-v2__header">
                    <span class="geap-skeleton-circle" style="width: 24px; height: 24px; display: inline-block;"></span>
                    <span class="geap-skeleton-text" style="width: 120px;"></span>
                  </div>
                  <div class="insight-card-v2__body" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <span class="geap-skeleton-line" style="width: 100%; margin: 2px 0;"></span>
                    <span class="geap-skeleton-line" style="width: 90%; margin: 2px 0;"></span>
                    <span class="geap-skeleton-line" style="width: 60%; margin: 2px 0;"></span>
                  </div>
                </div>
              </div>
              <div class="insight-card-v2 animate-fade-in" style="background: #ffffff; border: 1px solid #ede9f6; border-radius: 16px;">
                <div class="insight-card-v2__inner">
                  <div class="insight-card-v2__header">
                    <span class="geap-skeleton-circle" style="width: 24px; height: 24px; display: inline-block;"></span>
                    <span class="geap-skeleton-text" style="width: 100px;"></span>
                  </div>
                  <div class="insight-card-v2__body" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <span class="geap-skeleton-line" style="width: 100%; margin: 2px 0;"></span>
                    <span class="geap-skeleton-line" style="width: 80%; margin: 2px 0;"></span>
                  </div>
                </div>
              </div>
              <div class="insight-card-v2 animate-fade-in" style="background: #ffffff; border: 1px solid #ede9f6; border-radius: 16px;">
                <div class="insight-card-v2__inner">
                  <div class="insight-card-v2__header">
                    <span class="geap-skeleton-circle" style="width: 24px; height: 24px; display: inline-block;"></span>
                    <span class="geap-skeleton-text" style="width: 110px;"></span>
                  </div>
                  <div class="insight-card-v2__body" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <span class="geap-skeleton-line" style="width: 100%; margin: 2px 0;"></span>
                    <span class="geap-skeleton-line" style="width: 75%; margin: 2px 0;"></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="insights-actions-col">
              <a href="/ai-insights" data-route class="insights-view-all-overlay" style="border-color: #ede9f6;">
                <span class="geap-skeleton-circle" style="width: 16px; height: 16px; display: inline-block;"></span>
                <span class="geap-skeleton-text" style="width: 40px; height: 10px; margin-top: 4px;"></span>
              </a>
              <div class="insights-run-diag-btn-skeleton geap-skeleton-card" style="border-radius: 16px; flex: 1;"></div>
            </div>
          </div>
        </div>
      `;
    }

    const insights = generateInsights();
    if (insights.length === 0) return '';

    // Separate top-row cards (first 3) from the mover card
    const mainCards = insights.filter(i => i.type !== 'mover').slice(0, 3);
    const moverCard = insights.find(i => i.type === 'mover');

    const cardGradients = {
      briefing: { bg: '#ffffff' },
      risk: { bg: '#ffffff' },
      diversification: { bg: '#ffffff' },
    };

    const sectors = BrokerageData.sectorAllocation;

    return `
      <div class="geap-insights-strip" id="insights-strip">
        <div class="insights-cards-row">
          <div class="insights-cards-main">
            ${mainCards.map((insight, i) => {
      const gradient = cardGradients[insight.type] || cardGradients.briefing;
      const hasPie = insight.type === 'diversification';
      return `
                <div class="insight-card-v2 animate-fade-in" style="animation-delay: ${i * 100}ms;">
                  <div class="insight-card-v2__inner" style="background: ${gradient.bg};">
                    <div class="insight-card-v2__header">
                      <span class="insight-card-v2__icon-new">${insight.icon}</span>
                      <span class="insight-card-v2__title-new">${insight.title}</span>
                    </div>
                    <div class="insight-card-v2__body">
                      <div class="insight-card-v2__text">${insight.body}</div>
                      ${hasPie ? `<div class="insight-card-v2__pie">${miniPieChart(sectors)}</div>` : ''}
                    </div>
                    ${insight.action ? `<a href="${insight.action.route}" data-route class="insight-card-v2__action">${insight.action.label} →</a>` : ''}
                  </div>
                </div>`;
    }).join('')}
          </div>
          <div class="insights-actions-col">
            <a href="/ai-insights" data-route class="insights-view-all-overlay">
              <span class="insights-view-all__icon">✦</span> View all insights
            </a>
            <button class="insights-run-diag-btn" onclick="triggerChatQuery('Triage my active alerts'); return false;">
              Run Diagnostic Triage <span style="font-size: 0.9rem; line-height: 1;">→</span>
            </button>
          </div>
        </div>

        ${moverCard ? `
        <div class="insights-bottom-row">
          <div class="insight-mover-card animate-fade-in" style="animation-delay: 300ms;">
            <div class="insight-mover-card__left">
              <div class="insight-mover-card__icon">${moverCard.icon}</div>
            </div>
            <div class="insight-mover-card__info">
              <div class="insight-card-v2__title">${moverCard.title}</div>
              <div class="insight-card-v2__text">${moverCard.body}</div>
            </div>
            <div class="insight-mover-card__tickers">
              <div class="mover-ticker mover-ticker--up">
                <span class="mover-ticker__symbol">${moverCard.bestSymbol}</span>
                <span class="mover-ticker__pct positive">+${moverCard.bestPct.toFixed(2)}%</span>
                ${miniSparkline(true)}
              </div>
              <div class="mover-ticker mover-ticker--down">
                <span class="mover-ticker__symbol">${moverCard.worstSymbol}</span>
                <span class="mover-ticker__pct negative">${moverCard.worstPct.toFixed(2)}%</span>
                ${miniSparkline(false)}
              </div>
            </div>
            <div class="insight-mover-card__separator">|</div>
            <div class="insight-mover-card__rebalance">
              <div class="insight-mover-card__rebalance-icon">💡</div>
              <div class="insight-mover-card__rebalance-content">
                <h3>Rebalance Ideas</h3>
                <p>Improve diversification and reduce concentration risk.</p>
                <a href="/accounts/portfolios?tab=risk" data-route>View suggestions →</a>
              </div>
            </div>
          </div>
        </div>` : ''}
      </div>
    `;
  }

  return { generateInsights, renderInsightsStrip };
})();

/* ═══════════════════════════════════════════════════════════════
   GEAP — AI Insights Hub Page View
   Provides customer-facing advisory overview, proactive alerts,
   and an interactive What-If scenario sandbox.
   ═══════════════════════════════════════════════════════════════ */

const AIInsightsPage = (() => {

  let sandboxState = {
    symbol: 'NVDA',
    action: 'Buy',
    quantity: '100',
    analyzing: false,
    analyzed: false,
    step: 0
  };

  function renderView() {
    const showData = isShowDataEnabledLocal();
    if (!showData) {
      return `
        <section class="page-band">
          <div class="shell">
            <div class="geap-page-header">
              <div>
                <h1 style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: var(--geap-purple-bright, #6B2D9B);">✦</span> AI Insights Hub
                </h1>
                <p style="color: var(--geap-text-secondary, #64748b);"><span class="geap-skeleton-text" style="width: 320px;"></span></p>
              </div>
            </div>
          </div>
        </section>

        <section class="shell" style="padding-top: 20px; padding-bottom: 40px;">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;"><span class="geap-skeleton-text" style="width: 200px;"></span></h2>
          <div class="agent-team-grid">
            ${[1, 2, 3, 4].map(() => `
              <div class="agent-card">
                <div class="agent-card__header">
                  <span class="geap-skeleton-circle" style="width: 24px; height: 24px; display: inline-block;"></span>
                  <span class="geap-skeleton-text" style="width: 50px;"></span>
                </div>
                <h3 class="agent-card__name" style="margin-top: 8px;"><span class="geap-skeleton-text" style="width: 120px;"></span></h3>
                <p class="agent-card__desc" style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                  <span class="geap-skeleton-line" style="width: 100%; margin: 0;"></span>
                  <span class="geap-skeleton-line" style="width: 80%; margin: 0;"></span>
                </p>
                <div class="agent-card__footer" style="margin-top: auto; padding-top: 10px;"><span class="geap-skeleton-text" style="width: 140px;"></span></div>
              </div>
            `).join('')}
          </div>

          <div class="ai-insights-dashboard-grid" style="margin-top: 32px;">
            <div class="insights-feed-col">
              <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;"><span class="geap-skeleton-text" style="width: 180px;"></span></h2>
              ${[1, 2, 3].map(() => `
                <div class="insight-feed-card">
                  <div class="insight-feed-card__header">
                    <span class="geap-skeleton-text" style="width: 60px;"></span>
                    <span class="geap-skeleton-text" style="width: 100px;"></span>
                  </div>
                  <h3 style="margin: 8px 0 6px 0;"><span class="geap-skeleton-text" style="width: 140px;"></span></h3>
                  <p style="display: flex; flex-direction: column; gap: 6px; margin: 0 0 16px 0;">
                    <span class="geap-skeleton-line" style="width: 100%; margin: 0;"></span>
                    <span class="geap-skeleton-line" style="width: 90%; margin: 0;"></span>
                    <span class="geap-skeleton-line" style="width: 60%; margin: 0;"></span>
                  </p>
                  <span class="geap-skeleton-text" style="width: 150px; height: 32px; border-radius: 8px;"></span>
                </div>
              `).join('')}
            </div>

            <div class="sandbox-col">
              <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;"><span class="geap-skeleton-text" style="width: 160px;"></span></h2>
              <div class="sandbox-card">
                <p style="display: flex; flex-direction: column; gap: 6px; margin: 0 0 16px 0;">
                  <span class="geap-skeleton-line" style="width: 100%; margin: 0;"></span>
                  <span class="geap-skeleton-line" style="width: 80%; margin: 0;"></span>
                </p>
                <div class="sandbox-form" style="margin-bottom: 20px;">
                  <div class="form-group"><span class="geap-skeleton-text" style="width: 40px; margin-bottom: 4px;"></span><span class="geap-skeleton-text" style="height: 34px; border-radius: 8px;"></span></div>
                  <div class="form-group"><span class="geap-skeleton-text" style="width: 50px; margin-bottom: 4px;"></span><span class="geap-skeleton-text" style="height: 34px; border-radius: 8px;"></span></div>
                  <div class="form-group"><span class="geap-skeleton-text" style="width: 60px; margin-bottom: 4px;"></span><span class="geap-skeleton-text" style="height: 34px; border-radius: 8px;"></span></div>
                </div>
                <span class="geap-skeleton-text" style="width: 100%; height: 38px; border-radius: 8px;"></span>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="page-band">
        <div class="shell">
          <div class="geap-page-header">
            <div>
              <h1 style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--geap-purple-bright, #6B2D9B);">✦</span> AI Insights Hub
              </h1>
              <p style="color: var(--geap-text-secondary, #64748b);">Personalized wealth intelligence powered by Google Enterprise Agent Platform</p>
            </div>
            <span class="geap-badge geap-badge--green"><span class="geap-badge-dot geap-badge-dot--active"></span> GEAP Active</span>
          </div>
        </div>
      </section>

      <section class="shell" style="padding-top: 20px; padding-bottom: 40px;">
        
        <!-- Section 1: Personal Financial Agent Team -->
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;">Your Dedicated AI Advisory Fleet</h2>
        <div class="agent-team-grid">
          <div class="agent-card">
            <div class="agent-card__header">
              <span class="agent-card__icon">📈</span>
              <div class="agent-card__status">
                <span class="active-dot-pulse"></span>
                <span>Active</span>
              </div>
            </div>
            <h3 class="agent-card__name">Portfolio Optimizer</h3>
            <p class="agent-card__desc">Monitors asset weights, sector tilts, and triggers alerts for rebalancing opportunities.</p>
            <div class="agent-card__footer">Last Action: Scanned portfolio just now</div>
          </div>

          <div class="agent-card">
            <div class="agent-card__header">
              <span class="agent-card__icon">📝</span>
              <div class="agent-card__status">
                <span class="active-dot-pulse"></span>
                <span>Active</span>
              </div>
            </div>
            <h3 class="agent-card__name">Tax Specialist</h3>
            <p class="agent-card__desc">Tracks tax-loss harvesting targets and reviews capital gain scenarios across positions.</p>
            <div class="agent-card__footer">Last Action: Scanned holdings today, 8:00 AM</div>
          </div>

          <div class="agent-card">
            <div class="agent-card__header">
              <span class="agent-card__icon">🌅</span>
              <div class="agent-card__status">
                <span class="active-dot-pulse"></span>
                <span>Active</span>
              </div>
            </div>
            <h3 class="agent-card__name">Retirement Guide</h3>
            <p class="agent-card__desc">Simulates wealth glide paths, runs Monte Carlo projection maps, and assesses longevity goals.</p>
            <div class="agent-card__footer">Last Action: Recalculated milestones today, 9:15 AM</div>
          </div>

          <div class="agent-card">
            <div class="agent-card__header">
              <span class="agent-card__icon">🛡️</span>
              <div class="agent-card__status">
                <span class="active-dot-pulse"></span>
                <span>Active</span>
              </div>
            </div>
            <h3 class="agent-card__name">Risk Watchdog</h3>
            <p class="agent-card__desc">Enforces regulatory constraints, safety guardrails, and compliance disclaimers on all advice.</p>
            <div class="agent-card__footer">Last Action: Audited session logs just now</div>
          </div>
        </div>

        <!-- Section 2: Split Columns for Feed and What-If Sandbox -->
        <div class="ai-insights-dashboard-grid" style="margin-top: 32px;">
          
          <!-- LEFT: Proactive Recommendations Feed -->
          <div class="insights-feed-col">
            <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;">Proactive Agent Recommendations</h2>
            
            <div class="insight-feed-card animate-fade-in">
              <div class="insight-feed-card__header">
                <span class="insight-badge risk">Risk Alert</span>
                <span style="font-size: 0.75rem; color: #64748b;">Portfolio Optimizer</span>
              </div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 8px 0 6px 0;">Portfolio Concentration</h3>
              <p style="font-size: 0.8rem; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">
                Your MSFT position represents <strong>15.9%</strong> of your total assets. Diversification guidelines recommend capping individual equities at 15.0% to minimize single-stock downside and sector overlap.
              </p>
              <button class="insight-feed-btn" onclick="AIInsightsPage.triggerRebalance()">
                <span>✦ Run Rebalance Simulation</span>
              </button>
            </div>

            <div class="insight-feed-card animate-fade-in" style="animation-delay: 100ms;">
              <div class="insight-feed-card__header">
                <span class="insight-badge progress">Progress Update</span>
                <span style="font-size: 0.75rem; color: #64748b;">Retirement Guide</span>
              </div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 8px 0 6px 0;">Retirement Wealth Tracking</h3>
              <p style="font-size: 0.8rem; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">
                Based on your current assets ($84,230.15) and saving rate ($1,200/mo), the Monte Carlo model projects an <strong>84%</strong> success rate of reaching your $1.0M target by age 65 (2046).
              </p>
              <button class="insight-feed-btn" onclick="AIInsightsPage.triggerRetirement()">
                <span>✦ Run Retirement Health Check</span>
              </button>
            </div>

            <div class="insight-feed-card animate-fade-in" style="animation-delay: 200ms;">
              <div class="insight-feed-card__header">
                <span class="insight-badge tax">Tax Opportunity</span>
                <span style="font-size: 0.75rem; color: #64748b;">Tax Specialist</span>
              </div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 8px 0 6px 0;">Tax-Loss Harvesting Alert</h3>
              <p style="font-size: 0.8rem; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">
                We have identified <strong>$450</strong> in harvestable capital losses across your active holdings that could offset future capital gains taxes. Click to run harvesting analysis.
              </p>
              <button class="insight-feed-btn" onclick="AIInsightsPage.triggerTaxHarvest()">
                <span>✦ Analyze Tax Harvesting</span>
              </button>
            </div>

          </div>

          <!-- RIGHT: What-If Scenario Sandbox -->
          <div class="sandbox-col">
            <h2 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 14px;">What-If Scenario Sandbox</h2>
            <div class="sandbox-card">
              <p style="font-size: 0.8rem; color: #475569; line-height: 1.4; margin: 0 0 16px 0;">
                Simulate transactional outcomes before placing actual trades. GEAP agents will classify intent, calculate sector shift, and audit compliance guardrails.
              </p>

              <div class="sandbox-form">
                <div class="form-group">
                  <label for="sandbox-action">Action</label>
                  <select id="sandbox-action" class="form-select">
                    <option value="Buy" ${sandboxState.action === 'Buy' ? 'selected' : ''}>Buy</option>
                    <option value="Sell" ${sandboxState.action === 'Sell' ? 'selected' : ''}>Sell</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="sandbox-symbol">Symbol</label>
                  <select id="sandbox-symbol" class="form-select">
                    <option value="NVDA" ${sandboxState.symbol === 'NVDA' ? 'selected' : ''}>NVDA (NVIDIA)</option>
                    <option value="MSFT" ${sandboxState.symbol === 'MSFT' ? 'selected' : ''}>MSFT (Microsoft)</option>
                    <option value="TSLA" ${sandboxState.symbol === 'TSLA' ? 'selected' : ''}>TSLA (Tesla)</option>
                    <option value="AAPL" ${sandboxState.symbol === 'AAPL' ? 'selected' : ''}>AAPL (Apple)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="sandbox-qty">Quantity</label>
                  <input type="number" id="sandbox-qty" class="form-input" min="1" value="${sandboxState.quantity}">
                </div>
              </div>

              <button class="sandbox-action-btn" id="run-sandbox-btn" onclick="AIInsightsPage.runAnalysis()">
                <span>✦ Analyze Trade Scenario</span>
              </button>

              <!-- Result Area -->
              <div id="sandbox-result-area" style="margin-top: 20px;">
                ${renderSandboxResults()}
              </div>

            </div>
          </div>

        </div>

      </section>
    `;
  }

  function renderSandboxResults() {
    if (!sandboxState.analyzing && !sandboxState.analyzed) {
      return `
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; color: #64748b; font-size: 0.8rem;">
          Specify a mock trade transaction above and click analyze to launch the GEAP simulation.
        </div>
      `;
    }

    if (sandboxState.analyzing) {
      return `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <h4 style="font-size: 0.8rem; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;">
            <div class="rebalance-spinner" style="width: 14px; height: 14px;"></div>
            GEAP Orchestrating Multi-Agent Evaluation...
          </h4>
          <div class="sandbox-stepper">
            <div class="stepper-item ${sandboxState.step >= 1 ? 'completed' : 'pending'}">
              <span class="step-dot"></span>
              <span class="step-text">Orchestrator classifying trade intent...</span>
            </div>
            <div class="stepper-item ${sandboxState.step >= 2 ? 'completed' : 'pending'}">
              <span class="step-dot"></span>
              <span class="step-text">Portfolio Analyst computing sector weight shift...</span>
            </div>
            <div class="stepper-item ${sandboxState.step >= 3 ? 'completed' : 'pending'}">
              <span class="step-dot"></span>
              <span class="step-text">Risk Watchdog assessing portfolio Beta delta...</span>
            </div>
            <div class="stepper-item ${sandboxState.step >= 4 ? 'completed' : 'pending'}">
              <span class="step-dot"></span>
              <span class="step-text">Safety Engine checking compliance safeguards...</span>
            </div>
          </div>
        </div>
      `;
    }

    // Analyzed State
    const actionWord = sandboxState.action;
    const qty = parseInt(sandboxState.quantity) || 100;
    const sym = sandboxState.symbol;

    const prices = {
      'NVDA': 120.00,
      'MSFT': 380.00,
      'TSLA': 220.00,
      'AAPL': 180.00
    };

    const price = prices[sym] || 150.00;
    const totalCost = qty * price;

    const activeAccount = (typeof selectedAccount === 'function') ? selectedAccount() : null;
    let cash = 1000.00;
    if (activeAccount && activeAccount.available) {
      cash = parseFloat(activeAccount.available.replace('$', '').replace(',', '')) || 0;
    }

    let startWeightPct = 0;
    if (sym === 'NVDA') startWeightPct = 5.2;
    else if (sym === 'MSFT') startWeightPct = 72.8;
    else if (sym === 'TSLA') startWeightPct = 4.1;
    else startWeightPct = 6.4; // AAPL

    let totalVal = 12734.88;
    if (activeAccount && activeAccount.netValue) {
      totalVal = parseFloat(activeAccount.netValue.replace('$', '').replace(',', '')) || totalVal;
    }

    const stockStartValue = (startWeightPct / 100) * totalVal;
    let stockEndValue = stockStartValue;
    let newTotalValue = totalVal;

    let isOutOfBounds = false;
    let warningReason = '';

    if (actionWord === 'Buy') {
      stockEndValue += totalCost;
      newTotalValue += Math.max(0, totalCost - cash);
      if (totalCost > cash) {
        isOutOfBounds = true;
        warningReason = `Insufficient Funds: The simulated purchase of $${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds your available buying power ($${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`;
      }
    } else { // Sell
      const ownedShares = Math.round(stockStartValue / price);
      if (qty > ownedShares) {
        isOutOfBounds = true;
        warningReason = `Insufficient Holdings: The simulated sale of ${qty.toLocaleString()} shares of ${sym} exceeds your current holdings of ${ownedShares.toLocaleString()} shares.`;
      } else {
        const sellValue = qty * price;
        stockEndValue -= sellValue;
      }
    }

    const endWeight = (stockEndValue / newTotalValue) * 100;

    let startBeta = 1.42;
    let endBeta = 1.42;
    if (sym === 'NVDA') {
      endBeta = actionWord === 'Buy' ? 1.54 : 1.34;
    } else if (sym === 'MSFT') {
      endBeta = actionWord === 'Buy' ? 1.45 : 1.39;
    } else if (sym === 'TSLA') {
      endBeta = actionWord === 'Buy' ? 1.59 : 1.31;
    } else { // AAPL
      endBeta = actionWord === 'Buy' ? 1.44 : 1.40;
    }

    // Adjust beta delta for large scales
    if (qty > 1000) {
      const scaleFactor = Math.min(2.5, Math.log10(qty) - 1);
      if (actionWord === 'Buy') {
        endBeta = startBeta + (endBeta - startBeta) * scaleFactor;
      } else {
        endBeta = startBeta - (startBeta - endBeta) * scaleFactor;
      }
    }

    const directionColor = actionWord === 'Buy' ? '#ef4444' : '#22c55e';
    const betaDiff = (endBeta - startBeta).toFixed(2);
    const betaText = betaDiff > 0 ? `+${betaDiff}` : betaDiff;

    if (isOutOfBounds) {
      return `
        <div style="background: #fdf2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; animation: rebalance-fade-in 0.35s ease-out;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: #991b1b; margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span> Guardrail Alert: Out of Bounds
          </h4>

          <div class="sandbox-results-grid">
            <div class="result-metric" style="background: #fff; border-color: #fca5a5;">
              <span class="metric-label" style="color: #991b1b;">Simulated Cost</span>
              <span class="metric-value" style="color: #991b1b;">$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div class="result-metric" style="background: #fff; border-color: #fca5a5;">
              <span class="metric-label" style="color: #991b1b;">Projected Weight</span>
              <span class="metric-value" style="color: #991b1b;">${endWeight.toFixed(1)}%</span>
            </div>
          </div>

          <p style="font-size: 0.75rem; color: #991b1b; margin: 12px 0 16px 0; line-height: 1.45;">
            <strong>${warningReason}</strong>
            ${endWeight > 30 ? `<br><br><strong>Concentration Risk:</strong> This transaction would also create severe concentration risk, putting ${sym} at <strong>${endWeight.toFixed(1)}%</strong> of your total assets, exceeding the standard 15% safety threshold.` : ''}
          </p>

          <button class="sandbox-chat-cta" style="background: #dc2626;" onclick="AIInsightsPage.askAssistant()">
            <span>✦ Ask Assistant About This Simulation</span>
          </button>
        </div>
      `;
    }

    return `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; animation: rebalance-fade-in 0.35s ease-out;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: #166534; margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;">
          <span>✔</span> Simulated Outcome Analysis
        </h4>

        <div class="sandbox-results-grid">
          <div class="result-metric">
            <span class="metric-label">${sym} Portfolio Weight</span>
            <span class="metric-value">${startWeightPct.toFixed(1)}% ➔ ${endWeight.toFixed(1)}%</span>
          </div>

          <div class="result-metric">
            <span class="metric-label">Estimated Beta Delta</span>
            <span class="metric-value" style="color: ${directionColor};">${startBeta.toFixed(2)} ➔ ${endBeta.toFixed(2)} (${betaText})</span>
          </div>
        </div>

        <p style="font-size: 0.75rem; color: #166534; margin: 12px 0 16px 0; line-height: 1.4;">
          This ${actionWord.toLowerCase()} transaction ${actionWord === 'Buy' ? 'increases' : 'decreases'} tech sector dependency. Risk engines report compliance constraints are <strong>fully satisfied</strong>.
        </p>

        <button class="sandbox-chat-cta" onclick="AIInsightsPage.askAssistant()">
          <span>✦ Ask Assistant About This Simulation</span>
        </button>
      </div>
    `;
  }

  function runAnalysis() {
    // Read form values
    const act = document.getElementById('sandbox-action').value;
    const sym = document.getElementById('sandbox-symbol').value;
    const qty = document.getElementById('sandbox-qty').value;

    sandboxState = {
      symbol: sym,
      action: act,
      quantity: qty,
      analyzing: true,
      analyzed: false,
      step: 0
    };

    // Render loading state
    updateUI();

    // Staggered stepper simulation
    const steps = [
      () => { sandboxState.step = 1; updateUI(); },
      () => { sandboxState.step = 2; updateUI(); },
      () => { sandboxState.step = 3; updateUI(); },
      () => { sandboxState.step = 4; updateUI(); },
      () => {
        sandboxState.analyzing = false;
        sandboxState.analyzed = true;
        updateUI();
      }
    ];

    steps.forEach((func, idx) => {
      setTimeout(func, (idx + 1) * 250);
    });
  }

  function updateUI() {
    const area = document.getElementById('sandbox-result-area');
    if (area) {
      area.innerHTML = renderSandboxResults();
    }
  }

  function triggerRebalance() {
    if (typeof window !== 'undefined' && window.ensureScript) {
      window.ensureScript('/js/chat.js?v=0.1.0', () => {
        if (typeof Chat !== 'undefined') {
          Chat.init();
          Chat.selectAgent('portfolio-analyst');
          Chat.sendMessage('Run a comprehensive risk analysis on my portfolios and active account holdings');
          openChatPanel();
        }
      });
    } else if (typeof Chat !== 'undefined') {
      Chat.init();
      Chat.selectAgent('portfolio-analyst');
      Chat.sendMessage('Run a comprehensive risk analysis on my portfolios and active account holdings');
      openChatPanel();
    }
  }

  function triggerRetirement() {
    if (typeof window !== 'undefined' && window.ensureScript) {
      window.ensureScript('/js/chat.js?v=0.1.0', () => {
        if (typeof Chat !== 'undefined') {
          Chat.init();
          Chat.selectAgent('portfolio-analyst');
          Chat.sendMessage('Run retirement planning health check.');
          openChatPanel();
        }
      });
    } else if (typeof Chat !== 'undefined') {
      Chat.init();
      Chat.selectAgent('portfolio-analyst');
      Chat.sendMessage('Run retirement planning health check.');
      openChatPanel();
    }
  }

  function triggerTaxHarvest() {
    if (typeof window !== 'undefined' && window.ensureScript) {
      window.ensureScript('/js/chat.js?v=0.1.0', () => {
        if (typeof Chat !== 'undefined') {
          Chat.init();
          Chat.selectAgent('portfolio-analyst');
          Chat.sendMessage('Show tax loss harvesting opportunities and run tax analysis.');
          openChatPanel();
        }
      });
    } else if (typeof Chat !== 'undefined') {
      Chat.init();
      Chat.selectAgent('portfolio-analyst');
      Chat.sendMessage('Show tax loss harvesting opportunities and run tax analysis.');
      openChatPanel();
    }
  }

  function askAssistant() {
    if (typeof window !== 'undefined' && window.ensureScript) {
      window.ensureScript('/js/chat.js?v=0.1.0', () => {
        if (typeof Chat !== 'undefined') {
          Chat.init();
          Chat.selectAgent('portfolio-analyst');
          const action = sandboxState.action;
          const qty = sandboxState.quantity;
          const sym = sandboxState.symbol;
          Chat.sendMessage(`Analyze my simulated transaction of ${action.toLowerCase()}ing ${qty} shares of ${sym}.`);
          openChatPanel();
        }
      });
    } else if (typeof Chat !== 'undefined') {
      Chat.init();
      Chat.selectAgent('portfolio-analyst');
      const action = sandboxState.action;
      const qty = sandboxState.quantity;
      const sym = sandboxState.symbol;
      Chat.sendMessage(`Analyze my simulated transaction of ${action.toLowerCase()}ing ${qty} shares of ${sym}.`);
      openChatPanel();
    }
  }

  function openChatPanel() {
    const panel = document.getElementById('agent-panel');
    if (panel) {
      panel.hidden = false;
    }
    const launcher = document.querySelector('.chat-launcher');
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'true');
    }
  }

  function bindEvents() {
    // Keep internal bindings clean (e.g. syncing select inputs to state)
    const act = document.getElementById('sandbox-action');
    const sym = document.getElementById('sandbox-symbol');
    const qty = document.getElementById('sandbox-qty');

    if (act) {
      act.addEventListener('change', (e) => { sandboxState.action = e.target.value; });
    }
    if (sym) {
      sym.addEventListener('change', (e) => { sandboxState.symbol = e.target.value; });
    }
    if (qty) {
      qty.addEventListener('input', (e) => { sandboxState.quantity = e.target.value; });
    }
  }

  return {
    renderView,
    bindEvents,
    runAnalysis,
    triggerRebalance,
    triggerRetirement,
    triggerTaxHarvest,
    askAssistant
  };
})();
