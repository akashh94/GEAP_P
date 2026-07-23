/* ═══════════════════════════════════════════════════════════════
   GEAP POC — Gemini API Integration
   Handles communication with Google Gemini 2.0 Flash via @google/genai SDK.
   Supports streaming responses, function calling, and graceful fallback.
   ═══════════════════════════════════════════════════════════════ */

const GeminiAPI = (() => {

  // ── State ──
  let ai = null;           // GoogleGenAI instance
  let initialized = false; // Whether SDK has been loaded
  let sdkModule = null;    // Cached SDK module reference

  // ── Model Config ──
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const SDK_URL = 'https://esm.run/@google/genai';

  // ── Tool Declarations for Gemini Function Calling ──
  // These tell Gemini what functions it can call
  const toolDeclarations = [
    {
      name: 'getPortfolioHoldings',
      description: 'Get the full list of portfolio holdings with symbol, shares, price, market value, return, and sector for each position.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getAccountSummary',
      description: 'Get a summary of the brokerage account including total value, day change, total return, cash balance, top holdings, and sector breakdown.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getQuote',
      description: 'Get a real-time stock quote for a given ticker symbol, including price, change, volume, market cap, P/E ratio, and 52-week range.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The stock ticker symbol (e.g., AAPL, GOOGL, MSFT)',
          },
        },
        required: ['symbol'],
      },
    },
    {
      name: 'getSectorAllocation',
      description: 'Get the portfolio sector allocation breakdown showing each sector name, weight percentage, and total dollar value.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getMarketSummary',
      description: 'Get current market index values (S&P 500, NASDAQ, etc.) and check if the NYSE/NASDAQ stock exchanges are currently open or closed (trading hours, pre-market, after-hours).',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getFAQ',
      description: 'Get frequently asked questions and answers about the brokerage platform, including trading fees, transfers, margin, tax documents, and order types.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'navigateToPage',
      description: 'Navigate the platform UI to a specific page path (e.g., "/accounts", "/accounts/portfolios", "/trading", "/accounts/watch-lists", "/accounts/activity", "/agent-studio", "/agent-fabric").',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The destination page path to route the user to.'
          }
        },
        required: ['path'],
      },
    },
    {
      name: 'selectAccount',
      description: 'Select a specific account context in the UI (e.g., "main" for Ind Brokerage, "core" for Core Portfolios, "elcie" for Custodial, "checking" for Checking account, "individual" for Brokerage x3379, "stock" for Stock Plan) to update visible data.',
      parameters: {
        type: 'object',
        properties: {
          accountId: {
            type: 'string',
            description: 'The ID of the account to select.'
          }
        },
        required: ['accountId'],
      },
    },
    {
      name: 'setAllocationMode',
      description: 'Switch the allocation display mode on the Portfolios page between "asset" (Asset Class) and "sector" (Sector allocation).',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            description: 'The allocation mode: "asset" or "sector".'
          }
        },
        required: ['mode'],
      },
    },
    {
      name: 'searchFinancialInfo',
      description: 'Search for public or private financial information, research, news, and history. Supports specifying a source or querying general sources.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query (e.g. Apple Q3 earnings, portfolio returns, stock valuation)'
          },
          source: {
            type: 'string',
            description: 'Optional preferred source (e.g. yahoo, sec, bloomberg, reuters, morningstar, private_holdings, private_transactions, private_tax)'
          }
        },
        required: ['query'],
      },
    },
  ];

  // ── Initialize / Load SDK ──
  async function init() {
    const apiKey = App.getApiKey();
    if (!apiKey) {
      console.log('[GeminiAPI] No API key found. AI features will use fallback responses.');
      ai = null;
      initialized = false;
      return false;
    }

    try {
      // Dynamically import the ESM module (only once)
      if (!sdkModule) {
        sdkModule = await import(SDK_URL);
      }

      const { GoogleGenAI } = sdkModule;
      ai = new GoogleGenAI({ apiKey });
      initialized = true;
      console.log('[GeminiAPI] Initialized successfully with Gemini 2.0 Flash.');
      return true;
    } catch (error) {
      console.error('[GeminiAPI] Failed to initialize:', error);
      ai = null;
      initialized = false;
      return false;
    }
  }

  // ── Execute a Tool Call Against Mock Data ──
  async function executeTool(toolName, args) {
    return await AgentManager.callTool(toolName, args);
  }

  // ── Send Message (Streaming) ──
  // messages: [{role: 'user'|'model', parts: [{text: '...'}]}]
  // systemPrompt: string
  // tools: optional tool declarations override
  // onChunk: callback(textChunk) for streaming
  // Returns: full response text
  async function sendMessage(messages, systemPrompt, tools, onChunk) {
    const apiKey = App.getApiKey();

    // ── Fallback when no API key ──
    if (!apiKey || !ai) {
      // Try to initialize if key now exists
      if (apiKey && !ai) {
        const success = await init();
        if (!success) {
          return getFallbackResponse();
        }
      } else {
        return getFallbackResponse();
      }
    }

    try {
      // Build the config with system instruction and tools
      const config = {
        systemInstruction: systemPrompt || 'You are a helpful AI assistant for a brokerage platform.',
      };

      // Attach tool declarations if provided or use defaults
      const activeTools = tools || toolDeclarations;
      if (activeTools && activeTools.length > 0) {
        config.tools = [{
          functionDeclarations: activeTools,
        }];
      }

      // ── Make the streaming request ──
      const response = await ai.models.generateContentStream({
        model: DEFAULT_MODEL,
        contents: messages,
        config,
      });

      let fullText = '';
      let functionCalls = [];

      // Process the stream
      for await (const chunk of response) {
        // Check for function calls in the response
        if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.functionCall) {
              functionCalls.push(part.functionCall);
            }
          }
        }

        // Get text content from the chunk
        const chunkText = chunk.text ? chunk.text : '';
        if (chunkText) {
          fullText += chunkText;
          if (onChunk) {
            onChunk(chunkText);
          }
        }
      }

      // ── Handle Function Calls ──
      if (functionCalls.length > 0) {
        return await handleFunctionCalls(messages, systemPrompt, config, functionCalls, onChunk, fullText);
      }

      return fullText || 'I processed your request but didn\'t generate a text response. Could you rephrase your question?';

    } catch (error) {
      console.error('[GeminiAPI] Error sending message:', error);
      return getErrorResponse(error);
    }
  }

  // ── Handle Gemini Function Calls ──
  // When Gemini wants to call a function, execute it and send results back
  async function handleFunctionCalls(originalMessages, systemPrompt, config, functionCalls, onChunk, initialText = '') {
    try {
      // Execute each function call and collect results
      const functionResponses = [];

      for (const fc of functionCalls) {
        const result = await executeTool(fc.name, fc.args || {});
        functionResponses.push({
          name: fc.name,
          response: { result },
        });
      }

      // Build the conversation with function call + response
      const updatedMessages = [
        ...originalMessages,
        {
          role: 'model',
          parts: functionCalls.map(fc => ({
            functionCall: { name: fc.name, args: fc.args || {} },
          })),
        },
        {
          role: 'user',
          parts: functionResponses.map(fr => ({
            functionResponse: fr,
          })),
        },
      ];

      // Make a follow-up streaming request with the function results
      const followUpResponse = await ai.models.generateContentStream({
        model: DEFAULT_MODEL,
        contents: updatedMessages,
        config,
      });

      let fullText = '';
      let nextFunctionCalls = [];

      for await (const chunk of followUpResponse) {
        // Check for function calls in the follow-up response
        if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.functionCall) {
              nextFunctionCalls.push(part.functionCall);
            }
          }
        }

        const chunkText = chunk.text ? chunk.text : '';
        if (chunkText) {
          fullText += chunkText;
          if (onChunk) {
            onChunk(chunkText);
          }
        }
      }

      // If Gemini returned further function calls, resolve them recursively
      if (nextFunctionCalls.length > 0) {
        return await handleFunctionCalls(updatedMessages, systemPrompt, config, nextFunctionCalls, onChunk, initialText + fullText);
      }

      return (initialText + fullText) || 'I processed the tools but didn\'t generate a text response. Could you rephrase your question?';

    } catch (error) {
      console.error('[GeminiAPI] Error handling function calls:', error);
      return getErrorResponse(error);
    }
  }

  // ── Non-Streaming Send (simpler, for one-off requests) ──
  async function sendMessageSimple(prompt, systemPrompt) {
    const apiKey = App.getApiKey();
    if (!apiKey || !ai) {
      return getFallbackResponse();
    }

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt || 'You are a helpful AI assistant.',
        },
      });
      return response.text || 'No response generated.';
    } catch (error) {
      console.error('[GeminiAPI] Simple send error:', error);
      return getErrorResponse(error);
    }
  }

  // ── Fallback Response (no API key) ──
  function getFallbackResponse() {
    return '🔑 **AI features require a Gemini API key.**\n\n' +
      'To enable the AI Assistant:\n' +
      '1. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey)\n' +
      '2. Click the **✨ AI Assistant** button in the top bar\n' +
      '3. Enter your API key and click **Save & Connect**\n\n' +
      'Once connected, I can analyze your portfolio, help with trades, research stocks, and answer questions about your account.';
  }

  // ── Error Response ──
  function getErrorResponse(error) {
    const message = error?.message || 'Unknown error';

    if (message.includes('API_KEY_INVALID') || message.includes('401')) {
      return '❌ **Invalid API Key**\n\nYour Gemini API key appears to be invalid. Please check your key and try again.\n\nClick the **✨ AI Assistant** button to update your API key.';
    }

    if (message.includes('QUOTA') || message.includes('429')) {
      return '⏳ **Rate Limit Reached**\n\nYou\'ve hit the API rate limit. Please wait a moment and try again. The free tier allows 15 requests per minute.';
    }

    if (message.includes('SAFETY') || message.includes('blocked')) {
      return '⚠️ **Response Filtered**\n\nThe response was filtered by safety settings. Please rephrase your question.';
    }

    return '⚠️ **Something went wrong**\n\nI encountered an error processing your request. Please try again.\n\n`Error: ' + message + '`';
  }

  // ── Check if API is Ready ──
  function isReady() {
    return initialized && ai !== null;
  }

  // ── Public API ──
  return {
    init,
    sendMessage,
    sendMessageSimple,
    isReady,
    toolDeclarations,
  };
})();
