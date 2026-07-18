"""Function tools available to GEAP agents.

Modules are organised by ownership:

    shared/          — Read-only tools used by multiple agents
      account_tools    get_account_summary, get_portfolio_holdings,
                       get_sector_allocation, get_faq
      market_tools     get_quote, get_market_summary
      search_tools     search_financial_info

    portfolio/       — Portfolio-analyst-only analysis
      analysis_tools   get_concentration_analysis

    trading/         — Trade-assistant-only tools
      order_tools      preview_order_impact
"""
