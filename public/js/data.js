/* ═══════════════════════════════════════════════════════════════
   GEAP POC — Mock Brokerage Data
   Realistic mock data for a retail self-directed brokerage account
   ═══════════════════════════════════════════════════════════════ */

const BrokerageData = (() => {

  // ── Account Info ──
  const account = {
    name: 'Jonathan Doe',
    accountNumber: '****4821',
    accountType: 'Individual Brokerage',
    cashBalance: 14869.92,
    buyingPower: 29739.84,
    totalValue: 247832.15,
    dayChange: 1243.67,
    dayChangePercent: 0.5043,
    totalReturn: 47832.15,
    totalReturnPercent: 23.92,
    totalCost: 200000.00,
    openDate: '2021-03-15',
  };

  // ── Holdings ──
  const holdings = [
    { symbol: 'AAPL',  name: 'Apple Inc.',               shares: 150,  avgCost: 145.20, currentPrice: 198.75, sector: 'Technology',      dayChange: 1.85,  dayChangePct: 0.94  },
    { symbol: 'GOOGL', name: 'Alphabet Inc.',             shares: 45,   avgCost: 122.50, currentPrice: 178.42, sector: 'Technology',      dayChange: -0.63, dayChangePct: -0.35 },
    { symbol: 'MSFT',  name: 'Microsoft Corp.',           shares: 80,   avgCost: 310.00, currentPrice: 445.18, sector: 'Technology',      dayChange: 2.34,  dayChangePct: 0.53  },
    { symbol: 'AMZN',  name: 'Amazon.com Inc.',           shares: 60,   avgCost: 135.75, currentPrice: 194.63, sector: 'Consumer Disc.',  dayChange: 0.91,  dayChangePct: 0.47  },
    { symbol: 'NVDA',  name: 'NVIDIA Corp.',              shares: 35,   avgCost: 480.00, currentPrice: 892.50, sector: 'Technology',      dayChange: 12.40, dayChangePct: 1.41  },
    { symbol: 'TSLA',  name: 'Tesla Inc.',                shares: 40,   avgCost: 245.80, currentPrice: 268.35, sector: 'Consumer Disc.',  dayChange: -3.15, dayChangePct: -1.16 },
    { symbol: 'VTI',   name: 'Vanguard Total Stock Mkt',  shares: 120,  avgCost: 205.00, currentPrice: 262.80, sector: 'ETF - Broad',     dayChange: 0.45,  dayChangePct: 0.17  },
    { symbol: 'QQQ',   name: 'Invesco QQQ Trust',         shares: 55,   avgCost: 365.00, currentPrice: 498.72, sector: 'ETF - Tech',      dayChange: 1.28,  dayChangePct: 0.26  },
    { symbol: 'BND',   name: 'Vanguard Total Bond Mkt',   shares: 200,  avgCost: 73.50,  currentPrice: 72.15,  sector: 'ETF - Bonds',     dayChange: 0.08,  dayChangePct: 0.11  },
    { symbol: 'GLD',   name: 'SPDR Gold Shares',          shares: 30,   avgCost: 178.00, currentPrice: 215.40, sector: 'ETF - Commodity', dayChange: 0.72,  dayChangePct: 0.34  },
    { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',      shares: 50,   avgCost: 148.90, currentPrice: 198.25, sector: 'Financials',      dayChange: 0.95,  dayChangePct: 0.48  },
    { symbol: 'JNJ',   name: 'Johnson & Johnson',         shares: 45,   avgCost: 162.30, currentPrice: 157.80, sector: 'Healthcare',      dayChange: -0.42, dayChangePct: -0.27 },
  ];

  // Compute derived values for each holding
  holdings.forEach(h => {
    h.marketValue = +(h.shares * h.currentPrice).toFixed(2);
    h.costBasis = +(h.shares * h.avgCost).toFixed(2);
    h.totalReturn = +(h.marketValue - h.costBasis).toFixed(2);
    h.totalReturnPct = +(((h.currentPrice - h.avgCost) / h.avgCost) * 100).toFixed(2);
    h.dayChangeTotal = +(h.shares * h.dayChange).toFixed(2);
    h.weight = 0; // calculated below
  });

  // Calculate portfolio weights
  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  holdings.forEach(h => {
    h.weight = +((h.marketValue / totalMarketValue) * 100).toFixed(2);
  });

  // ── Sector Allocation ──
  const sectorAllocation = {};
  holdings.forEach(h => {
    if (!sectorAllocation[h.sector]) {
      sectorAllocation[h.sector] = { value: 0, weight: 0, color: '' };
    }
    sectorAllocation[h.sector].value += h.marketValue;
  });
  const sectorColors = {
    'Technology':      'hsl(217, 91%, 60%)',
    'Consumer Disc.':  'hsl(262, 83%, 65%)',
    'ETF - Broad':     'hsl(152, 69%, 45%)',
    'ETF - Tech':      'hsl(190, 90%, 55%)',
    'ETF - Bonds':     'hsl(38, 92%, 50%)',
    'ETF - Commodity': 'hsl(15, 85%, 55%)',
    'Financials':      'hsl(200, 85%, 55%)',
    'Healthcare':      'hsl(340, 75%, 55%)',
  };
  Object.keys(sectorAllocation).forEach(sector => {
    sectorAllocation[sector].weight = +((sectorAllocation[sector].value / totalMarketValue) * 100).toFixed(2);
    sectorAllocation[sector].color = sectorColors[sector] || 'hsl(0, 0%, 50%)';
  });

  // ── Watchlist ──
  const watchlist = [
    { symbol: 'AAPL',  name: 'Apple Inc.',        price: 198.75, change: 1.85,  changePct: 0.94  },
    { symbol: 'GOOGL', name: 'Alphabet Inc.',      price: 178.42, change: -0.63, changePct: -0.35 },
    { symbol: 'MSFT',  name: 'Microsoft Corp.',    price: 445.18, change: 2.34,  changePct: 0.53  },
    { symbol: 'NVDA',  name: 'NVIDIA Corp.',       price: 892.50, change: 12.40, changePct: 1.41  },
    { symbol: 'TSLA',  name: 'Tesla Inc.',         price: 268.35, change: -3.15, changePct: -1.16 },
    { symbol: 'META',  name: 'Meta Platforms',     price: 512.80, change: 3.72,  changePct: 0.73  },
    { symbol: 'NFLX',  name: 'Netflix Inc.',       price: 687.25, change: -1.98, changePct: -0.29 },
    { symbol: 'AMD',   name: 'AMD Inc.',           price: 178.50, change: 4.25,  changePct: 2.44  },
  ];

  // ── Market Indices ──
  const marketIndices = [
    { name: 'S&P 500',  symbol: 'SPX',   value: 5482.87, change: 18.42,  changePct: 0.34  },
    { name: 'NASDAQ',   symbol: 'COMP',  value: 17384.56, change: 72.35, changePct: 0.42  },
    { name: 'DOW',      symbol: 'DJI',   value: 39872.43, change: -45.12, changePct: -0.11 },
    { name: 'Russell 2K', symbol: 'RUT', value: 2087.65, change: 8.93,   changePct: 0.43  },
    { name: 'BTC/USD',  symbol: 'BTC',   value: 98452.30, change: 1247.80, changePct: 1.28 },
    { name: '10Y Yield', symbol: 'TNX',  value: 4.28,    change: -0.03,  changePct: -0.70  },
    { name: 'VIX',      symbol: 'VIX',   value: 13.45,   change: -0.87,  changePct: -6.07  },
    { name: 'Gold',     symbol: 'GC',    value: 2415.60, change: 12.30,  changePct: 0.51  },
  ];

  // ── Recent Transactions ──
  const transactions = [
    { date: '2026-06-03', type: 'BUY',      symbol: 'NVDA',  shares: 5,  price: 880.10, total: 4400.50,  status: 'Filled' },
    { date: '2026-06-02', type: 'DIVIDEND',  symbol: 'VTI',   shares: null, price: null, total: 145.20, status: 'Credited' },
    { date: '2026-05-30', type: 'SELL',      symbol: 'TSLA',  shares: 10, price: 271.50, total: 2715.00, status: 'Filled' },
    { date: '2026-05-28', type: 'BUY',       symbol: 'AAPL',  shares: 20, price: 195.30, total: 3906.00, status: 'Filled' },
    { date: '2026-05-25', type: 'DIVIDEND',  symbol: 'JPM',   shares: null, price: null, total: 62.50,  status: 'Credited' },
    { date: '2026-05-22', type: 'SELL',      symbol: 'AMZN',  shares: 15, price: 190.25, total: 2853.75, status: 'Filled' },
    { date: '2026-05-20', type: 'TRANSFER',  symbol: null,     shares: null, price: null, total: 5000.00, status: 'Completed' },
    { date: '2026-05-18', type: 'BUY',       symbol: 'QQQ',   shares: 10, price: 492.50, total: 4925.00, status: 'Filled' },
    { date: '2026-05-15', type: 'BUY',       symbol: 'MSFT',  shares: 15, price: 438.75, total: 6581.25, status: 'Filled' },
    { date: '2026-05-12', type: 'DIVIDEND',  symbol: 'AAPL',  shares: null, price: null, total: 147.00, status: 'Credited' },
    { date: '2026-05-10', type: 'SELL',      symbol: 'GLD',   shares: 10, price: 210.80, total: 2108.00, status: 'Filled' },
    { date: '2026-05-08', type: 'BUY',       symbol: 'BND',   shares: 50, price: 72.40,  total: 3620.00, status: 'Filled' },
  ];

  // ── Performance History (6 months of daily portfolio values) ──
  function generatePerformanceHistory() {
    const data = [];
    const endDate = new Date('2026-06-04');
    const startDate = new Date('2025-12-04');
    let value = 210000;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        // Simulate market movement with upward bias
        const dailyReturn = (Math.random() - 0.47) * 0.015; // slight upward bias
        value = value * (1 + dailyReturn);
        data.push({
          date: current.toISOString().split('T')[0],
          value: +value.toFixed(2),
        });
      }
      current.setDate(current.getDate() + 1);
    }

    // Ensure last value matches account total
    if (data.length > 0) {
      data[data.length - 1].value = account.totalValue;
    }
    return data;
  }

  const performanceHistory = generatePerformanceHistory();

  // ── Intraday Performance (today, 5-min intervals) ──
  function generateIntradayData() {
    const data = [];
    let value = account.totalValue - account.dayChange;
    for (let hour = 9; hour < 16; hour++) {
      for (let min = hour === 9 ? 30 : 0; min < 60; min += 5) {
        if (hour === 16) break;
        const change = (Math.random() - 0.45) * 200;
        value += change;
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        data.push({ time, value: +value.toFixed(2) });
      }
    }
    // Ensure last value matches current
    if (data.length > 0) {
      data[data.length - 1].value = account.totalValue;
    }
    return data;
  }

  const intradayData = generateIntradayData();

  // ── Stock Quotes (for trade page) ──
  const stockQuotes = {};
  [...holdings, ...watchlist].forEach(item => {
    if (!stockQuotes[item.symbol]) {
      stockQuotes[item.symbol] = {
        symbol: item.symbol,
        name: item.name,
        price: item.currentPrice || item.price,
        change: item.dayChange || item.change,
        changePct: item.dayChangePct || item.changePct,
        open: +(item.currentPrice || item.price) * (1 - Math.random() * 0.01),
        high: +((item.currentPrice || item.price) * (1 + Math.random() * 0.015)).toFixed(2),
        low: +((item.currentPrice || item.price) * (1 - Math.random() * 0.012)).toFixed(2),
        volume: Math.floor(Math.random() * 50000000) + 5000000,
        avgVolume: Math.floor(Math.random() * 40000000) + 8000000,
        marketCap: +(Math.random() * 3000 + 50).toFixed(1) + 'B',
        pe: +(Math.random() * 40 + 10).toFixed(2),
        eps: +(Math.random() * 15 + 1).toFixed(2),
        dividend: +(Math.random() * 3).toFixed(2) + '%',
        week52High: +((item.currentPrice || item.price) * (1 + Math.random() * 0.25)).toFixed(2),
        week52Low: +((item.currentPrice || item.price) * (1 - Math.random() * 0.3)).toFixed(2),
      };
    }
  });

  // ── Open Orders ──
  const openOrders = [
    { id: 'ORD-00147', date: '2026-06-04', type: 'BUY', orderType: 'LIMIT', symbol: 'AMD', shares: 25, price: 170.00, status: 'Open' },
    { id: 'ORD-00148', date: '2026-06-04', type: 'SELL', orderType: 'STOP', symbol: 'TSLA', shares: 10, price: 255.00, status: 'Open' },
  ];

  // ── FAQ Data (for support agent) ──
  const faq = [
    { q: 'How do I transfer funds?', a: 'Go to Account > Transfers. You can link a bank account and initiate ACH transfers. Transfers typically take 1-3 business days.' },
    { q: 'What are the trading fees?', a: 'We offer commission-free trading on US stocks and ETFs. Options trades are $0.65 per contract.' },
    { q: 'How do I enable margin?', a: 'Navigate to Account Settings > Margin. You must have a minimum balance of $2,000 and agree to the margin agreement.' },
    { q: 'Where are my tax documents?', a: 'Tax documents (1099-B, 1099-DIV) are available in Account > Documents > Tax Documents, typically by mid-February.' },
    { q: 'What order types are available?', a: 'We support Market, Limit, Stop, and Stop-Limit orders. Each can be set as Day or GTC (Good Till Canceled).' },
  ];

  // ── Price Simulation ──
  function simulatePriceTick(item) {
    const volatility = 0.002; // 0.2% max tick
    const change = (Math.random() - 0.5) * 2 * volatility;
    const priceKey = item.currentPrice !== undefined ? 'currentPrice' : 'price';
    const oldPrice = item[priceKey];
    item[priceKey] = +(oldPrice * (1 + change)).toFixed(2);
    const tickChange = +(item[priceKey] - oldPrice).toFixed(2);

    if (item.dayChange !== undefined) item.dayChange = +(item.dayChange + tickChange).toFixed(2);
    if (item.change !== undefined) item.change = +(item.change + tickChange).toFixed(2);

    return tickChange;
  }

  function tickAllPrices() {
    holdings.forEach(simulatePriceTick);
    watchlist.forEach(simulatePriceTick);
    marketIndices.forEach(idx => {
      const change = (Math.random() - 0.5) * 2 * 0.001;
      const oldVal = idx.value;
      idx.value = +(oldVal * (1 + change)).toFixed(2);
      idx.change = +(idx.change + (idx.value - oldVal)).toFixed(2);
      idx.changePct = +((idx.change / (idx.value - idx.change)) * 100).toFixed(2);
    });

    // Recalculate portfolio totals
    let newTotal = account.cashBalance;
    holdings.forEach(h => {
      h.marketValue = +(h.shares * h.currentPrice).toFixed(2);
      h.totalReturn = +(h.marketValue - h.costBasis).toFixed(2);
      h.totalReturnPct = +(((h.currentPrice - h.avgCost) / h.avgCost) * 100).toFixed(2);
      h.dayChangeTotal = +(h.shares * h.dayChange).toFixed(2);
      newTotal += h.marketValue;
    });
    const prevTotal = account.totalValue;
    account.totalValue = +newTotal.toFixed(2);
    account.dayChange = +(account.dayChange + (newTotal - prevTotal)).toFixed(2);
    account.dayChangePercent = +((account.dayChange / (account.totalValue - account.dayChange)) * 100).toFixed(4);

    // Recalculate weights
    const tmv = holdings.reduce((s, h) => s + h.marketValue, 0);
    holdings.forEach(h => { h.weight = +((h.marketValue / tmv) * 100).toFixed(2); });
  }

  // ── Agent Activity Log (for Agent Fabric) ──
  const agentActivityLog = [];
  function logAgentActivity(entry) {
    let query = entry.query || '';
    if (typeof query === 'string') {
      query = query
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED SSN]')
        .replace(/\b\d{4}-\d{4}\b/g, '[REDACTED ACCOUNT]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED EMAIL]')
        .replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, '[REDACTED PHONE]');
    }
    agentActivityLog.unshift({
      timestamp: new Date().toISOString(),
      ...entry,
      query: query
    });
    if (agentActivityLog.length > 100) agentActivityLog.pop();
  }

  // ── Agent Metrics (for Agent Fabric) ──
  const agentMetrics = {
    'portfolio-analyst': { requests: 47, avgLatency: 1.2, successRate: 98.5, tokensUsed: 124500, uptime: 99.9, errors: 1 },
    'trade-assistant':   { requests: 32, avgLatency: 0.9, successRate: 99.2, tokensUsed: 89200,  uptime: 99.9, errors: 0 },
    'market-research':   { requests: 61, avgLatency: 1.5, successRate: 97.8, tokensUsed: 198700, uptime: 99.7, errors: 2 },
    'customer-support':  { requests: 28, avgLatency: 0.8, successRate: 100,  tokensUsed: 67300,  uptime: 100,  errors: 0 },
    'ken-agent':         { requests: 12, avgLatency: 1.1, successRate: 99.0, tokensUsed: 24500,  uptime: 99.9, errors: 0 },
  };

  function recalculatePortfolio() {
    // 1. Recalculate derived holding values
    holdings.forEach(h => {
      h.marketValue = +(h.shares * h.currentPrice).toFixed(2);
      h.costBasis = +(h.shares * h.avgCost).toFixed(2);
      h.totalReturn = +(h.marketValue - h.costBasis).toFixed(2);
      h.totalReturnPct = h.avgCost > 0 ? +(((h.currentPrice - h.avgCost) / h.avgCost) * 100).toFixed(2) : 0;
      h.dayChangeTotal = +(h.shares * h.dayChange).toFixed(2);
      h.weight = 0;
    });

    // 2. Calculate portfolio totals
    const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    holdings.forEach(h => {
      h.weight = totalMarketValue > 0 ? +((h.marketValue / totalMarketValue) * 100).toFixed(2) : 0;
    });

    // 3. Recalculate sector allocation in-place to preserve reference
    // Clear existing sector values
    Object.keys(sectorAllocation).forEach(key => {
      sectorAllocation[key].value = 0;
      sectorAllocation[key].weight = 0;
    });

    // Accumulate values
    holdings.forEach(h => {
      if (!sectorAllocation[h.sector]) {
        sectorAllocation[h.sector] = { value: 0, weight: 0, color: sectorColors[h.sector] || 'hsl(0, 0%, 50%)' };
      }
      sectorAllocation[h.sector].value += h.marketValue;
    });

    // Recalculate sector weights
    Object.keys(sectorAllocation).forEach(sector => {
      sectorAllocation[sector].value = +sectorAllocation[sector].value.toFixed(2);
      sectorAllocation[sector].weight = totalMarketValue > 0 ? +((sectorAllocation[sector].value / totalMarketValue) * 100).toFixed(2) : 0;
    });

    // 4. Update account totals
    if (liveMode) {
      const liveTotalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
      account.totalCost = +liveTotalCost.toFixed(2);
    }
    account.totalValue = +(account.cashBalance + totalMarketValue).toFixed(2);
    account.totalReturn = +(account.totalValue - account.totalCost).toFixed(2);
    account.totalReturnPercent = account.totalCost > 0 ? +((account.totalReturn / account.totalCost) * 100).toFixed(2) : 0;
    
    // Day change might change due to shares count updates (dayChangeTotal)
    const totalDayChange = holdings.reduce((sum, h) => sum + h.dayChangeTotal, 0);
    account.dayChange = +totalDayChange.toFixed(2);
    account.dayChangePercent = (account.totalValue - account.dayChange) > 0 ? +((account.dayChange / (account.totalValue - account.dayChange)) * 100).toFixed(4) : 0;
  }


  // ── Live E*TRADE Mode State ──
  let liveMode = false;
  let connectionEnv = "sandbox";
  let liveAccounts = [];

  async function checkEtradeStatus() {
    try {
      const res = await fetch("/api/etrade/status");
      if (res.ok) {
        const status = await res.json();
        liveMode = status.connected;
        connectionEnv = status.env;
        if (liveMode) {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("etrade_connected", "true");
          }
          await loadEtradeData();
        } else {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem("etrade_connected");
          }
          liveAccounts = [];
          
          const isTest = (typeof window !== "undefined" && window.__e2e_test_active__);
          const isDemo = typeof window !== "undefined" && window.location && typeof window.location.search === "string" && window.location.search.includes("demo=true");
          if (!isTest && !isDemo) {
            holdings.length = 0;
            transactions.length = 0;
            Object.keys(sectorAllocation).forEach(k => delete sectorAllocation[k]);
            account.cashBalance = 0;
            account.buyingPower = 0;
            account.totalValue = 0;
            account.totalCost = 0;
            account.totalReturn = 0;
            account.totalReturnPercent = 0;
            account.dayChange = 0;
            account.dayChangePercent = 0;
          }
        }
      }
    } catch (err) {
      console.error("Failed to query E*TRADE connection status:", err);
    }
  }

  async function loadEtradeData() {
    try {
      const accountsRes = await fetch("/api/etrade/accounts");
      if (!accountsRes.ok) throw new Error("Failed to load E*TRADE accounts");
      const accountsData = await accountsRes.json();
      
      const rawAccounts = accountsData?.AccountListResponse?.Accounts?.Account;
      if (!rawAccounts || rawAccounts.length === 0) return;
      
      // Load balances, portfolios, and transactions for each account in parallel
      const loadedAccounts = await Promise.all(rawAccounts.map(async (selectedAccount) => {
        const accountIdKey = selectedAccount.accountIdKey;
        
        // 1. Fetch Balances
        let cashBalance = 0;
        let buyingPower = 0;
        let totalValue = 0;
        try {
          const balancesRes = await fetch(`/api/etrade/balances/${accountIdKey}`);
          if (balancesRes.ok) {
            const balancesData = await balancesRes.json();
            
            const getFloat = (val) => {
              if (val === undefined || val === null) return null;
              const num = parseFloat(val);
              return isNaN(num) ? null : num;
            };

            const computed = balancesData?.BalanceResponse?.Computed;
            const accountBalance = balancesData?.BalanceResponse?.accountBalance;
            const cashAccountBalance = balancesData?.BalanceResponse?.cashAccountBalance;
            const marginAccountBalance = balancesData?.BalanceResponse?.marginAccountBalance;

            const cashBalanceVal =
              getFloat(computed?.netCash) ??
              getFloat(computed?.cashBuyingPower) ??
              getFloat(balancesData?.BalanceResponse?.Cash?.moneyMktBalance) ??
              getFloat(computed?.cashAvailableForInvestment) ??
              getFloat(computed?.realTimeValues?.totalCash) ??
              getFloat(computed?.cashBalance) ??
              getFloat(accountBalance?.cashBalance) ??
              getFloat(accountBalance?.totalCash) ??
              getFloat(accountBalance?.cashAvailableForWithdrawal) ??
              getFloat(cashAccountBalance?.cashBalance) ??
              getFloat(cashAccountBalance?.totalCash) ??
              getFloat(cashAccountBalance?.cashAvailableForWithdrawal) ??
              getFloat(marginAccountBalance?.marginBalance) ??
              getFloat(marginAccountBalance?.cashBalance) ??
              0;
            cashBalance = cashBalanceVal;

            const buyingPowerVal =
              getFloat(computed?.buyingPower) ??
              getFloat(computed?.cashBuyingPower) ??
              getFloat(computed?.marginBuyingPower) ??
              getFloat(accountBalance?.cashAvailableForInvestment) ??
              getFloat(cashAccountBalance?.cashAvailableForInvestment) ??
              getFloat(marginAccountBalance?.marginBalanceWithdrawal) ??
              cashBalanceVal;
            buyingPower = buyingPowerVal;

            const totalValueVal =
              getFloat(computed?.realTimeValues?.totalAccountValue) ??
              getFloat(computed?.netAccountValue) ??
              getFloat(accountBalance?.netAccountValue) ??
              getFloat(cashAccountBalance?.netAccountValue) ??
              getFloat(marginAccountBalance?.netAccountValue) ??
              0;
            totalValue = totalValueVal;
          }
        } catch (err) {
          console.warn(`Failed to load E*TRADE balances for account ${accountIdKey}:`, err);
        }

        // 2. Fetch Portfolio holdings
        const accountHoldings = [];
        try {
          const portfolioRes = await fetch(`/api/etrade/portfolio/${accountIdKey}`);
          if (portfolioRes.ok) {
            const portfolioData = await portfolioRes.json();
            const accountPortfolios = portfolioData?.PortfolioResponse?.AccountPortfolio;
            let rawPositions = [];
            if (Array.isArray(accountPortfolios)) {
              accountPortfolios.forEach(port => {
                if (Array.isArray(port?.Position)) {
                  rawPositions = rawPositions.concat(port.Position);
                } else if (port?.Position) {
                  rawPositions.push(port.Position);
                }
              });
            } else if (accountPortfolios?.Position) {
              if (Array.isArray(accountPortfolios.Position)) {
                rawPositions = accountPortfolios.Position;
              } else {
                rawPositions = [accountPortfolios.Position];
              }
            }

            if (Array.isArray(rawPositions)) {
              rawPositions.forEach(pos => {
                const sym = pos?.Product?.symbol || "";
                const name = pos?.symbolDescription || sym;
                
                const getFloat = (val) => {
                  if (val === undefined || val === null) return null;
                  const num = parseFloat(val);
                  return isNaN(num) ? null : num;
                };

                const qty = getFloat(pos.quantity) ?? 0;
                const cost = getFloat(pos.pricePaid) ?? 0;
                const price = getFloat(pos.currentPrice) ?? 0;
                const posDaysGain = getFloat(pos.daysGain) ?? getFloat(pos.todayValuationChange) ?? 0;
                const posDaysGainPct = getFloat(pos.daysGainPct) ?? getFloat(pos.todayValuationChangePct) ?? 0;
                const posMarketValue = getFloat(pos.marketValue);
                const posCostBasis = getFloat(pos.costBasis);
                
                accountHoldings.push({
                  symbol: sym,
                  name: name,
                  shares: qty,
                  avgCost: cost,
                  currentPrice: price,
                  marketValue: posMarketValue,
                  costBasis: posCostBasis,
                  dayChangeTotal: posDaysGain,
                  sector: getSectorForSymbol(sym, name),
                  dayChange: qty !== 0 ? +(posDaysGain / qty).toFixed(4) : 0,
                  dayChangePct: posDaysGainPct
                });
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to load E*TRADE portfolio for account ${accountIdKey}:`, err);
        }

        // 3. Fetch Transactions
        const accountTransactions = [];
        try {
          const transRes = await fetch(`/api/etrade/transactions/${accountIdKey}`);
          if (transRes.ok) {
            const transData = await transRes.json();
            const rawTrans = transData?.TransactionListResponse?.Transaction;
            if (Array.isArray(rawTrans)) {
              rawTrans.forEach(t => {
                let postDateStr = "";
                if (t.postDate) {
                  const rawDate = String(t.postDate);
                  postDateStr = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
                }
                accountTransactions.push({
                  date: postDateStr || t.transactionDate || "",
                  type: t.transactionType || "TRADE",
                  symbol: t.symbol || null,
                  shares: t.quantity || null,
                  price: t.price || null,
                  total: t.amount || 0,
                  status: "Completed"
                });
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to load E*TRADE transactions for account ${accountIdKey}:`, err);
        }

        // 4. Compute Derived Calculations for this account's holdings
        accountHoldings.forEach(h => {
          h.marketValue = h.marketValue ?? +(h.shares * h.currentPrice).toFixed(2);
          h.costBasis = h.costBasis ?? +(h.shares * h.avgCost).toFixed(2);
          h.totalReturn = +(h.marketValue - h.costBasis).toFixed(2);
          h.totalReturnPct = h.avgCost > 0 ? +(((h.currentPrice - h.avgCost) / h.avgCost) * 100).toFixed(2) : 0;
          h.dayChangeTotal = h.dayChangeTotal ?? +(h.shares * h.dayChange).toFixed(2);
          h.weight = 0;
        });

        const totalMarketValue = accountHoldings.reduce((sum, h) => sum + h.marketValue, 0);
        accountHoldings.forEach(h => {
          h.weight = totalMarketValue > 0 ? +((h.marketValue / totalMarketValue) * 100).toFixed(2) : 0;
        });

        const accountSectorAlloc = {};
        accountHoldings.forEach(h => {
          if (!accountSectorAlloc[h.sector]) {
            accountSectorAlloc[h.sector] = { value: 0, weight: 0, color: sectorColors[h.sector] || 'hsl(0, 0%, 50%)' };
          }
          accountSectorAlloc[h.sector].value += h.marketValue;
        });
        Object.keys(accountSectorAlloc).forEach(sector => {
          accountSectorAlloc[sector].value = +accountSectorAlloc[sector].value.toFixed(2);
          accountSectorAlloc[sector].weight = totalMarketValue > 0 ? +((accountSectorAlloc[sector].value / totalMarketValue) * 100).toFixed(2) : 0;
        });

        const liveTotalCost = accountHoldings.reduce((sum, h) => sum + h.costBasis, 0);
        const accountTotalValue = +(cashBalance + totalMarketValue).toFixed(2);
        const accountTotalReturn = +(accountTotalValue - liveTotalCost).toFixed(2);
        const accountTotalReturnPct = liveTotalCost > 0 ? +((accountTotalReturn / liveTotalCost) * 100).toFixed(2) : 0;

        const totalDayChange = accountHoldings.reduce((sum, h) => sum + h.dayChangeTotal, 0);
        const accountDayChange = +totalDayChange.toFixed(2);
        const accountDayChangePct = (accountTotalValue - accountDayChange) > 0 ? +((accountDayChange / (accountTotalValue - accountDayChange)) * 100).toFixed(4) : 0;

        return {
          accountIdKey: accountIdKey,
          accountId: selectedAccount.accountId,
          accountName: selectedAccount.accountName || "E*TRADE Account",
          accountNumber: selectedAccount.accountId ? "****" + String(selectedAccount.accountId).slice(-4) : "****",
          accountType: selectedAccount.accountDesc || "Brokerage",
          cashBalance: cashBalance,
          buyingPower: buyingPower,
          totalValue: accountTotalValue,
          totalCost: liveTotalCost,
          totalReturn: accountTotalReturn,
          totalReturnPercent: accountTotalReturnPct,
          dayChange: accountDayChange,
          dayChangePercent: accountDayChangePct,
          holdings: accountHoldings,
          sectorAllocation: accountSectorAlloc,
          transactions: accountTransactions
        };
      }));

      if (loadedAccounts.length > 0) {
        liveAccounts = loadedAccounts;

        // Populate primary default data structures for backwards compatibility
        const primary = loadedAccounts[0];
        account.name = primary.accountName;
        account.accountNumber = primary.accountNumber;
        account.accountType = primary.accountType;
        account.cashBalance = primary.cashBalance;
        account.buyingPower = primary.buyingPower;
        account.totalValue = primary.totalValue;
        account.totalCost = primary.totalCost;
        account.totalReturn = primary.totalReturn;
        account.totalReturnPercent = primary.totalReturnPercent;
        account.dayChange = primary.dayChange;
        account.dayChangePercent = primary.dayChangePercent;
        
        holdings.length = 0;
        primary.holdings.forEach(h => holdings.push(h));
        
        transactions.length = 0;
        primary.transactions.forEach(t => transactions.push(t));

        // Copy sector allocation
        Object.keys(sectorAllocation).forEach(k => delete sectorAllocation[k]);
        Object.entries(primary.sectorAllocation).forEach(([k, v]) => sectorAllocation[k] = v);
      }
      
      if (typeof render === "function") {
        render();
      }
    } catch (err) {
      console.error("Failed to synchronize E*TRADE Live data:", err);
    }
  }

  function getSectorForSymbol(sym, name = "") {
    const symUpper = sym.toUpperCase();
    const nameUpper = name.toUpperCase();
    const defaultSectors = {
      "AAPL": "Technology",
      "MSFT": "Technology",
      "GOOGL": "Technology",
      "NVDA": "Technology",
      "AMZN": "Consumer Disc.",
      "TSLA": "Consumer Disc.",
      "VTI": "ETF - Broad",
      "QQQ": "ETF - Tech",
      "BND": "ETF - Bonds",
      "GLD": "ETF - Commodity",
      "JPM": "Financials",
      "JNJ": "Healthcare"
    };
    if (defaultSectors[symUpper]) {
      return defaultSectors[symUpper];
    }
    
    // Check name / symbol keywords
    const isTech = symUpper === "QQQ" || symUpper === "XLK" || /\bTECH\b/.test(nameUpper) || /\bSEMICONDUCTOR\b/.test(nameUpper);
    const isBond = symUpper === "BND" || symUpper === "AGG" || symUpper === "TLT" || symUpper === "IEF" || symUpper === "SHY" ||
                   /\bBOND\b/.test(nameUpper) || /\bTREASURY\b/.test(nameUpper) || /FIXED INCOME/.test(nameUpper);
    const isCommodity = symUpper === "GLD" || symUpper === "IAU" || symUpper === "SLV" || symUpper === "USO" ||
                         /\bGOLD\b/.test(nameUpper) || /\bCOMMODIT/.test(nameUpper) || /\bSILVER\b/.test(nameUpper) || /\bOIL\b/.test(nameUpper);
    const isBroadEtf = nameUpper.includes("ETF") || nameUpper.includes("INDEX") || nameUpper.includes("FUND") || nameUpper.includes("TRUST") || 
                       nameUpper.includes("ACTIVEBETA") || nameUpper.includes("STRATEGICFACTORS") || nameUpper.includes("LARGE CAP") ||
                       nameUpper.includes("EMERGING") || nameUpper.includes("EAFE") || nameUpper.includes("WORLD") || nameUpper.includes("MARKETS") ||
                       symUpper === "SPY" || symUpper === "VOO" || symUpper === "IVV" || symUpper === "VTI" || symUpper === "GSLC" || symUpper === "QEFA" || symUpper === "EMGF";

    if (isTech && (nameUpper.includes("ETF") || nameUpper.includes("FUND"))) return "ETF - Tech";
    if (isBond) return "ETF - Bonds";
    if (isCommodity) return "ETF - Commodity";
    if (isBroadEtf) return "ETF - Broad";
    
    // Fall back to common stock sectors if not ETF
    if (nameUpper.includes("SOFTWARE") || nameUpper.includes("SEMICONDUCTOR") || nameUpper.includes("SYSTEMS") || nameUpper.includes("COMPUTERS")) return "Technology";
    if (nameUpper.includes("HEALTH") || nameUpper.includes("PHARMA") || nameUpper.includes("MEDICAL") || nameUpper.includes("THERAPEUTICS")) return "Healthcare";
    if (nameUpper.includes("BANK") || nameUpper.includes("FINANCIAL") || nameUpper.includes("INSURANCE") || nameUpper.includes("CAPITAL") || nameUpper.includes("SACHS")) return "Financials";

    return "Other";
  }

  // ── Public API ──
  return {
    account,
    holdings,
    sectorAllocation,
    watchlist,
    marketIndices,
    transactions,
    performanceHistory,
    intradayData,
    stockQuotes,
    openOrders,
    faq,
    agentActivityLog,
    agentMetrics,
    tickAllPrices,
    logAgentActivity,

    getLiveMode() { return liveMode; },
    getConnectionEnv() { return connectionEnv; },
    getLiveAccounts() { return liveAccounts; },
    checkEtradeStatus,
    loadEtradeData,
    getSectorForSymbol,

    // Utility: format currency
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    },

    // Utility: format number with sign
    formatChange(value) {
      const sign = value >= 0 ? '+' : '';
      return sign + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    },

    // Utility: format percent with sign
    formatPercent(value) {
      const sign = value >= 0 ? '+' : '';
      return sign + value.toFixed(2) + '%';
    },

    // Utility: format large numbers
    formatVolume(value) {
      if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
      if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
      if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
      return value.toString();
    },

    // Get holding by symbol
    getHolding(symbol) {
      return holdings.find(h => h.symbol === symbol) || null;
    },

    // Get quote by symbol
    getQuote(symbol) {
      return stockQuotes[symbol] || null;
    },

    // Get portfolio summary for agent context
    getPortfolioSummary() {
      return {
        totalValue: account.totalValue,
        dayChange: account.dayChange,
        dayChangePercent: account.dayChangePercent,
        totalReturn: account.totalReturn,
        totalReturnPercent: account.totalReturnPercent,
        cashBalance: account.cashBalance,
        holdingsCount: holdings.length,
        topHoldings: holdings
          .sort((a, b) => b.marketValue - a.marketValue)
          .slice(0, 5)
          .map(h => ({ symbol: h.symbol, value: h.marketValue, weight: h.weight, return: h.totalReturnPct })),
        sectorBreakdown: Object.entries(sectorAllocation).map(([name, data]) => ({
          sector: name, weight: data.weight, value: data.value
        })),
      };
    },
    recalculatePortfolio,
  };
})();
