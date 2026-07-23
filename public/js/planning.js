function renderPlanning() {
  return `
    <section class="page-band">
      <div class="shell">
        <div class="page-title-row">
          <h1>Planning & Retirement</h1>
          <button class="text-button" type="button" data-refresh>Refresh <span>${mockData.user.refreshedAt}</span></button>
        </div>
      </div>
    </section>

    <section class="shell" style="margin-top: 24px; margin-bottom: 40px;">
      <div class="content-grid" style="padding-top: 0; padding-bottom: 0;">
        
        <!-- Left Column: AI Advisor & Stats -->
        <div>
          <!-- AI Retirement Advisor Hero -->
          <div class="geap-card" style="margin-bottom: 24px; padding: 24px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6B2D9B, #4F8EF7);"></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #1e293b;">✦ GEAP Intelligent Retirement Advisor</h2>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Active Wealth & Retirement Planning</p>
              </div>
              <span class="geap-badge" style="background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8; font-size: 11px; padding: 2px 8px; border-radius: 9999px;">AI Enabled</span>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #334155; margin-bottom: 20px;">
              The Google Enterprise Agent Platform retirement optimizer simulates target date glide paths, runs Monte Carlo projection maps, and assesses your asset allocation to ensure a secure path to retirement. Click below to trigger a retirement health check directly with the assistant.
            </p>
            <button class="outline-button" onclick="if (typeof triggerChatQuery !== 'undefined') { triggerChatQuery('Run retirement planning health check.'); } return false;" 
                    style="background: #6B2D9B; color: #fff; border-color: #6B2D9B; display: flex; align-items: center; gap: 6px;">
              <span>✦ Run Retirement Health Check</span>
            </button>
          </div>

          <!-- Retirement Projections Grid -->
          <div class="planning-stats-grid">
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Retirement Target Age</span>
              <strong style="font-size: 22px; font-weight: 700; color: #1e293b; display: block; margin-top: 4px;">65 <span style="font-size: 13px; font-weight: 400; color: #64748b;">(in 2046)</span></strong>
            </div>

            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Retirement Savings</span>
              <strong style="font-size: 22px; font-weight: 700; color: #1e293b; display: block; margin-top: 4px;">$84,230.15</strong>
            </div>

            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Projected Value (Age 65)</span>
              <strong style="font-size: 22px; font-weight: 700; color: #1e293b; display: block; margin-top: 4px;">$1,245,000</strong>
            </div>

            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Probability of Success</span>
              <strong style="font-size: 22px; font-weight: 700; color: #16a34a; display: block; margin-top: 4px;">84% <span style="font-size: 12px; font-weight: 500; color: #16a34a;">(High)</span></strong>
            </div>
          </div>

          <!-- Tools Spotlight -->
          <div class="planning-tools-grid">
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column;">
              <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;">📈 Glide Path Optimizer</strong>
              <p style="font-size: 11px; line-height: 1.4; color: #475569; margin: 0;">Maintains your equity-to-bond ratio as you age to automatically protect your capital assets.</p>
            </div>
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column;">
              <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;">🎲 Monte Carlo Projections</strong>
              <p style="font-size: 11px; line-height: 1.4; color: #475569; margin: 0;">Runs 1,000 distinct market permutations to evaluate potential drawdown risks and asset longevity.</p>
            </div>
            <div class="geap-card" style="padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column;">
              <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;">💼 Asset Allocation Review</strong>
              <p style="font-size: 11px; line-height: 1.4; color: #475569; margin: 0;">Reviews cash, domestic, and international equity balances to preserve long-term compounding.</p>
            </div>
          </div>
        </div>

        <!-- Right Column: Active Safeguards & Info -->
        <div>
          <div class="geap-card" style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 16px 0; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Active AI Safeguards</h3>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 12px; color: #334155; display: block;">PII Protection</strong>
                  <span style="font-size: 10px; color: #64748b;">SSN & account scrub active</span>
                </div>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 12px; color: #334155; display: block;">Retirement Safety Rules</strong>
                  <span style="font-size: 10px; color: #64748b;">Fiduciary advice limits active</span>
                </div>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 12px; color: #334155; display: block;">Investment Disclaimer</strong>
                  <span style="font-size: 10px; color: #64748b;">SIPC warning disclosures active</span>
                </div>
                <span style="font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px;">● Active</span>
              </div>
            </div>

            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.4;">
              All advisory interactions are audited and logged for compliance monitoring. Visit the <a href="/agent-fabric" data-route style="color: #6B2D9B; font-weight: 600; text-decoration: underline;">Agent Fabric</a> to inspect active routing histories.
            </div>
          </div>
        </div>

      </div>
    </section>
  `;
}
