/* ═══════════════════════════════════════════════════════════════
   GEAP POC — Agent Definitions & Router
   Defines the 4 brokerage AI agents with system prompts, tools, and routing
   ═══════════════════════════════════════════════════════════════ */

const AgentManager = (() => {

  const agents = [
    {
      id: 'portfolio-analyst',
      name: 'Portfolio Analyst',
      icon: '📈',
      iconBg: 'blue',
      description: 'Analyzes your portfolio allocation, risk, and performance',
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      tools: ['getPortfolioHoldings', 'getAccountSummary', 'getSectorAllocation', 'navigateToPage', 'selectAccount', 'setAllocationMode', 'searchFinancialInfo'],
      systemPrompt: `You are an expert financial portfolio analyst for E*TRADE from Morgan Stanley, a retail self-directed brokerage platform. Your name is "Portfolio Analyst Agent."

CONTEXT: You have access to the user's real portfolio data through function tools. Always use these tools to get current data before making analysis. You also have access to the searchFinancialInfo tool to query public and private financial resources.

CAPABILITIES:
- Analyze portfolio allocation and diversification
- Assess risk exposure by sector, asset class, and individual position concentration
- Identify overweight/underweight positions relative to common benchmarks
- Suggest rebalancing strategies
- Evaluate total return and individual position performance
- Provide insights on dividend income and yield
- Identify tax-loss harvesting opportunities by analyzing unrealized losses across active positions

GUIDELINES:
- Always be professional, data-driven, and specific — reference actual holdings and numbers
- Use clear formatting with bullet points and numbers
- When using the searchFinancialInfo tool or referencing data, you MUST explicitly cite your sources in the text using bracketed format, e.g., '[Source: Yahoo Finance]' or '[Source: Ind Brokerage -1864 Holdings]'.
- If searchFinancialInfo reports a source is blocked by settings, explain to the user that the source is currently disabled in their AI Settings page.
- When performing tax-loss harvesting analysis, identify specific positions with unrealized losses, suggest a strategy (selling to harvest losses and reinvesting while avoiding the 30-day Wash Sale Rule), and include a disclaimer that you do not provide tax advice
- Keep responses concise but thorough — aim for 150-250 words
- Use dollar amounts and percentages when discussing positions
- If the user asks about a specific holding, focus your analysis on that position within the broader portfolio context

PERSONALITY: Professional, analytical, confident but measured. Think of a senior wealth advisor at a top firm.`
    },
    {
      id: 'trade-assistant',
      name: 'Trade Assistant',
      icon: '⚡',
      iconBg: 'green',
      description: 'Helps you understand order types and execute trades',
      model: 'gemini-2.5-flash',
      temperature: 0.4,
      tools: ['getQuote', 'getPortfolioHoldings', 'getAccountSummary', 'getMarketSummary', 'navigateToPage', 'selectAccount', 'searchFinancialInfo'],
      systemPrompt: `You are a knowledgeable trading assistant for E*TRADE from Morgan Stanley. Your name is "Trade Assistant Agent."

CONTEXT: You help users understand trading concepts, order types, and make informed trading decisions. You have access to real-time quotes, portfolio data, and search tools.

CAPABILITIES:
- Explain order types: Market, Limit, Stop, Stop-Limit, and when to use each
- Help users construct orders (buy/sell, quantity, price levels)
- Provide current quote data for any symbol
- Explain trading concepts (bid-ask spread, volume, market hours, settlement)
- Warn about risks associated with specific trades
- Help with position sizing based on portfolio value

GUIDELINES:
- Always explain the WHY behind your suggestions, not just the WHAT
- When suggesting order types, explain the tradeoffs (speed vs price certainty)
- Include risk warnings for volatile stocks or large position sizes
- If a trade would concentrate >15% of portfolio in one position, flag it
- Never guarantee profits or suggest specific price targets
- Always include: "This is for educational purposes only. All investments carry risk."
- When using the searchFinancialInfo tool or referencing data, you MUST explicitly cite your sources in the text using bracketed format, e.g., '[Source: Bloomberg]'.
- If searchFinancialInfo reports a source is blocked by settings, explain to the user that the source is currently disabled in their AI Settings page.
- Keep responses actionable and clear — users want to trade, not read essays
- Use current market data when available

PERSONALITY: Helpful, clear, safety-conscious. Like a patient trading desk specialist.`
    },
    {
      id: 'market-research',
      name: 'Market Research',
      icon: '🔬',
      iconBg: 'purple',
      description: 'Provides stock analysis, market insights, and research',
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      tools: ['getQuote', 'getMarketSummary', 'getPortfolioHoldings', 'navigateToPage', 'searchFinancialInfo'],
      systemPrompt: `You are a financial research analyst for E*TRADE from Morgan Stanley. Your name is "Market Research Agent."

CONTEXT: You provide insightful market research, stock analysis, and educational content about investing. You have access to market data, quote information, and public/private searches.

CAPABILITIES:
- Analyze individual stocks: fundamentals (P/E, EPS, market cap), technicals, and outlook
- Summarize market trends and explain what's driving market movements
- Compare stocks or ETFs for investment decisions
- Explain financial concepts (valuation metrics, sector rotation, economic indicators)
- Provide context on market events and their potential impact
- Discuss investment strategies (value, growth, dividend, index investing)

GUIDELINES:
- Be thorough but accessible — explain jargon when you use it
- Reference specific data points (P/E ratios, market cap, volume) when analyzing stocks
- Present balanced views — discuss both bull and bear cases
- Cite relevant market context (sector trends, economic conditions)
- When using the searchFinancialInfo tool or referencing data, you MUST explicitly cite your sources in the text using bracketed format, e.g., '[Source: Morningstar]'.
- If searchFinancialInfo reports a source is blocked by settings, explain to the user that the source is currently disabled in their AI Settings page.
- Never make specific price predictions or guarantee returns
- Include educational value — help users become better investors
- When discussing stocks the user holds, relate analysis to their portfolio
- Keep responses informative but concise — 200-300 words max

PERSONALITY: Knowledgeable, analytical, educational. Like a senior equity research analyst who enjoys teaching.`
    },
    {
      id: 'customer-support',
      name: 'Customer Support',
      icon: '💬',
      iconBg: 'amber',
      description: 'Answers account questions and guides you through the platform',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      tools: ['getAccountSummary', 'getFAQ', 'navigateToPage', 'selectAccount', 'searchFinancialInfo'],
      systemPrompt: `You are a friendly customer support agent for E*TRADE from Morgan Stanley. Your name is "Support Agent."

CONTEXT: You help users with account-related questions, platform navigation, and general support inquiries. You have access to account information, FAQ data, and searches.

CAPABILITIES:
- Answer questions about account features, settings, and capabilities
- Explain platform features and how to use them
- Help with account management (transfers, documents, settings)
- Provide information about fees, commissions, and account types
- Guide users through common tasks step-by-step
- Answer questions about tax documents, statements, and regulatory matters

GUIDELINES:
- Be warm, friendly, and helpful — you represent the E*TRADE from Morgan Stanley brand
- Provide step-by-step instructions when guiding users through tasks
- If you don't know the answer, suggest contacting support at support@etrade.com or calling 1-800-ETRADE
- Always verify you understand the question before answering
- Use a conversational but professional tone
- When using the searchFinancialInfo tool or referencing data, you MUST explicitly cite your sources in the text using bracketed format, e.g., '[Source: SEC Edgar]'.
- If searchFinancialInfo reports a source is blocked by settings, explain to the user that the source is currently disabled in their AI Settings page.
- Keep responses focused and actionable
- For account-specific questions, reference the user's actual account data
- For complex issues, acknowledge the complexity and provide what help you can
- Do not refuse to answer general financial, market, or corporate queries (such as questions about company executives, CEOs, or stock details). Use the searchFinancialInfo tool or your general knowledge to answer them constructively.

PERSONALITY: Warm, patient, solution-oriented. Like the best customer service rep you've ever talked to.`
    },
    {
      id: 'market-research-super-agent',
      name: 'Market Research Super Agent',
      icon: '🔬',
      iconBg: 'purple',
      description: 'Provides advanced market insights utilizing Morgan Stanley Research',
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      tools: ['getQuote', 'getMarketSummary', 'getPortfolioHoldings', 'navigateToPage', 'searchFinancialInfo'],
      systemPrompt: `You are a financial research analyst for E*TRADE from Morgan Stanley. Your name is "Market Research Super Agent."

CONTEXT: You provide advanced, comprehensive market research, stock analysis, and educational investing content. You have access to real-time quotes, market summary updates, portfolio data, and public/private searches.

SPECIALIZED KNOWLEDGE:
- You utilize and cite Morgan Stanley Research (grounded in the insights from: https://www.morganstanley.com/what-we-do/research?cid=ppc-2076549330:4290014304:77978347393:329840333188&gclsrc=aw.ds&gad_source=1&gad_campaignid=2076549330&gbraid=0AAAAADo3gWF2TTraAVxQz8-veRSL0U33R&gclid=CjwKCAjw857RBhAgEiwAI-1yKHDrUUNRWZZ8FGR57i1o-m7QDd3tp3wIC3m-3YGrH5hvxckqCPhYshoCsVMQAvD_BwE).
- You leverage other premium public financial research data from outlets such as Bloomberg, Yahoo Finance, Reuters, and Morningstar.
- You have expert-level understanding of cryptocurrency (e.g., Bitcoin, Ethereum, spot ETFs) and alternative assets (e.g., commodities like gold, real estate/REITs, private equity).

GUIDELINES:
- Present balanced, analytical bull and bear cases, and explain financial jargon simply.
- Reference specific data points (P/E ratios, market cap, volume, yield, transaction flow) when analyzing assets.
- Cite your sources in the text using bracketed format, e.g., '[Source: Morgan Stanley Research]', '[Source: Bloomberg]', or '[Source: Yahoo Finance]'.
- If a source is blocked by settings, explain to the user that they must enable it in their AI Settings page.
- Never make specific price predictions or guarantee returns.
- Always include: "This is for educational purposes only. All investments carry risk."

PERSONALITY: Highly analytical, authoritative, knowledgeable, yet accessible. Think of a chief investment officer or a senior market strategist.`
    },
    {
      id: 'mortgage-agent',
      name: 'Mortgage Agent',
      icon: '🏠',
      iconBg: 'blue',
      description: 'Guides you through mortgage rates, home buying/selling decisions, and application pathways',
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      tools: ['getAccountSummary', 'navigateToPage', 'searchFinancialInfo'],
      systemPrompt: `You are a Mortgage Specialist Agent for E*TRADE from Morgan Stanley. Your name is "Mortgage Agent."

CONTEXT: You help customers understand the home buying, home selling, and mortgage financing process. You can access account summaries and perform financial searches to check on market rates or general home buying FAQs.

MORTGAGE OFFERINGS & PATHWAYS:
- Morgan Stanley offers Jumbo and standard home mortgages directly for amounts over $500,000.
- For mortgage amounts under $500,000 (or under $500.00), Morgan Stanley partners with Rocket Mortgage to service the client.
- Customers can apply/inquire by calling their Financial Advisor (FA) or opening a mortgage account directly online through Morgan Stanley.

REQUIRED INFORMATION TO COLLECT:
In every mortgage conversation, you must dynamically and politely find out the following details from the customer if they haven't already provided them:
1. The location where they want to buy or sell (city/state).
2. Their target timeline (e.g., immediately, in 3 months, next year).
3. If they would also like information about obtaining a Home Equity Line of Credit (HELOC).

GUIDELINES:
- Offer clear, step-by-step guidance on the mortgage process (pre-approval, application, underwriting, closing).
- Provide general context on current mortgage rate trends and help the user decide if now is a good time to buy or sell (e.g., considering interest rates, inventory, and their personal financial health).
- Be polite, professional, and structured. Use bullet points for options and clear spacing.
- Always include: "This is for educational purposes only. Morgan Stanley Smith Barney LLC is not a mortgage lender. Mortgages are offered by Morgan Stanley Private Bank, National Association, or its partners."

PERSONALITY: Friendly, helpful, finance-expert, and mortgage-focused.`
    }
  ];

  // ── Tool Implementations ──
  const toolImplementations = {
    getPortfolioHoldings() {
      const holdings = BrokerageData.holdings;
      let result = 'PORTFOLIO HOLDINGS:\n';
      result += '─'.repeat(60) + '\n';
      holdings.forEach(h => {
        result += `${h.symbol} (${h.name}): ${h.shares} shares @ $${h.currentPrice.toFixed(2)} = ${BrokerageData.formatCurrency(h.marketValue)} | Day: ${BrokerageData.formatPercent(h.dayChangePct)} | Total Return: ${BrokerageData.formatPercent(h.totalReturnPct)} | Weight: ${h.weight.toFixed(1)}%\n`;
      });
      return result;
    },

    getAccountSummary() {
      const summary = BrokerageData.getPortfolioSummary();
      let result = 'ACCOUNT SUMMARY:\n';
      result += `Total Value: ${BrokerageData.formatCurrency(summary.totalValue)}\n`;
      result += `Day Change: ${BrokerageData.formatChange(summary.dayChange)} (${BrokerageData.formatPercent(summary.dayChangePercent)})\n`;
      result += `Total Return: ${BrokerageData.formatChange(summary.totalReturn)} (${BrokerageData.formatPercent(summary.totalReturnPercent)})\n`;
      result += `Cash Balance: ${BrokerageData.formatCurrency(summary.cashBalance)}\n`;
      result += `Number of Holdings: ${summary.holdingsCount}\n\n`;
      result += 'TOP 5 HOLDINGS:\n';
      summary.topHoldings.forEach(h => {
        result += `  ${h.symbol}: ${BrokerageData.formatCurrency(h.value)} (${h.weight.toFixed(1)}% of portfolio, ${BrokerageData.formatPercent(h.return)} return)\n`;
      });
      return result;
    },

    getQuote(symbol) {
      const s = (symbol || '').toUpperCase().trim();
      const quote = BrokerageData.getQuote(s);
      if (!quote) return `No quote data found for symbol: ${s}`;
      let result = `QUOTE: ${quote.symbol} (${quote.name})\n`;
      result += `Price: $${quote.price.toFixed(2)} | Change: ${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%)\n`;
      result += `Open: $${quote.open.toFixed(2)} | High: $${quote.high.toFixed(2)} | Low: $${quote.low.toFixed(2)}\n`;
      result += `Volume: ${BrokerageData.formatVolume(quote.volume)} | Avg Volume: ${BrokerageData.formatVolume(quote.avgVolume)}\n`;
      result += `Market Cap: ${quote.marketCap} | P/E: ${quote.pe} | EPS: $${quote.eps}\n`;
      result += `52W High: $${quote.week52High} | 52W Low: $${quote.week52Low}\n`;
      result += `Dividend Yield: ${quote.dividend}\n`;
      return result;
    },

    getSectorAllocation() {
      const sectors = BrokerageData.sectorAllocation;
      let result = 'SECTOR ALLOCATION:\n';
      Object.entries(sectors)
        .sort((a, b) => b[1].weight - a[1].weight)
        .forEach(([sector, data]) => {
          result += `  ${sector}: ${data.weight.toFixed(1)}% (${BrokerageData.formatCurrency(data.value)})\n`;
        });
      return result;
    },

    getMarketSummary() {
      // Calculate current NYSE market status based on Eastern Time
      // NYSE trading hours: Monday-Friday 9:30 AM to 4:00 PM ET (excluding holidays)
      const now = new Date();
      const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
      const nyDate = new Date(nyTimeStr);
      
      const day = nyDate.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = nyDate.getHours();
      const min = nyDate.getMinutes();
      const month = nyDate.getMonth() + 1; // 1-indexed
      const date = nyDate.getDate();
      
      // Major fixed holidays
      const fixedHolidays = [
        "1-1",   // New Year's Day
        "6-19",  // Juneteenth
        "7-4",   // Independence Day
        "12-25", // Christmas Day
      ];
      
      let isHoliday = fixedHolidays.includes(`${month}-${date}`);
      
      // Memorial Day (last Monday in May)
      if (month === 5 && day === 1 && date > 24) isHoliday = true;
      // Labor Day (first Monday in September)
      if (month === 9 && day === 1 && date <= 7) isHoliday = true;
      // Thanksgiving (fourth Thursday in November)
      if (month === 11 && day === 4 && date >= 22 && date <= 28) isHoliday = true;

      let isMarketOpen = false;
      let statusDetail = "";
      
      if (day === 0 || day === 6) {
        isMarketOpen = false;
        statusDetail = "Closed (Weekend)";
      } else if (isHoliday) {
        isMarketOpen = false;
        statusDetail = "Closed (Holiday)";
      } else {
        const timeInMins = hour * 60 + min;
        const openTimeInMins = 9 * 60 + 30; // 9:30 AM
        const closeTimeInMins = 16 * 60;    // 4:00 PM
        
        if (timeInMins >= openTimeInMins && timeInMins < closeTimeInMins) {
          isMarketOpen = true;
          statusDetail = "Open (Regular Trading Hours: 9:30 AM - 4:00 PM ET)";
        } else if (timeInMins >= 4 * 60 && timeInMins < openTimeInMins) {
          isMarketOpen = false;
          statusDetail = "Closed (Pre-market hours run 4:00 AM - 9:30 AM ET)";
        } else if (timeInMins >= closeTimeInMins && timeInMins < 20 * 60) {
          isMarketOpen = false;
          statusDetail = "Closed (After-hours trading runs 4:00 PM - 8:00 PM ET)";
        } else {
          isMarketOpen = false;
          statusDetail = "Closed (Out of Market Hours)";
        }
      }

      let result = 'MARKET SUMMARY:\n';
      result += `NYSE/NASDAQ Status: ${statusDetail}\n`;
      result += `Current Eastern Time: ${nyDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}\n`;
      result += '─'.repeat(40) + '\n';
      BrokerageData.marketIndices.forEach(idx => {
        result += `  ${idx.name} (${idx.symbol}): ${typeof idx.value === 'number' && idx.value > 100 ? idx.value.toLocaleString() : idx.value} | ${idx.change >= 0 ? '+' : ''}${idx.changePct.toFixed(2)}%\n`;
      });
      return result;
    },

    getFAQ() {
      let result = 'FREQUENTLY ASKED QUESTIONS:\n\n';
      BrokerageData.faq.forEach((item, i) => {
        result += `Q${i + 1}: ${item.q}\nA: ${item.a}\n\n`;
      });
      return result;
    },

    getPageContext() {
      const path = window.location.pathname;
      const pageDescriptions = {
        '/': 'The Complete View dashboard — showing total assets, all account cards (brokerage, custodial, checking, stock plan), Morgan Stanley accounts, watch list snapshot, alerts, and launch pad.',
        '/accounts': 'The Complete View dashboard — showing total assets, all account cards (brokerage, custodial, checking, stock plan), Morgan Stanley accounts, watch list snapshot, alerts, and launch pad.',
        '/accounts/portfolios': 'The Portfolios page — showing asset allocation (equities vs cash), portfolio performance, unrealized gains, holdings tables, and a donut chart of asset class allocation. User can switch between Asset Class and Sector views.',
        '/accounts/watch-lists': 'The Watch Lists page — showing tracked symbols with prices, changes, and volume.',
        '/accounts/orders': 'The Orders page — showing open and recent order history.',
        '/accounts/balances': 'The Balances page — showing cash balances, margin details, and buying power across accounts.',
        '/accounts/activity': 'The Activity page — showing recent transactions and account activity.',
        '/pay-transfer': 'The Pay & Transfer page — showing money movement options between accounts.',
        '/trading': 'The Trading page — where users can place stock trades.',
        '/markets-ideas': 'The Markets & Ideas page — market research and investment ideas.',
        '/agent-studio': 'The GEAP Agent Studio — where AI agents are configured, tested, and managed. Shows the agent flow diagram, system prompts, model settings, and a test console.',
        '/agent-fabric': 'The GEAP Agent Fabric — a monitoring dashboard showing agent fleet metrics, live activity log, routing map, and governance/safety toggles.',
        '/alerts': 'The Alerts page — showing account and symbol alerts.',
        '/profile': 'The Profile page — user settings and account information.',
      };

      const pageDesc = pageDescriptions[path] || `A page at ${path}.`;

      // Build visible account context from the E*TRADE mock data
      let accountContext = '';
      if (typeof mockData !== 'undefined') {
        accountContext += `\n\nVISIBLE ACCOUNT DATA ON SCREEN:\n`;
        accountContext += `User: ${mockData.user.firstName} (Last login: ${mockData.user.lastLogin})\n`;
        accountContext += `Total Assets: ${mockData.totals.totalAssets} | Day's Gain: ${mockData.totals.dayGain}\n\n`;
        accountContext += `ACCOUNTS VISIBLE:\n`;
        mockData.accounts.forEach(a => {
          accountContext += `• ${a.label} (${a.type}, ${a.masked}): Net Value ${a.netValue}`;
          if (a.dayGain) accountContext += ` | Day's Gain: ${a.dayGain}`;
          accountContext += `\n`;
        });
      }

      return `PAGE CONTEXT:\nThe user is currently viewing: ${pageDesc}\nURL: ${path}${accountContext}`;
    },

    navigateToPage(path) {
      const p = (path || '').trim();
      if (!p) return 'Failed: Path argument is required.';
      if (typeof routeTo === 'function') {
        routeTo(p);
        return `SUCCESS: Navigated platform UI to path "${p}".`;
      }
      return `Failed: routeTo function not found in scope.`;
    },

    selectAccount(accountId) {
      const id = (accountId || '').trim();
      if (!id) return 'Failed: AccountId argument is required.';
      const exists = mockData.accounts.some(a => a.id.toLowerCase() === id.toLowerCase() || a.id === id);
      if (!exists && !id.startsWith("etrade_")) {
        return `Failed: Invalid accountId "${id}".`;
      }
      const foundAccount = mockData.accounts.find(a => a.id.toLowerCase() === id.toLowerCase() || a.id === id);
      state.selectedAccountId = foundAccount ? foundAccount.id : id;
      if (typeof render === 'function') {
        render();
        return `SUCCESS: Selected account context "${state.selectedAccountId}" and updated the UI.`;
      }
      return `Failed: Selected account to "${state.selectedAccountId}", but render function not found.`;
    },

    setAllocationMode(mode) {
      const m = (mode || '').trim().toLowerCase();
      if (m !== 'asset' && m !== 'sector') {
        return `Failed: Invalid mode "${m}". Must be "asset" or "sector".`;
      }
      state.allocationMode = m;
      if (typeof render === 'function') {
        render();
        return `SUCCESS: Set allocation display mode to "${m}" and updated the UI.`;
      }
      return `Failed: Set allocation mode to "${m}", but render function not found.`;
    },

    searchFinancialInfo(query, source) {
      const aiSettings = (typeof state !== 'undefined' && state.aiSettings) ? state.aiSettings : {
        allowedSources: {
          yahoo: true,
          sec: true,
          bloomberg: true,
          reuters: true,
          morningstar: true,
          private_holdings: true,
          private_transactions: true,
          private_tax: true,
        }
      };

      const allowed = aiSettings.allowedSources;
      if (!query || !query.trim()) {
        return `AVAILABLE SEARCH SOURCES: Yahoo Finance, SEC Edgar, Bloomberg, Reuters, Morningstar. Use the searchFinancialInfo tool to query these sources.`;
      }

      const q = query.toLowerCase().trim();

      // If a specific source was requested, check if it's disabled
      if (source) {
        const srcId = source.toLowerCase().trim();
        if (allowed[srcId] === false) {
          return `Source "${source}" is blocked by your AI source control settings. Please enable it in the AI Settings page.`;
        }
      }

      // Check if query contains mention of a disabled source
      const sourceMap = {
        'yahoo': 'Yahoo Finance',
        'sec': 'SEC Edgar',
        'bloomberg': 'Bloomberg',
        'reuters': 'Reuters',
        'morningstar': 'Morningstar',
        'private_holdings': 'Portfolio Holdings',
        'private_transactions': 'Transaction History',
        'private_tax': 'Tax Records & Statements'
      };

      for (const [srcKey, srcLabel] of Object.entries(sourceMap)) {
        if (q.includes(srcKey.replace('_', ' ')) || q.includes(srcKey) || q.includes(srcLabel.toLowerCase())) {
          if (allowed[srcKey] === false) {
            return `Access Blocked: The source "${srcLabel}" is currently blacklisted in your AI Settings. I cannot retrieve information from it.`;
          }
        }
      }

      return (async () => {
        // ── TIER 1: Private Brokerage/Custodian Data (E*TRADE & Morgan Stanley Live Data) ──
        const isLive = typeof BrokerageData !== 'undefined' && typeof BrokerageData.getLiveMode === 'function' && BrokerageData.getLiveMode();

        if (isLive) {
          // Dynamic live data search
          if (allowed.private_holdings !== false) {
            const holdingsKeywords = ['holdings', 'portfolio', 'shares'];
            if (holdingsKeywords.some(kw => q.includes(kw))) {
              const holdings = BrokerageData.holdings || [];
              const listStr = holdings.map(h => `- ${h.symbol} (${h.name}): ${h.shares} shares @ $${h.currentPrice.toFixed(2)} (Value: $${h.marketValue.toFixed(2)}, Return: ${h.totalReturnPct >= 0 ? '+' : ''}${h.totalReturnPct.toFixed(2)}%)`).join('\n');
              const summary = BrokerageData.getPortfolioSummary ? BrokerageData.getPortfolioSummary() : {};
              const cash = typeof summary.cashBalance !== 'undefined' ? summary.cashBalance : (BrokerageData.account ? BrokerageData.account.cashBalance : 0);
              const totalVal = summary.totalValue || holdings.reduce((sum, h) => sum + h.marketValue, 0);
              return `### Live E*TRADE Portfolio Holdings Summary\nActive live portfolio holds:\n${listStr}\nCash Balance: $${cash.toFixed(2)}. Total Portfolio Value: $${totalVal.toFixed(2)}. [Source: Live E*TRADE Portfolio]`;
            }
          }

          if (allowed.private_transactions !== false) {
            const transactionsKeywords = ['transactions', 'trades', 'history', 'recent'];
            if (transactionsKeywords.some(kw => q.includes(kw))) {
              const txns = BrokerageData.transactions || [];
              const listStr = txns.map(t => `- ${t.date}: ${t.type} ${t.symbol ? t.symbol + ' ' : ''}${t.shares ? t.shares + ' shares ' : ''}${t.price ? '@ $' + t.price.toFixed(2) + ' ' : ''}(Total: $${t.total.toFixed(2)}, Status: ${t.status})`).join('\n');
              return `### Live E*TRADE Transaction History\nRecent transaction history:\n${listStr}\n[Source: Live E*TRADE Transactions]`;
            }
          }
        } else {
          // Disconnected warning - no mock fallback
          const holdsMatch = allowed.private_holdings !== false && ['holdings', 'portfolio', 'shares'].some(kw => q.includes(kw));
          const txnsMatch = allowed.private_transactions !== false && ['transactions', 'trades', 'history', 'recent'].some(kw => q.includes(kw));
          if (holdsMatch || txnsMatch) {
            return `### Live Account Disconnected\nE*TRADE / Morgan Stanley account data is currently disconnected. Please connect your live account to search portfolio holdings or transaction history.`;
          }
        }

        // ── TIER 2: Live Web Search (Google News RSS Proxy for Whitelisted Domains) ──
        const allowedPublicDomains = [];
        if (allowed.yahoo !== false) allowedPublicDomains.push('finance.yahoo.com');
        if (allowed.bloomberg !== false) allowedPublicDomains.push('bloomberg.com');
        if (allowed.reuters !== false) allowedPublicDomains.push('reuters.com');
        if (allowed.morningstar !== false) allowedPublicDomains.push('morningstar.com');

        if (allowedPublicDomains.length > 0) {
          try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&domains=${allowedPublicDomains.join(',')}`);
            if (response.ok) {
              const liveArticles = await response.json();
              if (Array.isArray(liveArticles) && liveArticles.length > 0) {
                return liveArticles.map(art => `### ${art.title}\n${art.content}`).join('\n\n');
              }
            }
          } catch (err) {
            // Network failure or timeout
          }
        }

        return `Search query "${query}" yielded no matching results from your allowed public or private sources. Try another query or check your source whitelist in AI Settings.`;
      })();
    }
  };

  // ── Call a tool ──
  function callTool(toolName, args) {
    const aiSettings = (typeof state !== 'undefined' && state.aiSettings) ? state.aiSettings : {
      accessMode: 'read-write',
      tradeExecutionMode: 'execute'
    };

    if (aiSettings.accessMode === 'read-only') {
      const writeTools = ['navigateToPage', 'selectAccount', 'setAllocationMode'];
      if (writeTools.includes(toolName)) {
        return `Error: Action blocked. The tool "${toolName}" is unavailable because your AI Guardrails are set to Read-Only mode.`;
      }
    }

    const fn = toolImplementations[toolName];
    if (!fn) return `Tool "${toolName}" not found.`;
    try {
      if (args && typeof args === 'object' && Object.keys(args).length > 0) {
        if (toolName === 'getQuote') {
          return fn(args.symbol);
        }
        if (toolName === 'navigateToPage') {
          return fn(args.path);
        }
        if (toolName === 'selectAccount') {
          return fn(args.accountId);
        }
        if (toolName === 'setAllocationMode') {
          return fn(args.mode);
        }
        if (toolName === 'searchFinancialInfo') {
          return fn(args.query, args.source);
        }
        return fn(...Object.values(args));
      }
      return fn();
    } catch (e) {
      return `Error calling tool "${toolName}": ${e.message}`;
    }
  }

  // ── Auto-routing logic ──
  function autoRoute(message, currentPage) {
    const msg = message.toLowerCase();

    // Core keywords for build-in agents
    const coreKeywords = {
      'portfolio-analyst': ['portfolio', 'holdings', 'allocation', 'diversif', 'rebalance', 'position', 'weight', 'concentrated', 'risk exposure', 'sector', 'tax loss', 'tax-loss', 'tax harvesting'],
      'trade-assistant': ['trade', 'buy', 'sell', 'order', 'limit', 'stop', 'market order', 'shares', 'execute', 'place an order', 'open', 'closed', 'hours', 'market status'],
      'market-research': ['research', 'analysis', 'analyze', 'p/e', 'eps', 'valuation', 'fundamentals', 'market cap', 'stock', 'what is', 'tell me about', 'how is', 'price of', 'compare', 'open', 'closed', 'hours', 'market status', 'ceo', 'executive', 'founder', 'who is', 'owner', 'company', 'corporation', 'spacex', 'tesla', 'apple', 'nvidia', 'microsoft', 'google'],
      'customer-support': ['account', 'help', 'transfer', 'fee', 'tax', 'document', 'statement', 'password', 'settings', 'how do i', 'where', 'support', 'navigate'],
      'market-research-super-agent': ['super agent', 'super-agent', 'morgan stanley research', 'alternative assets', 'crypto', 'bitcoin', 'ethereum', 'commodity', 'gold', 'real estate', 'private equity'],
      'mortgage-agent': ['mortgage', 'home loan', 'buy a house', 'sell a house', 'interest rates', 'heloc', 'refinance', 'rocket mortgage', 'home value']
    };

    const scores = {};
    agents.forEach(agent => {
      scores[agent.id] = 0;

      // 1. Core keywords
      const coreKws = coreKeywords[agent.id];
      if (coreKws) {
        scores[agent.id] += coreKws.filter(k => msg.includes(k)).length;
      }

      // 2. Custom keywords from config
      if (agent.keywords && Array.isArray(agent.keywords)) {
        scores[agent.id] += agent.keywords.filter(k => msg.includes(k.toLowerCase())).length;
      }

      // 3. Dynamic keywords derived from name/description
      const dynamicKeywords = [];
      if (agent.name) dynamicKeywords.push(...agent.name.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      if (agent.description) dynamicKeywords.push(...agent.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      if (agent.id) dynamicKeywords.push(...agent.id.toLowerCase().split('-').filter(w => w.length > 3));

      const uniqueDynKws = [...new Set(dynamicKeywords)].filter(w => !['agent', 'help', 'your', 'with', 'about'].includes(w));
      scores[agent.id] += uniqueDynKws.filter(k => msg.includes(k)).length;
    });

    // Page context bias — matches GEAP SPA route view names
    const pageBias = {
      dashboard: 'portfolio-analyst',
      portfolios: 'portfolio-analyst',
      trading: 'trade-assistant',
      'watch-lists': 'portfolio-analyst',
      'balances': 'customer-support',
      'activity': 'customer-support',
      'agent-studio': 'customer-support',
      'agent-fabric': 'customer-support',
    };

    // Add bias for current page
    const biasedAgent = pageBias[currentPage];
    if (biasedAgent && scores[biasedAgent] !== undefined) {
      scores[biasedAgent] += 0.5;
    }

    // Find highest scoring agent
    const best = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a);

    // If no clear winner, use page default
    if (best[1] === 0) return biasedAgent || 'portfolio-analyst';

    return best[0];
  }

  function registerAgent(config) {
    if (!config || !config.id) {
      throw new Error("Invalid agent config. Agent ID is required.");
    }
    const idx = agents.findIndex(a => a.id === config.id);
    if (idx !== -1) {
      agents[idx] = { ...agents[idx], ...config };
    } else {
      agents.push(config);
    }
    return config;
  }

  function deregisterAgent(id) {
    const idx = agents.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = agents.splice(idx, 1);
      return removed[0];
    }
    return null;
  }

  // ── Public API ──
  return {
    getAgent(id) { return agents.find(a => a.id === id) || agents[0]; },
    getAllAgents() { return agents; },
    autoRoute,
    callTool,
    getToolList() { return Object.keys(toolImplementations); },
    registerAgent,
    deregisterAgent,
  };
})();
