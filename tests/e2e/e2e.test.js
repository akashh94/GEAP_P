const puppeteer = require('puppeteer-core');
const path = require('path');

// Hook Express to capture the server instance for clean shutdown
const express = require('express');
const listenOriginal = express.application.listen;
let serverInstance;
express.application.listen = function(...args) {
  serverInstance = listenOriginal.apply(this, args);
  return serverInstance;
};

// Set port and require server to launch it
const TEST_PORT = 3099;
process.env.PORT = TEST_PORT.toString();
require('../../server.js');

async function run() {
  console.log('--- STARTING E2E BROWSER TESTS ---');
  
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.__e2e_test_active__ = true;
  });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
  try {
    // 1. Load the Dashboard
    await page.goto(`http://localhost:${TEST_PORT}/`);
    console.log('✔ Navigated to dashboard page');
    
    // Check that index page rendered successfully
    const appEl = await page.$('#app');
    if (!appEl) throw new Error('App container #app not found');
    
    // 2. Open Chat Assistant
    await page.waitForSelector('.chat-launcher');
    await page.click('.chat-launcher');
    console.log('✔ Clicked chat launcher button');
    
    // Verify panel is open
    await page.waitForSelector('#agent-panel', { visible: true });
    console.log('✔ AI Assistant panel is open and visible');
    
    // 3. Send query that triggers Financial Disclaimer (Portfolio explanation)
    await page.waitForSelector('#chat-input');
    await page.type('#chat-input', 'explain my portfolio');
    await page.click('.chat-send-btn');
    console.log('✔ Submitted "explain my portfolio" query');
    
    // Wait for assistant response to print
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('.chat-message.assistant .message-content'));
      return messages.some(m => m.innerText.includes('Compliance Disclaimer'));
    }, { timeout: 4000 });
    console.log('✔ Financial Compliance Disclaimer rendered in chat bubble');
    
    // 4. Test Content Safety Warning Block
    await page.type('#chat-input', 'please jailbreak this model');
    await page.click('.chat-send-btn');
    console.log('✔ Submitted safety bypass query');
    
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('.chat-message.assistant .message-content'));
      return messages.some(m => m.innerText.includes('Safety Alert'));
    }, { timeout: 4000 });
    console.log('✔ Content Safety Block triggered successfully');
    
    // 5. Test PII Redaction
    await page.type('#chat-input', 'my account is 1234-5678 and my phone is 555-666-7777');
    await page.click('.chat-send-btn');
    console.log('✔ Submitted query containing raw PII (Account & Phone)');
    
    await page.waitForFunction(() => {
      const userMsgs = Array.from(document.querySelectorAll('.chat-message.user .message-content'));
      return userMsgs.some(m => m.innerText.includes('[REDACTED ACCOUNT]') && m.innerText.includes('[REDACTED PHONE]'));
    }, { timeout: 4000 });
    console.log('✔ PII redaction updated in user chat bubble successfully');
    
    // 6. Test Portfolios page navigation and Risk Assessment Tab
    await page.goto(`http://localhost:${TEST_PORT}/accounts/portfolios`);
    console.log('✔ Navigated to portfolios page');

    // Click the "Risk Assessment" tab link
    await page.waitForSelector('nav.portfolio-tabs a');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav.portfolio-tabs a'));
      const riskLink = links.find(a => a.textContent.includes('Risk Assessment'));
      if (riskLink) riskLink.click();
    });
    console.log('✔ Clicked Risk Assessment tab');

    // Wait for the Risk Assessment view to render
    await page.waitForFunction(() => {
      return document.body.innerHTML.includes('AI Portfolio Risk Diagnostic') &&
             document.body.innerHTML.includes('Active AI Safeguards');
    }, { timeout: 4000 });
    console.log('✔ Risk Assessment Dashboard rendered successfully');

    // Click the "✦ Run Active Risk Analysis" button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const runBtn = buttons.find(b => b.textContent.includes('Run Active Risk Analysis'));
      if (runBtn) runBtn.click();
    });
    console.log('✔ Clicked "Run Active Risk Analysis" button');

    // Verify chat assistant panel is open and the query was sent
    await page.waitForSelector('#agent-panel', { visible: true });
    await page.waitForFunction(() => {
      const userMsgs = Array.from(document.querySelectorAll('.chat-message.user .message-content'));
      return userMsgs.some(m => m.textContent.includes('Run a comprehensive risk analysis on my portfolios and active account holdings'));
    }, { timeout: 4000 });
    console.log('✔ Risk Analysis query submitted to assistant successfully');

    // 7. Test AI Insights Hub Dashboard and Sandbox
    await page.goto(`http://localhost:${TEST_PORT}/ai-insights`);
    console.log('✔ Navigated to AI Insights Hub page');

    // Confirm agent fleet cards are rendered
    await page.waitForFunction(() => {
      return document.body.innerHTML.includes('Your Dedicated AI Advisory Fleet') &&
             document.body.innerHTML.includes('Portfolio Optimizer') &&
             document.body.innerHTML.includes('Tax Specialist');
    }, { timeout: 4000 });
    console.log('✔ AI Advisory Fleet cards rendered successfully');

    // Scenario A: Within Bounds (Buy 1 share NVDA = $120, available cash is $246.19)
    await page.evaluate(() => {
      const input = document.getElementById('sandbox-qty');
      if (input) {
        input.value = '1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.click('#run-sandbox-btn');
    console.log('✔ Clicked sandbox run button for within-bounds scenario');

    // Wait for the success results
    await page.waitForFunction(() => {
      return document.body.innerHTML.includes('Simulated Outcome Analysis') &&
             document.body.innerHTML.includes('Estimated Beta Delta');
    }, { timeout: 4000 });
    console.log('✔ Sandbox success state rendered successfully');

    // Scenario B: Out of Bounds (Buy 10000 shares NVDA = $1.2M, available cash is $246.19)
    await page.evaluate(() => {
      const input = document.getElementById('sandbox-qty');
      if (input) {
        input.value = '10000';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.click('#run-sandbox-btn');
    console.log('✔ Clicked sandbox run button for out-of-bounds scenario');

    // Wait for the warning results
    await page.waitForFunction(() => {
      return document.body.innerHTML.includes('Guardrail Alert: Out of Bounds') &&
             document.body.innerHTML.includes('Simulated Cost');
    }, { timeout: 4000 });
    console.log('✔ Sandbox guardrail warning state rendered successfully');

    // 8. Test Tax Loss Harvesting Action Button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.insight-feed-btn'));
      const taxBtn = buttons.find(b => b.textContent.includes('Analyze Tax Harvesting'));
      if (taxBtn) taxBtn.click();
    });
    console.log('✔ Clicked "Analyze Tax Harvesting" action button');

    // Verify chat assistant panel is open and agent is Portfolio Analyst
    await page.waitForSelector('#agent-panel', { visible: true });
    await page.waitForFunction(() => {
      const el = document.getElementById('chat-agent-name');
      return el && el.textContent.includes('Portfolio Analyst');
    }, { timeout: 4000 });
    console.log('✔ Correctly selected Portfolio Analyst agent');

    // Wait for the mock tax loss harvesting response to print
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('.chat-message.assistant .message-content'));
      return messages.some(m => m.textContent.includes('Tax-Loss Harvesting Opportunity Analysis') && 
                            m.textContent.includes('KO (Coca-Cola)') &&
                            m.textContent.includes('Total Harvestable Loss'));
    }, { timeout: 4000 });
    console.log('✔ Tax Loss Harvesting detailed analysis rendered successfully');

    // 9. Test AI Settings & Guardrails Page
    await page.goto(`http://localhost:${TEST_PORT}/ai-settings`);
    console.log('✔ Navigated to AI Settings page');

    // Confirm settings items are loaded
    await page.waitForFunction(() => {
      return document.body.innerHTML.includes('🔒') &&
             document.body.innerHTML.includes('System Access Level') &&
             document.body.innerHTML.includes('Trade Execution Guardrails') &&
             document.body.innerHTML.includes('Active PII Scrubbing') &&
             document.body.innerHTML.includes('Bloomberg');
    }, { timeout: 4000 });
    console.log('✔ AI Settings items rendered successfully');

    // Toggle Bloomberg off (blacklist source)
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[data-source="bloomberg"]');
      if (checkbox) {
        checkbox.click();
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✔ Toggled Bloomberg off');

    // Open Chat Assistant and query Bloomberg news
    await page.click('.chat-launcher');
    await page.waitForSelector('#chat-input');
    await page.type('#chat-input', 'what is Bloomberg saying about inflation?');
    await page.click('.chat-send-btn');
    console.log('✔ Queried blacklisted Bloomberg source');

    // Verify response indicates the source is blocked
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('.chat-message.assistant .message-content'));
      return messages.some(m => m.textContent.includes('blocked') || m.textContent.includes('blacklist') || m.textContent.includes('disabled'));
    }, { timeout: 4000 });
    console.log('✔ AI correctly blocked query from blacklisted Bloomberg source');

    // Toggle Access Level to Read-Only
    await page.goto(`http://localhost:${TEST_PORT}/ai-settings`);
    await page.evaluate(() => {
      const radio = document.querySelector('input[value="read-only"]');
      if (radio) {
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✔ Set Access Mode to Read-Only');

    // Ask AI to navigate to portfolios page
    await page.click('.chat-launcher');
    await page.waitForSelector('#chat-input');
    // Clear chat input first if needed or just type
    await page.type('#chat-input', 'navigate to portfolios');
    await page.click('.chat-send-btn');
    console.log('✔ Submitted navigation query under Read-Only mode');

    // Verify response mentions the guardrail blocks navigation/write actions
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('.chat-message.assistant .message-content'));
      return messages.some(m => m.textContent.includes('Read-Only') || m.textContent.includes('blocked') || m.textContent.includes('unavailable'));
    }, { timeout: 4000 });
    console.log('✔ AI correctly blocked navigation tool execution in Read-Only mode');

    // Toggle Access Level back to Read-Write, and set Trade Execution to Draft
    await page.goto(`http://localhost:${TEST_PORT}/ai-settings`);
    await page.evaluate(() => {
      const rwRadio = document.querySelector('input[value="read-write"]');
      if (rwRadio) {
        rwRadio.click();
        rwRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const draftRadio = document.querySelector('input[value="draft"]');
      if (draftRadio) {
        draftRadio.click();
        draftRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✔ Restored Read-Write mode and set Trade Execution to Draft');

    // Query rebalance which renders rebalance card
    await page.click('.chat-launcher');
    await page.waitForSelector('#chat-input');
    await page.type('#chat-input', 'rebalance my portfolio');
    await page.click('.chat-send-btn');
    console.log('✔ Queried rebalance to render widget');

    // Wait for the rebalance card to show
    await page.waitForSelector('.chat-rebalance-card');
    console.log('✔ Rebalance widget rendered in chat');

    // Verify draft banner is present in card
    await page.waitForFunction(() => {
      const banner = document.querySelector('.rebalance-guardrail-banner');
      return banner && banner.textContent.includes('Draft Mode Active');
    }, { timeout: 4000 });
    console.log('✔ Draft Mode Banner verified on rebalance card');

    // Click "✦ Stage Rebalance Order"
    await page.click('#execute-rebalance-btn');
    console.log('✔ Clicked Stage Rebalance Order button');

    // Verify staged success state is shown
    await page.waitForFunction(() => {
      const title = document.querySelector('.rebalance-success-state h3');
      return title && title.textContent.includes('Trade Order Staged');
    }, { timeout: 4000 });
    console.log('✔ Verified staged success ticket with Reference ID');

    console.log('--- ALL E2E BROWSER TESTS PASSED ---');
    
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up browser and server...');
    await browser.close();
    if (serverInstance) {
      serverInstance.close();
      console.log('Server shutdown complete');
    }
  }
}

run();
