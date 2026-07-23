"use strict";

const state = {
  route: window.location.pathname,
  selectedAccountId: "core",
  allocationMode: "asset",
  portfolioTab: (() => {
    try {
      return (new URL(window.location.href)).searchParams.get("tab") || "allocation";
    } catch (e) {
      return "allocation";
    }
  })(),
  alertTab: "all",
  expandedAccounts: new Set(["elcie"]),
  visibleNumbers: new Set(),
  aiDetailsExpanded: false,
  includeExternalAccounts: false,
  governance: {
    safety: true,
    disclaimers: true,
    pii: true,
    rateLimiting: true,
    escalation: true,
    audit: true
  },
  aiSettings: (() => {
    const defaultSettings = {
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
      piiScrubbingEnabled: true,
    };
    try {
      if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
        const saved = localStorage.getItem("geap_ai_settings");
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch (e) {
      console.warn("Failed to load AI settings from localStorage:", e);
    }
    return defaultSettings;
  })()
};

const mockData = {
  user: {
    firstName: "Ken",
    lastLogin: "Jun 04, 2026, 8:07 PM ET",
    refreshedAt: "Jun 04, 2026, 10:19 PM ET"
  },
  totals: {
    totalAssets: "$48,912.74",
    dayGain: "+$318.22"
  },
  accounts: [
    {
      id: "main",
      label: "MAIN - Ind Brokerage",
      type: "Brokerage",
      masked: "-1864",
      full: "1864-7250",
      netValue: "$18,427.55",
      dayGain: "-$82.14 (-0.44%)",
      dayGainTone: "negative",
      available: "$1,284.63",
      cash: "$1,284.63",
      beneficiary: true,
      expanded: false,
      movers: [
        { symbol: "BAC", changePct: "3.26%", lastPrice: "$54.11", change: "$1.71", dayGain: "$1.71", tone: "positive" },
        { symbol: "KO", changePct: "-2.44%", lastPrice: "$76.84", change: "-$1.92", dayGain: "-$1.92", tone: "negative" },
        { symbol: "STRW", changePct: "0.32%", lastPrice: "$12.71", change: "$0.04", dayGain: "$0.12", tone: "positive" }
      ]
    },
    {
      id: "core",
      label: "CORE - Ind Brokerage",
      subtitle: "Core Portfolios",
      type: "Core Portfolios",
      masked: "-6408",
      full: "6408-2195",
      netValue: "$12,734.88",
      dayGain: "$56.41 (0.44%)",
      dayGainTone: "positive",
      available: "$246.19",
      cash: "$246.19",
      beneficiary: true,
      expanded: false,
      allocation: {
        totalMarketValue: "$12,734.88",
        unrealizedGain: "$1,842.77 (16.91%)",
        dayGain: "$56.41 (0.44%)",
        taxLoss: "$0.00",
        portfolioName: "Aggressive Growth (Smart Beta)",
        rows: [
          { label: "Equities", pct: "98.1%", value: "$12,492.12", tone: "purple" },
          { label: "Cash", pct: "1.9%", value: "$242.76", tone: "orange" }
        ]
      },
      movers: [
        { symbol: "RIVN", changePct: "-0.82%", lastPrice: "$18.12", change: "-$0.15", dayGain: "-$0.15", tone: "negative" },
        { symbol: "MBLY", changePct: "-1.86%", lastPrice: "$10.54", change: "-$0.20", dayGain: "-$0.20", tone: "negative" }
      ]
    },
    {
      id: "elcie",
      label: "Elcie - Cust UTMA/UGMA",
      type: "Custodial",
      masked: "-5297",
      full: "5297-4086",
      netValue: "$3,608.94",
      dayGain: "-$11.08 (-0.29%)",
      dayGainTone: "negative",
      available: "$318.45",
      cash: "$318.45",
      beneficiary: false,
      expanded: true,
      movers: [
        { symbol: "BAC", changePct: "3.26%", lastPrice: "$54.11", change: "$1.71", dayGain: "$1.71", tone: "positive" },
        { symbol: "KO", changePct: "-2.44%", lastPrice: "$76.84", change: "-$1.92", dayGain: "-$1.92", tone: "negative" },
        { symbol: "STRW", changePct: "0.32%", lastPrice: "$12.71", change: "$0.04", dayGain: "$0.12", tone: "positive" }
      ]
    },
    {
      id: "checking",
      label: "Checking",
      subtitle: "Morgan Stanley Private Bank",
      type: "Bank",
      masked: "-8152",
      full: "8152-6034",
      netValue: "$6,941.26",
      available: "$6,941.26",
      totalBalance: "$6,941.26",
      bank: true
    },
    {
      id: "individual",
      label: "Individual Brokerage",
      type: "Brokerage",
      masked: "-3379",
      full: "3379-9102",
      netValue: "$4,285.17",
      dayGain: "$18.95 (0.44%)",
      dayGainTone: "positive",
      available: "$764.12",
      cash: "$764.12",
      beneficiary: true,
      expanded: false
    },
    {
      id: "stock",
      label: "Stock Plan (MS)",
      type: "Stock Plan",
      masked: "-4926",
      full: "4926-1573",
      netValue: "$5,914.92",
      dayGain: "$136.78 (2.37%)",
      dayGainTone: "positive",
      benefit: "$0.00",
      expanded: false
    }
  ],
  sidePanels: {
    launchPad: [
      { title: "Morgan Stanley Online", detail: "Manage your wealth", action: "Launch" },
      { title: "Power E*TRADE Pro", detail: "Customizable desktop trading", action: "Launch" },
      { title: "Power E*TRADE web", detail: "Streaming browser-based trading", action: "Launch" },
      { title: "Paper Trading", detail: "Simulated trading in Power E*TRADE web", action: "Sign up" },
      { title: "Bloomberg TV", detail: "Live market news", action: "Launch" }
    ],
    alerts: [
      { title: "New IPO available", date: "Jun 04, 2026 6:05 PM ET", category: "symbol" },
      { title: "Dividend or interest paid", date: "Jun 03, 2026 11:54 PM ET", category: "account" },
      { title: "New IPO available", date: "Jun 03, 2026 6:05 PM ET", category: "symbol" },
      { title: "Dividend or interest paid", date: "Jun 02, 2026 2:24 AM ET", category: "account" },
      { title: "New IPO available", date: "Jun 01, 2026 6:05 PM ET", category: "symbol" }
    ]
  },
  watchList: [
    { symbol: "RIVN", lastPrice: "$18.12", changePct: "-0.82%", change: "-$0.15", volume: "35.16M", tone: "negative" },
    { symbol: "MBLY", lastPrice: "$10.54", changePct: "-1.86%", change: "-$0.20", volume: "4.87M", tone: "negative" }
  ],
  morganStanleyAccount: {
    name: "Premier CashPlus - 7306",
    assets: "$8,104.31",
    dayGain: "$0.00",
    dayGainPct: "0.00%"
  }
};

const originalMockData = JSON.parse(JSON.stringify(mockData));

function isShowDataEnabled() {
  const isLive = typeof BrokerageData !== 'undefined' && BrokerageData.getLiveMode && BrokerageData.getLiveMode();
  const isTest = (typeof window !== "undefined" && window.__e2e_test_active__) ||
    (typeof process !== "undefined" && (
      (process.env && (process.env.NODE_ENV === "test" || process.env.PORT === "3099")) ||
      (process.argv && process.argv.some(arg => arg.includes('test')))
    ));
  const isDemo = typeof window !== "undefined" && window.location && typeof window.location.search === "string" && window.location.search.includes("demo=true");
  return isLive || isTest || isDemo;
}
window.isShowDataEnabled = isShowDataEnabled;

function syncEtradeToMockData() {
  const isLive = typeof BrokerageData !== 'undefined' && BrokerageData.getLiveMode && BrokerageData.getLiveMode();
  if (isLive && BrokerageData.getLiveAccounts) {
    const liveAccounts = BrokerageData.getLiveAccounts();
    if (liveAccounts.length > 0) {
      // 0. Restore Morgan Stanley account if null
      if (!mockData.morganStanleyAccount) {
        mockData.morganStanleyAccount = JSON.parse(JSON.stringify(originalMockData.morganStanleyAccount));
      }

      // 1. Determine first name from live accounts (prevent "MAIN" or "CORE" default text)
      let firstName = "Ken";
      if (liveAccounts[0].accountName) {
        const firstWord = liveAccounts[0].accountName.split(" ")[0];
        if (firstWord !== "MAIN" && firstWord !== "CORE" && firstWord !== "E*TRADE") {
          firstName = firstWord;
        }
      }
      mockData.user.firstName = firstName;

      // 2. Aggregate totals across all live accounts
      let totalAssetsVal = liveAccounts.reduce((sum, acc) => sum + acc.totalValue, 0);
      let totalDayGainVal = liveAccounts.reduce((sum, acc) => sum + acc.dayChange, 0);

      if (state.includeExternalAccounts && mockData.morganStanleyAccount) {
        const msAssetsVal = parseFloat(mockData.morganStanleyAccount.assets.replace(/[^0-9.-]/g, '')) || 0;
        const msDayGainVal = parseFloat(mockData.morganStanleyAccount.dayGain.replace(/[^0-9.-]/g, '')) || 0;
        totalAssetsVal += msAssetsVal;
        totalDayGainVal += msDayGainVal;
      }

      mockData.totals.totalAssets = BrokerageData.formatCurrency(totalAssetsVal);
      mockData.totals.dayGain = `${BrokerageData.formatChange(totalDayGainVal)}`;

      // 3. Map all live accounts
      const liveAccountObjects = liveAccounts.map(liveAcc => {
        return {
          id: `etrade_${liveAcc.accountIdKey}`,
          label: liveAcc.accountName || liveAcc.accountType || "E*TRADE Brokerage",
          type: "Brokerage",
          masked: liveAcc.accountNumber || "",
          full: liveAcc.accountNumber || "",
          netValue: BrokerageData.formatCurrency(liveAcc.totalValue),
          dayGain: `${BrokerageData.formatChange(liveAcc.dayChange)} (${BrokerageData.formatPercent(liveAcc.dayChangePercent)})`,
          dayGainTone: liveAcc.dayChange >= 0 ? "positive" : "negative",
          available: BrokerageData.formatCurrency(liveAcc.buyingPower),
          cash: BrokerageData.formatCurrency(liveAcc.cashBalance),
          beneficiary: false,
          expanded: state.expandedAccounts.has(`etrade_${liveAcc.accountIdKey}`) || false,
          holdings: liveAcc.holdings,
          allocation: {
            totalMarketValue: BrokerageData.formatCurrency(liveAcc.totalValue - liveAcc.cashBalance),
            unrealizedGain: `${BrokerageData.formatChange(liveAcc.totalReturn)} (${BrokerageData.formatPercent(liveAcc.totalReturnPercent)})`,
            dayGain: `${BrokerageData.formatChange(liveAcc.dayChange)} (${BrokerageData.formatPercent(liveAcc.dayChangePercent)})`,
            taxLoss: "$0.00",
            portfolioName: "Live Portfolio",
            rows: Object.entries(liveAcc.sectorAllocation).map(([label, data]) => ({
              label: label,
              pct: BrokerageData.formatPercent(data.weight),
              value: BrokerageData.formatCurrency(data.value),
              tone: "purple"
            }))
          },
          movers: liveAcc.holdings.map(h => ({
            symbol: h.symbol,
            changePct: BrokerageData.formatPercent(h.dayChangePct),
            lastPrice: BrokerageData.formatCurrency(h.currentPrice),
            change: BrokerageData.formatChange(h.dayChange),
            dayGain: BrokerageData.formatChange(h.dayChangeTotal),
            tone: h.dayChange >= 0 ? "positive" : "negative"
          }))
        };
      });

      // 4. Overwrite mockData.accounts
      mockData.accounts = [
        ...liveAccountObjects,
        ...originalMockData.accounts.filter(a => a.bank || a.type === "Bank")
      ];

      // 5. Keep selectedAccountId pointing to a valid account
      if (state.selectedAccountId === "etrade_live" || !mockData.accounts.some(a => a.id === state.selectedAccountId)) {
        state.selectedAccountId = liveAccountObjects[0]?.id || "core";
      }
    }
  } else {
    const isTest = (typeof window !== "undefined" && window.__e2e_test_active__) || (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test");
    const isDemo = typeof window !== "undefined" && window.location && typeof window.location.search === "string" && window.location.search.includes("demo=true");

    if (isTest || isDemo) {
      mockData.user = JSON.parse(JSON.stringify(originalMockData.user));
      mockData.totals = JSON.parse(JSON.stringify(originalMockData.totals));
      mockData.accounts = JSON.parse(JSON.stringify(originalMockData.accounts));
      mockData.morganStanleyAccount = JSON.parse(JSON.stringify(originalMockData.morganStanleyAccount));

      if (state.includeExternalAccounts && mockData.morganStanleyAccount) {
        const baseAssets = parseFloat(originalMockData.totals.totalAssets.replace(/[^0-9.-]/g, '')) || 0;
        const msAssets = parseFloat(mockData.morganStanleyAccount.assets.replace(/[^0-9.-]/g, '')) || 0;
        mockData.totals.totalAssets = BrokerageData.formatCurrency(baseAssets + msAssets);

        const baseGain = parseFloat(originalMockData.totals.dayGain.replace(/[^0-9.-]/g, '')) || 0;
        const msGain = parseFloat(mockData.morganStanleyAccount.dayGain.replace(/[^0-9.-]/g, '')) || 0;
        mockData.totals.dayGain = BrokerageData.formatChange(baseGain + msGain);
      }

      if (state.selectedAccountId.startsWith("etrade_")) {
        state.selectedAccountId = "core";
      }
    } else {
      mockData.user = {
        firstName: "Ken",
        lastLogin: originalMockData.user.lastLogin,
        refreshedAt: originalMockData.user.refreshedAt
      };
      mockData.totals = {
        totalAssets: "$0.00",
        dayGain: "$0.00"
      };
      mockData.accounts = [];
      mockData.morganStanleyAccount = null;
      state.selectedAccountId = "";
    }
  }
}

const routeMeta = {
  "/": { section: "accounts", secondary: "/accounts", view: "dashboard" },
  "/accounts": { section: "accounts", secondary: "/accounts", view: "dashboard" },
  "/accounts/portfolios": { section: "accounts", secondary: "/accounts/portfolios", view: "portfolios" },
  "/accounts/watch-lists": { section: "accounts", secondary: "/accounts/watch-lists", view: "watch-lists", title: "Watch Lists" },
  "/accounts/orders": { section: "accounts", secondary: "/accounts/orders", view: "orders", title: "Orders" },
  "/accounts/balances": { section: "accounts", secondary: "/accounts/balances", view: "balances", title: "Balances" },
  "/accounts/activity": { section: "accounts", secondary: "/accounts/activity", view: "activity", title: "Activity" },
  "/accounts/banking": { section: "accounts", secondary: "/accounts/banking", view: "banking", title: "Banking" },
  "/accounts/tax-center": { section: "accounts", secondary: "/accounts/tax-center", view: "tax-center", title: "Tax Center" },
  "/accounts/documents": { section: "accounts", secondary: "/accounts/documents", view: "documents", title: "Documents" },
  "/accounts/dividend-reinvestment": { section: "accounts", secondary: "/accounts/dividend-reinvestment", view: "dividend-reinvestment", title: "Dividend Reinvestment" },
  "/accounts/open-account": { section: "accounts", secondary: "/accounts/open-account", view: "open-account", title: "Open Account" },
  "/pay-transfer": { section: "pay-transfer", view: "placeholder", title: "Pay & Transfer" },
  "/trading": { section: "trading", view: "placeholder", title: "Trading" },
  "/markets-ideas": { section: "markets-ideas", view: "placeholder", title: "Markets & Ideas" },
  "/at-work": { section: "at-work", view: "placeholder", title: "At Work" },
  "/planning": { section: "planning", view: "planning", title: "Planning & Retirement" },
  "/what-we-offer": { section: "what-we-offer", view: "placeholder", title: "What We Offer" },
  "/support": { section: "support", view: "placeholder", title: "Support" },
  "/alerts": { section: "accounts", view: "placeholder", title: "Alerts" },
  "/documents": { section: "accounts", view: "placeholder", title: "Documents" },
  "/profile": { section: "accounts", view: "placeholder", title: "Profile" },
  "/search": { section: "accounts", view: "search", title: "Search" },
  "/ai-insights": { section: "ai-insights", view: "ai-insights", title: "AI Insights Hub" },
  "/agent-studio": { section: "geap-admin", view: "agent-studio", title: "Agent Studio" },
  "/agent-fabric": { section: "geap-admin", view: "agent-fabric", title: "Agent Fabric" },
  "/ai-settings": { section: "ai-settings", view: "ai-settings", title: "AI Settings" }
};

const app = document.querySelector("#app");
const primaryNav = document.querySelector(".primary-nav");
const mobileMenuButton = document.querySelector(".mobile-menu-button");
const chatLauncher = document.querySelector(".chat-launcher");
const agentPanel = document.querySelector("#agent-panel");

function moneyToneClass(tone) {
  if (tone === "positive") return "positive";
  if (tone === "negative") return "negative";
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMeta(path = state.route) {
  return routeMeta[path] || routeMeta["/accounts"];
}

function routeTo(path, replace = false) {
  const cleanPath = path || "/accounts";
  const url = new URL(cleanPath, window.location.origin);
  state.route = url.pathname;

  if (url.pathname === "/accounts/portfolios") {
    state.portfolioTab = url.searchParams.get("tab") || "allocation";
  }

  if (replace) {
    window.history.replaceState({}, "", cleanPath);
  } else {
    window.history.pushState({}, "", cleanPath);
  }
  closeMenus();
  closeMobileMenu();
  render();
  window.scrollTo(0, 0);
}

function setActiveNavigation() {
  const meta = getMeta();

  document.querySelectorAll("[data-section]").forEach((link) => {
    if (link.dataset.section === meta.section) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll(".secondary-nav a[data-route]").forEach((link) => {
    if (link.getAttribute("href") === (meta.secondary || state.route)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  // Toggle GEAP vs Accounts secondary nav
  const accountsNav = document.querySelector(".secondary-nav:not(.geap-secondary-nav)");
  const geapNav = document.getElementById("geap-secondary-nav");
  if (accountsNav && geapNav) {
    if (meta.section === "geap-admin") {
      accountsNav.hidden = true;
      geapNav.hidden = false;
    } else if (meta.section === "accounts") {
      accountsNav.hidden = false;
      geapNav.hidden = true;
    } else {
      accountsNav.hidden = true;
      geapNav.hidden = true;
    }
  }
}

function render() {
  if (typeof syncEtradeToMockData === "function") {
    syncEtradeToMockData();
  }
  const meta = getMeta();
  setActiveNavigation();

  // Clean up agent fabric if leaving that view
  if (meta.view !== "agent-fabric" && typeof AgentFabric !== "undefined") {
    AgentFabric.cleanup();
  }

  if (meta.view === "dashboard") {
    app.innerHTML = renderDashboard();
  } else if (meta.view === "portfolios") {
    if (typeof renderPortfolios === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading Portfolios...</div>`;
      if (typeof window !== "undefined" && window.ensureScript) {
        window.ensureScript("/js/portfolios.js?v=0.1.0", () => {
          if (getMeta().view === "portfolios") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = renderPortfolios();
  } else if (meta.view === "planning") {
    if (typeof renderPlanning === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading Planning...</div>`;
      if (typeof window !== "undefined" && window.ensureScript) {
        window.ensureScript("/js/planning.js?v=0.1.0", () => {
          if (getMeta().view === "planning") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = renderPlanning();
  } else if (meta.view === "search") {
    app.innerHTML = renderSearch();
  } else if (meta.view === "ai-insights") {
    if (typeof AIInsightsPage === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading AI Insights...</div>`;
      if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
        window.ensureStyle("/css/insights.min.css?v=0.1.0");
        window.ensureScript("/js/insights.js?v=0.1.0", () => {
          if (getMeta().view === "ai-insights") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = AIInsightsPage.renderView();
    AIInsightsPage.bindEvents();
  } else if (meta.view === "agent-studio") {
    if (typeof AgentStudio === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading Agent Studio...</div>`;
      if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
        window.ensureStyle("/css/agent-studio.min.css?v=0.1.0");
        window.ensureScript("/js/agent-studio.js?v=0.1.0", () => {
          if (getMeta().view === "agent-studio") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = AgentStudio.renderView();
    AgentStudio.bindEvents();
  } else if (meta.view === "agent-fabric") {
    if (typeof AgentFabric === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading Agent Fabric...</div>`;
      if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
        window.ensureStyle("/css/agent-fabric.min.css?v=0.1.0");
        window.ensureScript("/js/agent-fabric.js?v=0.1.0", () => {
          if (getMeta().view === "agent-fabric") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = AgentFabric.renderView();
    AgentFabric.bindEvents();
  } else if (meta.view === "ai-settings") {
    if (typeof renderAISettings === "undefined") {
      app.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 1.1rem; font-weight: 500;">Loading AI Settings...</div>`;
      if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
        window.ensureStyle("/css/settings.min.css?v=0.1.0");
        window.ensureScript("/js/settings.js?v=0.1.0", () => {
          if (getMeta().view === "ai-settings") {
            render();
          }
        });
      }
      return;
    }
    app.innerHTML = renderAISettings();
    bindAISettingsEvents();
  } else {
    app.innerHTML = renderPlaceholder(meta.title || "Mock Page");
  }

  bindViewEvents();

  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
    });
  } else {
    app.focus({ preventScroll: true });
  }
}

function renderDashboard() {
  const showData = isShowDataEnabled();
  const brokerageAccounts = mockData.accounts.filter((account) => !account.bank);
  const driver = typeof BrokerageData !== 'undefined' ? [...BrokerageData.holdings].sort((a, b) => Math.abs(b.dayChangeTotal) - Math.abs(a.dayChangeTotal))[0] : null;
  const mainAccount = brokerageAccounts[0];

  const isDown = typeof BrokerageData !== 'undefined' && BrokerageData.account && BrokerageData.account.dayChange < 0;
  const dayGainText = mockData.totals.dayGain || "$0.00";
  const dayGainPctText = typeof BrokerageData !== 'undefined' && BrokerageData.account ? BrokerageData.formatPercent(BrokerageData.account.dayChangePercent) : "+0.65%";
  const portfolioStatus = isDown ? "Portfolio down" : "Portfolio up";
  const driverSymbol = driver ? driver.symbol : 'GSLC';

  return `
    <section class="dashboard-hero ${state.aiDetailsExpanded ? 'dashboard-hero--connected' : ''}">
      <div class="shell">
        <div class="dashboard-controls">
          <div class="welcome">
            ${showData ? `
              <h1>Welcome, ${mockData.user.firstName}</h1>
              <p>Last login: ${mockData.user.lastLogin}</p>
            ` : `
              <h1 style="display: flex; align-items: center; gap: 8px;">Welcome, <span class="geap-skeleton-title" style="width: 140px;"></span></h1>
              <p style="margin-top: 6px;"><span class="geap-skeleton-text" style="width: 220px;"></span></p>
            `}
            <div class="metric-row">
              <div class="metric">
                <span>Total Assets</span>
                ${showData ? `
                  <strong>${mockData.totals.totalAssets}</strong>
                ` : `
                  <div style="margin-top: 4px;"><span class="geap-skeleton-title" style="width: 130px;"></span></div>
                `}
                <a href="/accounts/portfolios" data-route class="metric__link">View details →</a>
              </div>
              <div class="metric">
                <span>Day's Gain</span>
                ${showData ? `
                  <div class="metric__value-row">
                    <div class="metric__value-text">
                      <strong class="positive">${mockData.totals.dayGain}</strong>
                      <span class="metric__pct positive">(0.65%)</span>
                    </div>
                  </div>
                ` : `
                  <div style="margin-top: 4px;"><span class="geap-skeleton-title" style="width: 150px;"></span></div>
                `}
                <a href="/accounts/portfolios" data-route class="metric__link">View performance →</a>
              </div>
            </div>
          </div>

          <div class="markets-ai-card ${state.aiDetailsExpanded ? 'markets-ai-card--connected' : ''}">
            <div class="markets-ai-card__header" style="border-bottom: none; padding-bottom: 0;">
              <div class="markets-ai-card__brand" style="display: flex; align-items: center; gap: 8px; margin-bottom: 0;">
                <span class="markets-ai-card__star" style="color: #6B2D9B; font-size: 1.1rem; line-height: 1;">✦</span>
                <span style="font-weight: 700; font-size: 0.95rem; color: #1a1a2e;">GEAP Agent Briefing</span>
                <span style="color: #64748b; font-size: 0.78rem; font-weight: 400; margin-left: 4px;">Since Jun 8</span>
              </div>
              <button class="markets-ai-card__toggle-btn" type="button" aria-expanded="${state.aiDetailsExpanded}" aria-label="Toggle AI Details">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chevron-icon" style="transform: ${state.aiDetailsExpanded ? 'rotate(0deg)' : 'rotate(180deg)'}; transition: transform 0.2s;">
                  <path d="M2 8L6 4L10 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div class="markets-ai-card__content" style="margin-top: 12px;">
              ${showData ? `
                <div class="markets-ai-card__grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 4px 0; border-bottom: none;">
                  <!-- Column 1: Harvestable Losses -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 2px; border-right: 1px solid #cbd5e1; padding-right: 12px; text-align: left;">
                    <span style="font-size: 16px; font-weight: 800; color: #137a27; line-height: 1.25;">$132</span>
                    <span style="font-size: 12px; font-weight: 700; color: #1f2937;">Harvestable Losses</span>
                    <span style="font-size: 10px; color: #64748b;">Tax Specialist</span>
                  </div>
                  <!-- Column 2: MSFT Exposure -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 2px; border-right: 1px solid #cbd5e1; padding-right: 12px; padding-left: 8px; text-align: left;">
                    <span style="font-size: 16px; font-weight: 800; color: #d97706; line-height: 1.25;">15.9%</span>
                    <span style="font-size: 12px; font-weight: 700; color: #1f2937;">MSFT Exposure</span>
                    <span style="font-size: 10px; color: #64748b;">Risk Watchdog</span>
                  </div>
                  <!-- Column 3: Diagnostics Passed -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 2px; border-right: 1px solid #cbd5e1; padding-right: 12px; padding-left: 8px; text-align: left;">
                    <span style="font-size: 16px; font-weight: 800; color: #0669d8; line-height: 1.25;">12</span>
                    <span style="font-size: 12px; font-weight: 700; color: #1f2937;">Diagnostics Passed</span>
                    <span style="font-size: 10px; color: #64748b;">System Health</span>
                  </div>
                  <!-- Column 4: Portfolio up/down -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 2px; padding-left: 8px; text-align: left;">
                    <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">${portfolioStatus}</span>
                    <span style="font-size: 0.85rem; font-weight: 700; color: #111827; margin: 1px 0;">${dayGainPctText} (${dayGainText})</span>
                    <span style="font-size: 0.72rem; color: #64748b;">Led by <strong style="color: #0669d8; font-weight: 700;">${driverSymbol}</strong></span>
                  </div>
                </div>
              ` : `
                <div class="markets-ai-card__grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 4px 0; border-bottom: none;">
                  <!-- Column 1: skeleton -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #cbd5e1; padding-right: 12px;">
                    <span class="geap-skeleton-title" style="width: 50px; height: 20px;"></span>
                    <span class="geap-skeleton-text" style="width: 80px; height: 10px;"></span>
                    <span class="geap-skeleton-text" style="width: 60px; height: 8px;"></span>
                  </div>
                  <!-- Column 2: skeleton -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #cbd5e1; padding-right: 12px; padding-left: 8px;">
                    <span class="geap-skeleton-title" style="width: 55px; height: 20px;"></span>
                    <span class="geap-skeleton-text" style="width: 75px; height: 10px;"></span>
                    <span class="geap-skeleton-text" style="width: 60px; height: 8px;"></span>
                  </div>
                  <!-- Column 3: skeleton -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #cbd5e1; padding-right: 12px; padding-left: 8px;">
                    <span class="geap-skeleton-title" style="width: 30px; height: 20px;"></span>
                    <span class="geap-skeleton-text" style="width: 90px; height: 10px;"></span>
                    <span class="geap-skeleton-text" style="width: 60px; height: 8px;"></span>
                  </div>
                  <!-- Column 4: skeleton -->
                  <div class="markets-ai-card__col" style="display: flex; flex-direction: column; gap: 6px; padding-left: 8px;">
                    <span class="geap-skeleton-text" style="width: 70px; height: 10px;"></span>
                    <span class="geap-skeleton-title" style="width: 95px; height: 18px;"></span>
                    <span class="geap-skeleton-text" style="width: 50px; height: 8px;"></span>
                  </div>
                </div>
              `}
            </div>
          </div>

          <div class="dashboard-actions">
            <button class="text-button" type="button" data-refresh>Refresh <span>${showData ? mockData.user.refreshedAt : '<span class="geap-skeleton-text" style="width: 120px; height: 10px; margin-left: 4px;"></span>'}</span></button>
            <button class="outline-button" type="button">Add external accounts</button>
            <label class="switch">Include external accounts <input type="checkbox" id="include-external-toggle" ${state.includeExternalAccounts ? 'checked' : ''}><span aria-hidden="true"></span></label>
            <div class="dashboard-actions__row" style="justify-content: flex-end; gap: 8px;">
              <button class="text-button" type="button">⚙ Customize</button>
              <span class="separator">|</span>
              <a href="/accounts" data-route>Learn More <span class="insights-info-icon">ⓘ</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="ai-details-section ${state.aiDetailsExpanded ? '' : 'ai-details-section--collapsed'}" id="ai-details-panel">
      <div class="ai-details-inner">
        ${typeof InsightsEngine !== 'undefined' ? InsightsEngine.renderInsightsStrip() : ''}
      </div>
    </section>

    <section class="page-band page-band--gray">
      <div class="shell content-grid">
        <div class="account-stack">
          ${showData
      ? (brokerageAccounts.length > 0
        ? brokerageAccounts.map(renderAccountCard).join("")
        : `
                  <div class="empty-state-card" style="background: var(--panel); border: 1px solid var(--line); padding: 3rem 2rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; box-shadow: 0 2px 12px rgba(0,0,0,0.02);">
                    <div style="font-size: 3rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));">🔌</div>
                    <h3 style="margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--purple-bright);">E*TRADE Connection Required</h3>
                    <p style="color: var(--muted); margin: 0; max-width: 420px; font-size: 0.9rem; line-height: 1.6;">
                      Your brokerage accounts, portfolios, holdings, and transactions are currently offline. Connect your E*TRADE account to load and analyze your real portfolio.
                    </p>
                    <button class="button etrade-connect-prompt-btn" type="button" style="margin-top: 0.5rem; border-radius: 6px; padding: 10px 24px; font-size: 0.85rem; font-weight: 700; border: none; box-shadow: 0 4px 12px rgba(109,40,217,0.25);">🔌 Connect E*TRADE Account</button>
                  </div>
                `
      )
      : `
              <article class="account-card">
                <div class="account-card__top">
                  <div>
                    <p><span class="geap-skeleton-text" style="width: 80px;"></span></p>
                    <h2 class="account-title" style="display: flex; gap: 8px; align-items: center;">
                      <span class="geap-skeleton-text" style="width: 140px; height: 18px;"></span>
                      <span class="geap-skeleton-text" style="width: 80px; height: 18px;"></span>
                    </h2>
                  </div>
                  <div class="account-metrics">
                    <div class="metric-line">
                      <span class="geap-skeleton-text" style="width: 100px;"></span>
                      <span class="geap-skeleton-text" style="width: 70px;"></span>
                    </div>
                    <div class="metric-line">
                      <span class="geap-skeleton-text" style="width: 80px;"></span>
                      <span class="geap-skeleton-text" style="width: 60px;"></span>
                    </div>
                  </div>
                </div>
                <div class="account-card__links" style="margin-top: 20px;">
                  <span class="geap-skeleton-text" style="width: 120px;"></span>
                  <span class="separator">|</span>
                  <span class="geap-skeleton-text" style="width: 100px;"></span>
                </div>
              </article>
              <article class="account-card">
                <div class="account-card__top">
                  <div>
                    <p><span class="geap-skeleton-text" style="width: 70px;"></span></p>
                    <h2 class="account-title" style="display: flex; gap: 8px; align-items: center;">
                      <span class="geap-skeleton-text" style="width: 120px; height: 18px;"></span>
                      <span class="geap-skeleton-text" style="width: 60px; height: 18px;"></span>
                    </h2>
                  </div>
                  <div class="account-metrics">
                    <div class="metric-line">
                      <span class="geap-skeleton-text" style="width: 110px;"></span>
                      <span class="geap-skeleton-text" style="width: 80px;"></span>
                    </div>
                    <div class="metric-line">
                      <span class="geap-skeleton-text" style="width: 70px;"></span>
                      <span class="geap-skeleton-text" style="width: 50px;"></span>
                    </div>
                  </div>
                </div>
                <div class="account-card__links" style="margin-top: 20px;">
                  <span class="geap-skeleton-text" style="width: 110px;"></span>
                  <span class="separator">|</span>
                  <span class="geap-skeleton-text" style="width: 90px;"></span>
                </div>
              </article>
            `
    }
          ${renderMorganStanleyAccounts()}
          ${renderWatchListSnapshot()}
        </div>
        <aside class="side-rail">
          ${renderHoldingsOverview()}
          ${renderDashboardSectorAlloc()}
          ${renderRecentActivity()}
          ${renderTeamSummaryCard()}
          ${renderSupportPanel()}
          ${renderLaunchPad()}
          ${renderAlertsPanel()}
        </aside>
      </div>
    </section>
    ${renderDisclosures()}
  `;
}

function renderHoldingsOverview() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 120px;"></span></h3>
        <p class="portfolio-summary-card__sub"><span class="geap-skeleton-text" style="width: 180px;"></span></p>
        <div class="holdings-overview">
          <svg class="holdings-donut" width="90" height="90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="30" fill="none" stroke="#e2e8f0" stroke-width="8" class="geap-skeleton-circle" style="animation: geapPulse 1.5s infinite ease-in-out;"></circle>
          </svg>
          <div class="holdings-list" style="display: flex; flex-direction: column; gap: 8px;">
            <div class="holdings-list__header"><span class="geap-skeleton-text" style="width: 80px;"></span></div>
            <div class="holdings-list__row"><span class="geap-skeleton-text" style="width: 100px;"></span></div>
            <div class="holdings-list__row"><span class="geap-skeleton-text" style="width: 120px;"></span></div>
          </div>
        </div>
      </div>
    `;
  }

  const holdings = BrokerageData.holdings;
  if (!holdings || holdings.length === 0) {
    return `
      <div class="portfolio-summary-card">
        <h3>Holdings Overview</h3>
        <p class="portfolio-summary-card__sub" style="margin-bottom: 0;">No active holdings to display.</p>
      </div>
    `;
  }
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const top3 = sorted.slice(0, 3);
  const totalVal = holdings.reduce((s, h) => s + h.marketValue, 0);

  // Build donut chart segments
  const sectors = BrokerageData.sectorAllocation;
  const sectorEntries = Object.entries(sectors).sort((a, b) => b[1].weight - a[1].weight);
  const colors = ['#6B2D9B', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  let cum = 0;
  const donutSlices = sectorEntries.map((entry, i) => {
    const [, data] = entry;
    const start = cum * 3.6;
    cum += data.weight;
    const end = cum * 3.6;
    if (data.weight >= 99.9) {
      return `<circle cx="50" cy="50" r="35" fill="${colors[i % colors.length]}" opacity="0.85"/>`;
    }
    const large = (end - start) > 180 ? 1 : 0;
    const sr = (start - 90) * Math.PI / 180;
    const er = (end - 90) * Math.PI / 180;
    const x1 = 50 + 35 * Math.cos(sr), y1 = 50 + 35 * Math.sin(sr);
    const x2 = 50 + 35 * Math.cos(er), y2 = 50 + 35 * Math.sin(er);
    return `<path d="M50,50 L${x1},${y1} A35,35 0 ${large},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.85"/>`;
  }).join('');

  const logoSVGs = {
    MSFT: `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 6px; flex-shrink: 0; align-self: center;">
          <rect x="0" y="0" width="7" height="7" fill="#F25022"/>
          <rect x="9" y="0" width="7" height="7" fill="#7FBA00"/>
          <rect x="0" y="9" width="7" height="7" fill="#00A4EF"/>
          <rect x="9" y="9" width="7" height="7" fill="#FFB900"/>
        </svg>
      `,
    NVDA: `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 6px; flex-shrink: 0; align-self: center;">
          <path d="M8 1a7 7 0 0 0-7 7c0 3.87 3.13 7 7 7 2.2 0 4.18-1.02 5.48-2.62l-1.63-1.06A5.02 5.02 0 0 1 8 13a5 5 0 0 1-5-5 5 5 0 0 1 5-5c1.47 0 2.8.64 3.72 1.66l1.64-1.06A6.97 6.97 0 0 0 8 1z" fill="#76B900"/>
          <path d="M8 4a4 4 0 0 0-4 4c0 2.2 1.8 4 4 4 .96 0 1.84-.34 2.53-.91L8.91 9.47A1.5 1.5 0 1 1 8 6.5c.34 0 .65.11.91.3l1.62-1.62A3.97 3.97 0 0 0 8 4z" fill="#76B900"/>
        </svg>
      `,
    AAPL: `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px; flex-shrink: 0; align-self: center; color: #000;">
          <path d="M12.28 10.45c-.48.73-.99 1.45-1.81 1.47-.81.02-1.07-.48-2-.48-.93 0-1.22.46-2 .5-.8.03-1.39-.78-1.87-1.5-1-1.46-1.76-4.13-.74-5.91.51-.88 1.41-1.44 2.4-1.45.75-.01 1.46.51 1.92.51.46 0 1.34-.64 2.25-.55.38.02 1.46.16 2.15 1.17-.06.03-1.29.75-1.28 2.22 0 1.76 1.53 2.38 1.55 2.4-.01.04-.24.84-.8 1.62zM9.82 2.65c.4-.5.67-1.19.6-1.87-.58.02-1.29.39-1.7.88-.36.4-.67 1.11-.6 1.79.65.05 1.3-.3 1.7-.8z"/>
        </svg>
      `
  };

  return `
    <div class="portfolio-summary-card">
      <h3>Holdings Overview</h3>
      <p class="portfolio-summary-card__sub">See your top holdings and allocation.</p>
      <div class="holdings-overview">
        <svg class="holdings-donut" width="90" height="90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="25" fill="#fff"/>
          ${donutSlices}
          <circle cx="50" cy="50" r="22" fill="#fff"/>
        </svg>
        <div class="holdings-list">
          <div class="holdings-list__header">Top 3 holdings</div>
          ${top3.map(h => `
            <div class="holdings-list__row">
              ${logoSVGs[h.symbol] || '<span class="holdings-list__icon">●</span>'}
              <span class="holdings-list__name">${h.name}</span>
              <span class="holdings-list__pct">${h.weight.toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
      <a href="/accounts/portfolios" data-route class="portfolio-summary-card__link">View full portfolio →</a>
    </div>`;
}

function renderDashboardSectorAlloc() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 140px;"></span></h3>
        <p class="portfolio-summary-card__sub"><span class="geap-skeleton-text" style="width: 160px;"></span></p>
        <div class="sector-bars">
          ${[1, 2, 3].map(() => `
            <div class="sector-bar-row">
              <span class="sector-bar-row__name"><span class="geap-skeleton-text" style="width: 80px;"></span></span>
              <div class="sector-bar-row__track">
                <div class="sector-bar-row__fill geap-skeleton-text" style="width: 100%; height: 100%; border-radius: 4px;"></div>
              </div>
              <span class="sector-bar-row__pct"><span class="geap-skeleton-text" style="width: 30px;"></span></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const sectors = BrokerageData.sectorAllocation;
  if (!sectors || Object.keys(sectors).length === 0) {
    return `
      <div class="portfolio-summary-card">
        <h3>Allocation by Sector</h3>
        <p class="portfolio-summary-card__sub" style="margin-bottom: 0;">No sector allocation data available.</p>
      </div>
    `;
  }
  const entries = Object.entries(sectors).sort((a, b) => b[1].weight - a[1].weight);
  // Show top 4 sectors + combine rest as "Other"
  const top4 = entries.slice(0, 4);
  const otherWeight = entries.slice(4).reduce((s, [, d]) => s + d.weight, 0);

  const barColor = '#6B2D9B';

  return `
    <div class="portfolio-summary-card">
      <h3>Allocation by Sector</h3>
      <p class="portfolio-summary-card__sub">See how your portfolio is allocated.</p>
      <div class="sector-bars">
        ${top4.map(([name, data]) => `
          <div class="sector-bar-row">
            <span class="sector-bar-row__name">${name}</span>
            <div class="sector-bar-row__track">
              <div class="sector-bar-row__fill" style="width: ${data.weight}%; background: ${barColor};"></div>
            </div>
            <span class="sector-bar-row__pct">${data.weight.toFixed(0)}%</span>
          </div>
        `).join('')}
        ${otherWeight > 0 ? `
          <div class="sector-bar-row">
            <span class="sector-bar-row__name">Other</span>
            <div class="sector-bar-row__track">
              <div class="sector-bar-row__fill" style="width: ${otherWeight}%; background: ${barColor};"></div>
            </div>
            <span class="sector-bar-row__pct">${otherWeight.toFixed(0)}%</span>
          </div>
        ` : ''}
      </div>
      <a href="/accounts/portfolios" data-route class="portfolio-summary-card__link">View allocation details →</a>
    </div>`;
}

function renderRecentActivity() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 110px;"></span></h3>
        <p class="portfolio-summary-card__sub"><span class="geap-skeleton-text" style="width: 150px;"></span></p>
        <div class="recent-activity-list">
          ${[1, 2, 3].map(() => `
            <div class="recent-activity-row" style="display: flex; gap: 12px; align-items: center; justify-content: space-between;">
              <span class="geap-skeleton-text" style="width: 120px;"></span>
              <span class="geap-skeleton-text" style="width: 50px;"></span>
              <span class="geap-skeleton-text" style="width: 60px;"></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const txns = BrokerageData.transactions;
  if (!txns || txns.length === 0) {
    return `
      <div class="portfolio-summary-card">
        <h3>Recent Activity</h3>
        <p class="portfolio-summary-card__sub">View your latest account activity.</p>
        <p class="portfolio-summary-card__sub" style="margin-bottom: 0;">No recent activity.</p>
      </div>
    `;
  }
  const slicedTxns = txns.slice(0, 3);
  return `
    <div class="portfolio-summary-card">
      <h3>Recent Activity</h3>
      <p class="portfolio-summary-card__sub">View your latest account activity.</p>
      <div class="recent-activity-list">
        ${slicedTxns.map(t => {
    const isPositive = t.type === 'DIVIDEND' || t.type === 'DEPOSIT';
    const sign = isPositive ? '+' : '-';
    return `
            <div class="recent-activity-row">
              <span class="recent-activity-row__desc">${t.description || t.type.charAt(0) + t.type.slice(1).toLowerCase() + (t.symbol ? ' ' + t.symbol : '')}</span>
              <span class="recent-activity-row__date">${t.date}</span>
              <span class="recent-activity-row__amt ${isPositive ? 'positive' : 'negative'}">${sign}$${Math.abs(t.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>`;
  }).join('')}
      </div>
      <a href="/accounts/activity" data-route class="portfolio-summary-card__link">View all activity →</a>
    </div>`;
}

function renderTeamSummaryCard() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 140px;"></span></h3>
        <div class="team-summary">
          <div class="team-summary__info" style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <span class="geap-skeleton-text" style="width: 110px;"></span>
            <span class="geap-skeleton-text" style="width: 130px;"></span>
            <span class="geap-skeleton-text" style="width: 90px;"></span>
          </div>
          <span class="geap-skeleton-circle" style="width: 44px; height: 44px; display: inline-block;"></span>
        </div>
      </div>`;
  }

  return `
    <div class="portfolio-summary-card">
      <h3>Morgan Stanley Team</h3>
      <div class="team-summary">
        <div class="team-summary__info">
          <p>Financial Advisor</p>
          <p><strong>VIRTUAL ADVISOR</strong></p>
          <a href="tel:888-454-0555" class="team-summary__phone">888-454-0555</a>
        </div>
        <div class="team-summary__avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6B2D9B;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>
      <a href="/accounts" data-route class="portfolio-summary-card__link">View all team members →</a>
    </div>`;
}

function renderAccountCard(account) {
  const isVisible = state.visibleNumbers.has(account.id);
  const isExpanded = state.expandedAccounts.has(account.id);
  const number = isVisible ? account.full : account.masked;
  const details = account.bank ? renderBankMetrics(account) : renderBrokerageMetrics(account);
  const body = account.bank ? renderBankAccountBody(account, number) : renderBrokerageAccountBody(account, number, isExpanded, details);

  return `
    <article class="account-card" data-account-card="${account.id}">
      ${body}
    </article>
  `;
}

function renderBrokerageAccountBody(account, number, isExpanded, metrics) {
  return `
    <div class="account-card__top">
      <div>
        ${account.subtitle ? `<p>${account.subtitle}</p>` : ""}
        <h2 class="account-title">
          <strong>${account.label}</strong>
          <em>${number}</em>
          <button type="button" class="link-button" data-toggle-number="${account.id}">${state.visibleNumbers.has(account.id) ? "Hide number" : "Show number"}</button>
        </h2>
        ${account.beneficiary ? renderBeneficiary() : ""}
      </div>
      ${metrics}
    </div>

    <div class="account-card__links">
      ${account.id !== "stock" ? `<button type="button" class="card-action" data-toggle-account="${account.id}">${isExpanded ? "v" : ">"} Portfolio snapshot</button><span class="separator">|</span>` : ""}
      <a href="/accounts/orders" data-route>Open orders (0)</a>
      <span class="separator">|</span>
      <button type="button" class="link-button">Quick links ...</button>
      <span class="separator">|</span>
      <button type="button" class="link-button card-ai-analyzer-btn" data-account-id="${account.id}" style="color: var(--purple-bright); font-weight: 600;">✦ AI Analyzer</button>
    </div>

    ${isExpanded && account.movers ? renderMovers(account) : ""}
  `;
}

function renderBrokerageMetrics(account) {
  const rows = [
    ["Net Account Value", account.netValue, ""],
    ["Day's Gain", account.dayGain, account.dayGainTone],
    ["Available for Withdrawal", account.available, ""],
    ["Cash Purchasing Power", account.cash, ""]
  ];

  if (account.id === "stock") {
    rows[0] = ["Current Account Value", account.netValue, ""];
    rows[2] = ["Potential Benefit Value", account.benefit, ""];
    rows.length = 3;
  }

  return `
    <div class="account-metrics">
      ${rows
      .map(
        ([label, value, tone]) => `
      <div class="metric-line">
        <span>${label}</span>
        <strong class="${moneyToneClass(tone)}">${value || ""}</strong>
      </div>
          `
      )
      .join("")}
      <button type="button" class="text-button" data-toggle-account="${account.id}">${state.expandedAccounts.has(account.id) ? "Show less" : "Show more"}</button>
    </div>
  `;
}

function renderBankAccountBody(account, number) {
  return `
    <div class="account-card__top">
      <div>
        <p>${account.subtitle}</p>
        <h2 class="account-title">
          <strong>${account.label}</strong>
          <em>${number}</em>
          <button type="button" class="link-button" data-toggle-number="${account.id}">${state.visibleNumbers.has(account.id) ? "Hide number" : "Show number"}</button>
        </h2>
      </div>
      ${renderBankMetrics(account)}
    </div>
    <div class="account-card__links">
      <a href="/pay-transfer" data-route>Transfer money</a>
      <span class="separator">|</span>
      <button type="button" class="link-button">Quick links ...</button>
      <span class="separator">|</span>
      <button type="button" class="link-button card-ai-analyzer-btn" data-account-id="${account.id}" style="color: var(--purple-bright); font-weight: 600;">✦ AI Analyzer</button>
      <span class="separator">FDIC Insured - Backed by the full faith and credit of the U.S. Government</span>
    </div>
  `;
}

function renderBankMetrics(account) {
  return `
    <div class="account-metrics">
      <div class="metric-line">
        <span>Available Balance</span>
        <strong>${account.available}</strong>
      </div>
      <div class="metric-line">
        <span>Total Balance</span>
        <strong>${account.totalBalance}</strong>
      </div>
    </div>
  `;
}

function renderBeneficiary() {
  return `
    <div class="beneficiary">
      <span class="notice__icon">i</span>
      <div>
        You don't have a beneficiary for your account.
        <div><a href="/profile" data-route>Add beneficiary</a> <span class="separator">|</span> <button type="button" class="link-button">Set reminder</button></div>
      </div>
    </div>
  `;
}

function renderMovers(account) {
  return `
    <div class="mini-tabs" role="tablist" aria-label="${account.label} portfolio snapshot">
      <button type="button" role="tab" aria-selected="true">Top Movers (${account.movers.length})</button>
      <button type="button" role="tab" aria-selected="false">Portfolio News</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th></th>
            <th>Change %</th>
            <th>Last Price $</th>
            <th>Change $</th>
            <th>Day's Gain $</th>
          </tr>
        </thead>
        <tbody>
          ${account.movers
      .map(
        (mover) => `
              <tr>
                <td><a href="/trading" data-route>${mover.symbol}</a></td>
                <td><button class="outline-button" type="button">Trade</button></td>
                <td class="${moneyToneClass(mover.tone)}">${mover.changePct}</td>
                <td>${mover.lastPrice}</td>
                <td class="${moneyToneClass(mover.tone)}">${mover.change}</td>
                <td class="${moneyToneClass(mover.tone)}">${mover.dayGain}</td>
              </tr>
            `
      )
      .join("")}
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <span>${account.movers.length} Total <span class="separator">|</span> <a href="/accounts/portfolios" data-route>View full portfolio</a></span>
      <span>Market Closed Jun 04, 2026, 4:00 PM ET</span>
    </div>
  `;
}

function renderTeamPanel() {
  return `
    <section class="side-panel">
      <h2>v Morgan Stanley Team</h2>
      <p>Financial Advisor<br><strong>VIRTUAL ADVISOR</strong><br><a href="tel:8884540555">888-454-0555</a></p>
      <hr>
      <p><a href="/planning" data-route>View all</a></p>
    </section>
  `;
}

function renderSupportPanel() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 180px;"></span></h3>
        <p class="portfolio-summary-card__sub"><span class="geap-skeleton-text" style="width: 200px;"></span></p>
        <div style="margin-top: 12px;"><span class="geap-skeleton-text" style="width: 140px; height: 18px;"></span></div>
      </div>
    `;
  }

  return `
    <div class="portfolio-summary-card">
      <h3>Core Portfolios Support Team</h3>
      <p class="portfolio-summary-card__sub">Dedicated customer support specialist line.</p>
      <div style="margin-top: 12px; font-weight: 700; font-size: 1.1rem;">
        <a href="tel:8664843658" style="color: #6B2D9B; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          866-484-3658
        </a>
      </div>
    </div>
  `;
}

function renderLaunchPad() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <h3><span class="geap-skeleton-text" style="width: 120px;"></span></h3>
        <p class="portfolio-summary-card__sub"><span class="geap-skeleton-text" style="width: 190px;"></span></p>
        <div class="side-list">
          ${[1, 2, 3].map(() => `
            <div class="side-list__item" style="padding: 12px 0;">
              <p style="margin: 0; font-size: 0.82rem; flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <span class="geap-skeleton-text" style="width: 130px;"></span>
                <span class="geap-skeleton-text" style="width: 100px; height: 10px;"></span>
              </p>
              <span class="geap-skeleton-text" style="width: 55px; height: 26px; border-radius: 4px;"></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="portfolio-summary-card">
      <h3>Launch Pad</h3>
      <p class="portfolio-summary-card__sub">Quick access to Wealth Management tools.</p>
      <div class="side-list">
        ${mockData.sidePanels.launchPad
      .map(
        (item) => `
              <div class="side-list__item" style="padding: 12px 0;">
                <p style="margin: 0; font-size: 0.82rem;"><strong>${item.title}</strong><br><span style="color: var(--muted); font-size: 0.78rem;">${item.detail}</span></p>
                <button type="button" class="outline-button" style="border-radius: 4px; padding: 4px 10px; font-size: 11px; min-height: 26px; border-color: #6B2D9B; color: #6B2D9B;">${item.action}</button>
              </div>
            `
      )
      .join("")}
      </div>
    </div>
  `;
}

function renderAlertsPanel() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <div class="portfolio-summary-card">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <h3><span class="geap-skeleton-text" style="width: 110px;"></span></h3>
        </div>
        <p class="portfolio-summary-card__sub" style="margin-bottom: 12px;"><span class="geap-skeleton-text" style="width: 150px;"></span></p>
        <div class="alert-tabs" style="margin-top: 14px; margin-bottom: 16px; gap: 16px;">
          <span class="geap-skeleton-text" style="width: 40px; height: 20px;"></span>
          <span class="geap-skeleton-text" style="width: 60px; height: 20px;"></span>
          <span class="geap-skeleton-text" style="width: 55px; height: 20px;"></span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="alert-item" style="padding: 10px 0; display: flex; flex-direction: column; gap: 4px;">
            <span class="geap-skeleton-text" style="width: 140px;"></span>
            <span class="geap-skeleton-text" style="width: 100px; height: 10px;"></span>
          </div>
          <div class="alert-item" style="padding: 10px 0; display: flex; flex-direction: column; gap: 4px;">
            <span class="geap-skeleton-text" style="width: 160px;"></span>
            <span class="geap-skeleton-text" style="width: 90px; height: 10px;"></span>
          </div>
        </div>
      </div>
    `;
  }

  const visibleAlerts = mockData.sidePanels.alerts.filter((alert) => {
    if (state.alertTab === "all") return true;
    return alert.category === state.alertTab;
  });

  return `
    <div class="portfolio-summary-card">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <h3 style="margin: 0;">Alerts (74)</h3>
        <a href="/alerts" data-route style="font-size: 0.8rem; font-weight: 600; color: #6B2D9B;">Message Center</a>
      </div>
      <p class="portfolio-summary-card__sub" style="margin-bottom: 12px;">See your latest notifications.</p>
      <div class="alert-tabs" role="tablist" aria-label="Alert filters" style="margin-top: 14px; margin-bottom: 16px; gap: 16px;">
        <button type="button" data-alert-tab="all" aria-selected="${state.alertTab === "all"}">All</button>
        <button type="button" data-alert-tab="account" aria-selected="${state.alertTab === "account"}">Account</button>
        <button type="button" data-alert-tab="symbol" aria-selected="${state.alertTab === "symbol"}">Symbol</button>
      </div>
      <div style="display: flex; flex-direction: column;">
        ${visibleAlerts.map((alert) => `
          <div class="alert-item" style="padding: 10px 0;">
            <strong style="font-size: 0.82rem;">${alert.title}</strong>
            <span style="font-size: 0.72rem; color: var(--muted); margin-top: 3px; display: block;">${alert.date}</span>
          </div>
        `).join("")}
      </div>
      <div style="margin-top: 16px; display: flex; gap: 12px; align-items: center;">
        <a href="/alerts" data-route class="portfolio-summary-card__link" style="margin-top: 0; display: inline-block;">View all →</a>
        <span class="separator">|</span>
        <a href="/alerts" data-route class="portfolio-summary-card__link" style="margin-top: 0; display: inline-block;">Set and manage alerts →</a>
      </div>
    </div>
  `;
}

function renderMorganStanleyAccounts() {
  if (!state.includeExternalAccounts) return "";
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <section class="wide-panel">
        <h2><span class="geap-skeleton-text" style="width: 200px;"></span></h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th><span class="geap-skeleton-text" style="width: 80px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 70px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 90px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 90px;"></span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="geap-skeleton-text" style="width: 150px;"></span></td>
                <td><span class="geap-skeleton-text" style="width: 80px;"></span></td>
                <td><span class="geap-skeleton-text" style="width: 60px;"></span></td>
                <td><span class="geap-skeleton-text" style="width: 60px;"></span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  const account = mockData.morganStanleyAccount;
  if (!account) return "";
  return `
    <section class="wide-panel">
      <h2>Morgan Stanley Accounts</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Assets $</th>
              <th>Day's Gain $</th>
              <th>Day's Gain %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/accounts" data-route>${account.name}</a></td>
              <td>${account.assets}</td>
              <td>${account.dayGain}</td>
              <td>${account.dayGainPct}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span><a href="/accounts" data-route>Go To Morgan Stanley Online</a> <span class="separator">|</span> <button type="button" class="link-button">Quick links ...</button> <span class="separator">|</span> <button type="button" class="link-button card-ai-analyzer-btn" data-account-id="morgan_stanley" style="color: var(--purple-bright); font-weight: 600;">✦ AI Analyzer</button></span>
        <span>Last updated as of ${mockData.user.refreshedAt}</span>
      </div>
    </section>
  `;
}

function renderWatchListSnapshot() {
  const showData = isShowDataEnabled();
  if (!showData) {
    return `
      <section class="wide-panel">
        <h2><span class="geap-skeleton-text" style="width: 180px;"></span></h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th><span class="geap-skeleton-text" style="width: 60px;"></span></th>
                <th></th>
                <th><span class="geap-skeleton-text" style="width: 90px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 80px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 80px;"></span></th>
                <th><span class="geap-skeleton-text" style="width: 80px;"></span></th>
              </tr>
            </thead>
            <tbody>
              ${[1, 2].map(() => `
                <tr>
                  <td><span class="geap-skeleton-text" style="width: 50px;"></span></td>
                  <td><span class="geap-skeleton-text" style="width: 55px; height: 26px; border-radius: 4px;"></span></td>
                  <td><span class="geap-skeleton-text" style="width: 60px;"></span></td>
                  <td><span class="geap-skeleton-text" style="width: 50px;"></span></td>
                  <td><span class="geap-skeleton-text" style="width: 50px;"></span></td>
                  <td><span class="geap-skeleton-text" style="width: 60px;"></span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  return `
    <section class="wide-panel">
      <h2>v Watch Lists Snapshot</h2>
      <div class="field">
        <label class="sr-only" for="watch-list-select">Watch list</label>
        <select id="watch-list-select">
          <option>Investments to Watch</option>
          <option>Core Portfolio Watch</option>
          <option>Income Ideas</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th></th>
              <th>Last Price $</th>
              <th>Change %</th>
              <th>Change $</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            ${mockData.watchList
      .map(
        (item) => `
                  <tr>
                    <td><a href="/trading" data-route>${item.symbol}</a></td>
                    <td><button class="outline-button" type="button">Trade</button></td>
                    <td>${item.lastPrice}</td>
                    <td class="${moneyToneClass(item.tone)}">${item.changePct}</td>
                    <td class="${moneyToneClass(item.tone)}">${item.change}</td>
                    <td>${item.volume}</td>
                  </tr>
                `
      )
      .join("")}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span>${mockData.watchList.length} total <span class="separator">|</span> <a href="/accounts/watch-lists" data-route>View full watch list</a></span>
        <span>Market Closed Jun 04, 2026, 4:00 PM ET</span>
      </div>
    </section>
  `;
}

function selectedAccount() {
  return mockData.accounts.find((account) => account.id === state.selectedAccountId) || mockData.accounts[1];
}


function renderSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = escapeHtml(params.get("q") || "");
  const results = [
    { title: "Complete View", path: "/accounts", detail: "Account dashboard and total assets" },
    { title: "Portfolios", path: "/accounts/portfolios", detail: "Allocation, holdings, performance, and gains" },
    { title: "Alerts", path: "/alerts", detail: "Message center and account alerts" }
  ];

  return `
    <section class="page-band">
      <div class="shell">
        <h1>Search</h1>
        <p>Showing mock results${query ? ` for <strong>${query}</strong>` : ""}.</p>
        <div class="placeholder-grid">
          ${results.map((result) => `<article class="placeholder-card"><h2><a href="${result.path}" data-route>${result.title}</a></h2><p>${result.detail}</p></article>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPlaceholder(title) {
  return `
    <section class="page-band">
      <div class="shell">
        <div class="page-title-row">
          <h1>${escapeHtml(title)}</h1>
          <button class="text-button" type="button" data-refresh>Refresh <span>${mockData.user.refreshedAt}</span></button>
        </div>
      </div>
    </section>
    <section class="placeholder-panel">
      <p><strong>${escapeHtml(title)}</strong> is wired into the mock navigation and ready for future GEAP-backed flows.</p>
      <div class="placeholder-grid">
        <article class="placeholder-card">
          <h2>Mock content</h2>
          <p>This area can hold synthetic data fixtures for agent tools.</p>
        </article>
        <article class="placeholder-card">
          <h2>Agent intent</h2>
          <p>Future work can map clicks here to GEAP tool calls and audit logs.</p>
        </article>
        <article class="placeholder-card">
          <h2>Guardrails</h2>
          <p>High-risk actions should remain blocked or confirmation-gated.</p>
        </article>
      </div>
    </section>
    ${renderDisclosures()}
  `;
}

function renderDisclosures() {
  return `
    <footer class="footer-disclosures">
      <div class="shell">
        <h2>Please read all the important disclosures below.</h2>

        <section>
          <h3>Investing:</h3>
          <p>Check the background of Morgan Stanley Smith Barney LLC on <a href="https://brokercheck.finra.org/" target="_blank" rel="noreferrer">FINRA's BrokerCheck</a> and see the Morgan Stanley Smith Barney LLC <a href="/accounts/documents" data-route>Relationship Summary</a>.</p>
          <div class="disclosure-pill">
            <span>Investment Products</span>
            <span>Not FDIC Insured</span>
            <span>No Bank Guarantee</span>
            <span>May Lose Value</span>
          </div>
          <p>SIPC - Securities in your account protected up to $500,000. For details please see www.sipc.org</p>
        </section>

        <section class="disclosure-block">
          <h3>Banking:</h3>
          <p>Banking products and services are provided by Morgan Stanley Private Bank, National Association, Member <a href="/accounts/documents" data-route>FDIC</a>.</p>
          <div class="disclosure-pill">
            <span>Banking Products</span>
            <span>FDIC Insured</span>
            <span>Bank Guarantee</span>
          </div>
          <p>FDIC Insured - Backed by the full faith and credit of the U.S. Government</p>
        </section>

        <div class="disclosure-text">
          <p><strong>Affiliations:</strong></p>
          <p>Securities products and investment advisory services offered by Morgan Stanley Smith Barney LLC, Member SIPC and a Registered Investment Adviser. Commodity futures and options on futures products and services offered by E*TRADE Futures LLC, Member NFA. Stock plan administration solutions and services offered by E*TRADE Financial Corporate Services, Inc., and are a part of Morgan Stanley at Work. Banking products and services provided by Morgan Stanley Private Bank, National Association, Member FDIC. All entities are separate but affiliated subsidiaries of Morgan Stanley. E*TRADE from Morgan Stanley and Morgan Stanley at Work are registered trademarks of Morgan Stanley.</p>
          <p><strong>System response and account access may vary due to a variety of factors, including trading volumes, market conditions, system performances, and other factors.</strong></p>
          <p>For information on the <strong>E*TRADE Customer Protection Guarantee</strong> visit the <a href="/support" data-route>Security Center</a>.</p>
          <div class="disclosure-links">
            <a href="/documents" data-route>Privacy</a>
            <span>|</span>
            <a href="/documents" data-route>Disclosure Library</a>
            <span>|</span>
            <a href="/documents" data-route>Statement of Financial Condition</a>
            <span>|</span>
            <a href="/documents" data-route>About Asset Protection</a>
            <span>|</span>
            <a href="/documents" data-route>Account Agreements and Disclosures</a>
            <span>|</span>
            <a href="/documents" data-route>Business Continuity Plan</a>
          </div>
          <p>&copy; 2026 E*TRADE from Morgan Stanley. Internal GEAP mock POC. All data is synthetic.</p>
        </div>
      </div>
    </footer>
  `;
}

function bindViewEvents() {
  app.querySelectorAll("[data-toggle-number]").forEach((button) => {
    button.addEventListener("click", () => {
      const accountId = button.dataset.toggleNumber;
      if (state.visibleNumbers.has(accountId)) {
        state.visibleNumbers.delete(accountId);
      } else {
        state.visibleNumbers.add(accountId);
      }
      render();
    });
  });

  app.querySelectorAll("[data-toggle-account]").forEach((button) => {
    button.addEventListener("click", () => {
      const accountId = button.dataset.toggleAccount;
      if (state.expandedAccounts.has(accountId)) {
        state.expandedAccounts.delete(accountId);
      } else {
        state.expandedAccounts.add(accountId);
      }
      render();
    });
  });

  app.querySelectorAll("[data-alert-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alertTab = button.dataset.alertTab;
      render();
    });
  });

  app.querySelectorAll("[data-allocation-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.allocationMode = button.dataset.allocationMode;
      render();
    });
  });

  const accountSelect = app.querySelector("#account-select");
  if (accountSelect) {
    accountSelect.addEventListener("change", () => {
      state.selectedAccountId = accountSelect.value;
      render();
    });
  }

  app.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      button.textContent = `Refresh ${mockData.user.refreshedAt}`;
    });
  });

  function updateAIPanelUI() {
    const hero = app.querySelector(".dashboard-hero");
    const card = app.querySelector(".markets-ai-card");
    const panel = app.querySelector("#ai-details-panel");
    const toggleBtn = app.querySelector(".markets-ai-card__toggle-btn");
    const chevron = toggleBtn ? toggleBtn.querySelector(".chevron-icon") : null;

    if (state.aiDetailsExpanded) {
      if (hero) hero.classList.add("dashboard-hero--connected");
      if (card) card.classList.add("markets-ai-card--connected");
      if (panel) panel.classList.remove("ai-details-section--collapsed");
      if (chevron) chevron.style.transform = "rotate(0deg)";
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");

      if (panel) {
        const inner = panel.querySelector(".ai-details-inner");
        if (inner) {
          if (typeof InsightsEngine === "undefined") {
            inner.innerHTML = `
              <div class="ai-details-loading" style="padding: 2.5rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <div class="spinner-small" style="width: 18px; height: 18px; border: 2px solid #e2e8f0; border-top-color: #6b2d9b; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                Loading AI Insights...
              </div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            `;
            if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
              window.ensureStyle("/css/insights.min.css?v=0.1.0");
              window.ensureScript("/js/insights.js?v=0.1.0", () => {
                if (state.aiDetailsExpanded && typeof InsightsEngine !== "undefined") {
                  const currentPanel = app.querySelector("#ai-details-panel");
                  const currentInner = currentPanel ? currentPanel.querySelector(".ai-details-inner") : null;
                  if (currentInner) {
                    currentInner.innerHTML = InsightsEngine.renderInsightsStrip();
                  }
                }
              });
            }
          } else {
            if (!inner.querySelector("#insights-strip")) {
              inner.innerHTML = InsightsEngine.renderInsightsStrip();
            }
          }
        }
      }
    } else {
      if (hero) hero.classList.remove("dashboard-hero--connected");
      if (card) card.classList.remove("markets-ai-card--connected");
      if (panel) panel.classList.add("ai-details-section--collapsed");
      if (chevron) chevron.style.transform = "rotate(180deg)";
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    }
  }

  const toggleBtn = app.querySelector(".markets-ai-card__toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      state.aiDetailsExpanded = !state.aiDetailsExpanded;
      updateAIPanelUI();
    });
  }

  const closeDetailsBtn = app.querySelector(".ai-details-card__close-btn");
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", () => {
      state.aiDetailsExpanded = false;
      updateAIPanelUI();
    });
  }

  const detailsTrigger = app.querySelector(".markets-ai-card__details-trigger");
  if (detailsTrigger) {
    detailsTrigger.addEventListener("click", () => {
      state.aiDetailsExpanded = true;
      updateAIPanelUI();
      const panel = document.getElementById("ai-details-panel");
      if (panel) {
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });
  }

  // Trigger UI sync for the AI panel on initial render
  if (app.querySelector("#ai-details-panel")) {
    updateAIPanelUI();
  }

  const includeExternalToggle = app.querySelector("#include-external-toggle");
  if (includeExternalToggle) {
    includeExternalToggle.addEventListener("change", (e) => {
      state.includeExternalAccounts = e.target.checked;
      render();
    });
  }
}

function closeMenus() {
  document.querySelectorAll(".menu-popover").forEach((menu) => {
    menu.hidden = true;
  });
}

function closeMobileMenu() {
  primaryNav.classList.remove("is-open");
  mobileMenuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

document.addEventListener("click", (event) => {
  const routeLink = event.target.closest("[data-route]");
  if (routeLink) {
    const href = routeLink.getAttribute("href");
    if (href && href.startsWith("/")) {
      event.preventDefault();
      routeTo(href);
    }
  }

  const menuButton = event.target.closest("[data-menu-button]");
  if (menuButton) {
    event.preventDefault();
    const menuName = menuButton.dataset.menuButton;
    const menu = document.querySelector(`[data-menu="${menuName}"]`);
    if (menu) {
      const wasHidden = menu.hidden;
      closeMenus();
      const rect = menuButton.getBoundingClientRect();
      menu.style.top = `${Math.round(rect.bottom + 8)}px`;
      menu.style.left = `${Math.max(12, Math.round(rect.left))}px`;
      menu.style.right = "auto";
      menu.hidden = !wasHidden;
    }
  } else if (!event.target.closest(".menu-popover")) {
    closeMenus();
  }

  const analyzerBtn = event.target.closest(".card-ai-analyzer-btn");
  if (analyzerBtn) {
    event.preventDefault();
    const accountId = analyzerBtn.dataset.accountId;

    // 1. Set selectedAccountId in state
    state.selectedAccountId = accountId;

    // 2. Determine friendly name for search/display
    let accountName = "selected account";
    if (accountId === "morgan_stanley") {
      accountName = mockData.morganStanleyAccount ? mockData.morganStanleyAccount.name : "Morgan Stanley Account";
    } else {
      const acc = mockData.accounts.find(a => a.id === accountId);
      if (acc) {
        accountName = `${acc.label} (${acc.masked})`;
      }
    }

    // 3. Render page to make changes visible
    render();

    // 4. Trigger chat queries
    if (typeof triggerChatQuery === "function") {
      triggerChatQuery(`Run deep AI portfolio analysis for account: ${accountName}`, "portfolio-analyst");
    }
  }
});

mobileMenuButton.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("is-open");
  mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});

function submitSearch(form) {
  const input = form.querySelector("input");
  const query = input.value.trim();
  routeTo(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
}

const searchForm = document.querySelector(".search-form");

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch(event.currentTarget);
});

searchForm.querySelector("input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitSearch(searchForm);
  }
});

window.triggerChatQuery = function (message, agentId = null) {
  const panel = document.getElementById('agent-panel');
  if (panel) {
    panel.hidden = false;
  }
  const launcher = document.querySelector('.chat-launcher');
  if (launcher) {
    launcher.setAttribute('aria-expanded', 'true');
  }

  const executeQuery = () => {
    if (typeof Chat !== 'undefined') {
      Chat.init();
      if (agentId) {
        Chat.selectAgent(agentId);
      }
      Chat.sendMessage(message);
    }
  };

  if (typeof Chat === 'undefined') {
    if (typeof window !== 'undefined' && window.ensureScript && window.ensureStyle) {
      window.ensureStyle('/css/chat.min.css?v=0.1.0');
      window.ensureScript('/js/chat.js?v=0.1.0', executeQuery);
    }
  } else {
    executeQuery();
  }
};

chatLauncher.addEventListener("click", () => {
  const isHidden = agentPanel.hidden;
  agentPanel.hidden = !isHidden;
  chatLauncher.setAttribute("aria-expanded", String(isHidden));
  if (isHidden) {
    if (typeof Chat === "undefined") {
      if (typeof window !== "undefined" && window.ensureScript && window.ensureStyle) {
        window.ensureStyle("/css/chat.min.css?v=0.1.0");
        window.ensureScript("/js/chat.js?v=0.1.0", () => {
          if (typeof Chat !== "undefined") {
            Chat.init();
          }
        });
      }
    } else {
      Chat.init();
    }
  }
});

document.querySelector("[data-close-agent]").addEventListener("click", () => {
  agentPanel.hidden = true;
  chatLauncher.setAttribute("aria-expanded", "false");
});

document.querySelectorAll("[data-agent-chip]").forEach((chip) => {
  chip.addEventListener("click", () => {
    const input = document.querySelector("#agent-input");
    const prompts = {
      summarize: "Summarize my mock accounts.",
      alerts: "Triage my mock alerts.",
      portfolio: "Explain the CORE mock allocation."
    };
    input.value = prompts[chip.dataset.agentChip] || "";
    input.focus();
  });
});

document.querySelector(".agent-panel__composer").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const body = document.querySelector(".agent-panel__body");
  const question = input.value.trim();
  if (!question) return;
  body.insertAdjacentHTML(
    "beforeend",
    `<p><strong>You:</strong> ${escapeHtml(question)}</p><p><strong>GEAP placeholder:</strong> The next phase will answer this with route-aware mock tools and guardrails.</p>`
  );
  input.value = "";
  body.scrollTop = body.scrollHeight;
});

window.addEventListener("popstate", () => {
  state.route = window.location.pathname;
  const url = new URL(window.location.href);
  if (url.pathname === "/accounts/portfolios") {
    state.portfolioTab = url.searchParams.get("tab") || "allocation";
  }
  render();
});


function updateEtradeUI() {
  const logonLink = document.getElementById("etrade-logon-link");
  if (!logonLink) return;

  const connected = typeof BrokerageData !== "undefined" && BrokerageData.getLiveMode && BrokerageData.getLiveMode();

  if (connected) {
    logonLink.textContent = "Log Off";
    logonLink.style.background = "";
    logonLink.style.color = "";
    logonLink.style.padding = "";
    logonLink.style.borderRadius = "";
  } else {
    if (!logonLink.textContent.includes("PIN") && !logonLink.textContent.includes("Connecting")) {
      logonLink.textContent = "Log On";
      logonLink.style.background = "";
      logonLink.style.color = "";
      logonLink.style.padding = "";
      logonLink.style.borderRadius = "";
    }
  }
}

// Global click handler helper for E*TRADE connectivity
document.addEventListener("click", (event) => {
  const connectBtn = event.target.closest("#etrade-logon-link") || event.target.closest(".etrade-connect-prompt-btn");
  if (connectBtn) {
    event.preventDefault();
    const isHeaderLink = connectBtn.id === "etrade-logon-link";
    const connected = typeof BrokerageData !== "undefined" && BrokerageData.getLiveMode && BrokerageData.getLiveMode();
    if (connected) {
      fetch("/api/etrade/disconnect")
        .then(res => res.json())
        .then(() => {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem("etrade_connected");
          }
          window.location.reload();
        });
    } else if (connectBtn.textContent.includes("PIN")) {
      const pin = prompt("Please enter the verification code (PIN) shown on the E*TRADE authorization page:");
      if (pin && pin.trim()) {
        connectBtn.textContent = "Connecting...";
        fetch(`/auth/etrade/callback?pin=${encodeURIComponent(pin.trim())}`)
          .then(res => {
            if (res.ok) {
              alert("SUCCESS: Connected to E*TRADE Sandbox!");
              window.location.reload();
            } else {
              res.text().then(txt => alert("Connection failed: " + txt));
              connectBtn.textContent = isHeaderLink ? "Log On" : "🔌 Connect E*TRADE Account";
              connectBtn.style.background = "";
              connectBtn.style.color = "";
              connectBtn.style.padding = "";
              connectBtn.style.borderRadius = "";
            }
          })
          .catch(err => {
            alert("Connection error: " + err.message);
            connectBtn.textContent = isHeaderLink ? "Log On" : "🔌 Connect E*TRADE Account";
            connectBtn.style.background = "";
            connectBtn.style.color = "";
            connectBtn.style.padding = "";
            connectBtn.style.borderRadius = "";
          });
      }
    } else {
      const width = 600;
      const height = 750;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);

      window.open(
        "/auth/etrade",
        "EtradeAuth",
        `width=${width},height=${height},left=${left},top=${top},status=0,titlebar=0,menubar=0,toolbar=0`
      );

      connectBtn.textContent = "🔑 Enter PIN";
      connectBtn.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
      connectBtn.style.color = "#ffffff";
      connectBtn.style.padding = "4px 8px";
      connectBtn.style.borderRadius = "4px";
    }
  }
});

const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

// Render synchronously first so the page is immediately interactive and mock data is visible
// Bypass if we expect an active E*TRADE connection session to prevent layout flashing
const isEtradeConnectedSession = typeof sessionStorage !== "undefined" && sessionStorage.getItem("etrade_connected") === "true";
if (!isEtradeConnectedSession) {
  render();
}

if (!isNode && typeof BrokerageData !== "undefined" && BrokerageData.checkEtradeStatus) {
  BrokerageData.checkEtradeStatus().then(() => {
    updateEtradeUI();
    // Re-render if liveMode is active, or if we bypassed the initial render and must now show mock data
    if ((BrokerageData.getLiveMode && BrokerageData.getLiveMode()) || isEtradeConnectedSession) {
      render();
    }
  }).catch((err) => {
    console.error("Error in checkEtradeStatus:", err);
    if (isEtradeConnectedSession) {
      render();
    }
  });
}


/* ═══════════════════════════════════════════════════════════════
   GEAP Compatibility Layer
   Provides global helpers that agent modules depend on
   ═══════════════════════════════════════════════════════════════ */

const GeapApp = {
  getApiKey() {
    return localStorage.getItem("gemini_api_key");
  },

  showApiKeyModal() {
    const existing = document.getElementById("geap-api-key-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "geap-api-key-modal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-dialog">
        <h2>🔑 Connect Gemini AI</h2>
        <p>Enter your Google Gemini API key to enable AI agent features.<br>
           Get one free at <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a>.</p>
        <input type="password" id="geap-api-key-input" placeholder="AIza..." style="width: 100%; padding: 8px; margin: 12px 0; border: 1px solid #d1d5db; border-radius: 4px;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="outline-button" onclick="GeapApp.closeApiKeyModal()">Skip</button>
          <button class="outline-button" style="background: #6B2D9B; color: white; border-color: #6B2D9B;" onclick="GeapApp.saveApiKey()">Save & Connect</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) GeapApp.closeApiKeyModal(); });
    document.getElementById("geap-api-key-input").focus();
  },

  saveApiKey() {
    const input = document.getElementById("geap-api-key-input");
    if (input && input.value.trim()) {
      localStorage.setItem("gemini_api_key", input.value.trim());
      GeapApp.closeApiKeyModal();
      if (typeof GeminiAPI !== "undefined") GeminiAPI.init();
    }
  },

  closeApiKeyModal() {
    const modal = document.getElementById("geap-api-key-modal");
    if (modal) modal.remove();
  },

  renderMarkdown(text) {
    if (!text) return "";
    return String(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("tel:")) {
          const target = url.startsWith("tel:") ? "" : ' target="_blank" rel="noreferrer"';
          return `<a href="${url}"${target}>${label}</a>`;
        }
        return `<a href="${url}" data-route>${label}</a>`;
      })
      .replace(/\n- /g, "\n• ")
      .replace(/\n/g, "<br>");
  }
};

// Also provide as window.App for backward compatibility
window.App = GeapApp;
