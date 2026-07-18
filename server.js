const express = require("express");
const path = require("path");
const compression = require("compression");
const fs = require("fs");
const session = require("express-session");
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
require("dotenv").config();

// Redirect console logs to a local file for diagnosis
const logFile = path.join(__dirname, "server.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const formatted = args.map(a => a instanceof Error ? a.stack || a.message : (typeof a === 'object' ? JSON.stringify(a) : a)).join(" ");
  logStream.write(`[LOG] ${new Date().toISOString()} - ${formatted}\n`);
  originalLog.apply(console, args);
};

console.error = (...args) => {
  const formatted = args.map(a => a instanceof Error ? a.stack || a.message : (typeof a === 'object' ? JSON.stringify(a) : a)).join(" ");
  logStream.write(`[ERROR] ${new Date().toISOString()} - ${formatted}\n`);
  originalError.apply(console, args);
};

const app = express();
app.use(compression());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "etrade_poc_local_secret_12345",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

// Log session state on every incoming request
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - sessionID: ${req.sessionID} - sessionKeys: ${Object.keys(req.session || {})}`);
  next();
});

// Disable browser caching for all E*TRADE API and Auth endpoints
app.use(["/api", "/auth"], (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Startup CSS Minification
const cssDir = path.join(__dirname, "public", "css");
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith(".css") && !f.endsWith(".min.css"));
  cssFiles.forEach(file => {
    const fullPath = path.join(cssDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const minified = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([\{\}:;\,])\s*/g, "$1")
        .replace(/;\}/g, "}")
        .trim();
      const minFile = file.replace(/\.css$/, ".min.css");
      fs.writeFileSync(path.join(cssDir, minFile), minified, "utf8");
    } catch (err) {
      console.error(`Error minifying CSS file ${file}:`, err);
    }
  });
}

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

app.disable("x-powered-by");

app.use(
  express.static(publicDir, {
    extensions: ["html"],
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    etag: true
  })
);

const appRoutes = [
  "/",
  "/accounts",
  "/accounts/portfolios",
  "/accounts/watch-lists",
  "/accounts/orders",
  "/accounts/balances",
  "/accounts/activity",
  "/accounts/banking",
  "/accounts/tax-center",
  "/accounts/documents",
  "/accounts/dividend-reinvestment",
  "/accounts/open-account",
  "/pay-transfer",
  "/trading",
  "/markets-ideas",
  "/at-work",
  "/planning",
  "/what-we-offer",
  "/support",
  "/alerts",
  "/documents",
  "/profile",
  "/search",
  "/agent-studio",
  "/agent-fabric",
  "/ai-insights"
];

app.get("/api/search", async (req, res) => {
  const query = req.query.q || "";
  const domainsStr = req.query.domains || "";
  if (!query) {
    return res.json([]);
  }

  try {
    let searchQuery = query;
    if (domainsStr) {
      const domains = domainsStr.split(",").map(d => `site:${d.trim()}`);
      if (domains.length > 0) {
        searchQuery += ` (${domains.join(" OR ")})`;
      }
    }

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google News returned status ${response.status}`);
    }
    const xmlText = await response.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    function decodeHtmlEntities(str) {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    }

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const content = match[1];
      const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";
      const link = linkMatch ? linkMatch[1] : "";
      const pubDate = pubDateMatch ? pubDateMatch[1] : "";
      const source = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : "";

      let normalizedSource = source;
      if (source.toLowerCase().includes("yahoo")) normalizedSource = "Yahoo Finance";
      else if (source.toLowerCase().includes("bloomberg")) normalizedSource = "Bloomberg";
      else if (source.toLowerCase().includes("reuters")) normalizedSource = "Reuters";
      else if (source.toLowerCase().includes("morningstar")) normalizedSource = "Morningstar";

      items.push({
        title,
        content: `Link: ${link}\nPublished: ${pubDate}\n[Source: ${normalizedSource}]`,
        source: source.toLowerCase()
      });
    }

    // Return top 5 live articles
    res.json(items.slice(0, 5));
  } catch (error) {
    console.error("Error fetching live search:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── E*TRADE OAuth Handshake and Proxy Endpoints ──

function getOAuthHelper() {
  return OAuth({
    consumer: {
      key: process.env.ETRADE_CONSUMER_KEY || "",
      secret: process.env.ETRADE_CONSUMER_SECRET || ""
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    }
  });
}

async function queryEtrade(req, urlPath, queryParams = {}) {
  const ETRADE_HOST = process.env.ETRADE_ENV === "production" ? "https://api.etrade.com" : "https://apisb.etrade.com";
  const token = {
    key: req.session.accessToken,
    secret: req.session.accessTokenSecret
  };

  if (!token.key || !token.secret) {
    throw new Error("E*TRADE Session not connected. Please log in.");
  }

  const queryString = Object.keys(queryParams).length > 0
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";

  const request_data = {
    url: `${ETRADE_HOST}${urlPath}${queryString}`,
    method: "GET"
  };

  const oauthHelper = getOAuthHelper();
  const authHeader = oauthHelper.toHeader(oauthHelper.authorize(request_data, token));

  const response = await fetch(request_data.url, {
    method: request_data.method,
    headers: {
      ...authHeader,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`E*TRADE API Error ${response.status}: ${errText}`);
  }

  return await response.json();
}

app.get("/auth/etrade", async (req, res) => {
  console.log("Initiating OAuth login: sessionID =", req.sessionID);
  const ETRADE_HOST = process.env.ETRADE_ENV === "production" ? "https://api.etrade.com" : "https://apisb.etrade.com";
  const key = process.env.ETRADE_CONSUMER_KEY || "";
  const secret = process.env.ETRADE_CONSUMER_SECRET || "";

  if (!key || !secret) {
    return res.status(400).send("E*TRADE Consumer Key and Secret are not configured in your .env file.");
  }

  const request_data = {
    url: `${ETRADE_HOST}/oauth/request_token`,
    method: "POST",
    data: { oauth_callback: "oob" } // Out-Of-Band PIN workflow
  };

  try {
    const oauthHelper = getOAuthHelper();
    const authHeader = oauthHelper.toHeader(oauthHelper.authorize(request_data));
    
    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: { ...authHeader }
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Request Token Error: ${response.status} - ${errText}`);
    }

    const text = await response.text();
    const params = new URLSearchParams(text);
    req.session.requestToken = params.get("oauth_token");
    req.session.requestTokenSecret = params.get("oauth_token_secret");

    const loginUrl = `https://us.etrade.com/e/t/etws/authorize?key=${key}&token=${req.session.requestToken}`;
    res.redirect(loginUrl);
  } catch (err) {
    console.error("OAuth request token error:", err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get("/auth/etrade/callback", async (req, res) => {
  console.log("OAuth callback hit: sessionID =", req.sessionID, "pin =", req.query.pin);
  const ETRADE_HOST = process.env.ETRADE_ENV === "production" ? "https://api.etrade.com" : "https://apisb.etrade.com";
  const verifier = req.query.pin || req.query.oauth_verifier;

  if (!verifier) {
    return res.status(400).send("Missing verification PIN. Please supply 'pin' query parameter.");
  }

  if (!req.session.requestToken || !req.session.requestTokenSecret) {
    return res.status(400).send("Missing request tokens in session. Please start authentication from /auth/etrade.");
  }

  const request_data = {
    url: `${ETRADE_HOST}/oauth/access_token`,
    method: "POST",
    data: { oauth_verifier: verifier }
  };

  const token = {
    key: req.session.requestToken,
    secret: req.session.requestTokenSecret
  };

  try {
    const oauthHelper = getOAuthHelper();
    const authHeader = oauthHelper.toHeader(oauthHelper.authorize(request_data, token));
    
    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: { ...authHeader }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Access Token Error: ${response.status} - ${errText}`);
    }

    const text = await response.text();
    const params = new URLSearchParams(text);
    req.session.accessToken = params.get("oauth_token");
    req.session.accessTokenSecret = params.get("oauth_token_secret");
    req.session.etradeConnected = true;

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Failed to save session during login callback:", saveErr);
      }
      res.send(`
        <script>
          alert("SUCCESS: Connected to E*TRADE Sandbox!");
          if (window.opener) {
            window.opener.location.reload();
            window.close();
          } else {
            window.location.href = "/";
          }
        </script>
      `);
    });
  } catch (err) {
    console.error("OAuth access token error:", err);
    res.status(500).send(`OAuth verification failed: ${err.message}`);
  }
});

app.get("/api/etrade/status", (req, res) => {
  console.log("Status query: connected =", !!req.session.etradeConnected, "sessionID =", req.sessionID);
  res.json({
    connected: !!req.session.etradeConnected,
    env: process.env.ETRADE_ENV || "sandbox"
  });
});

app.get("/api/etrade/disconnect", (req, res) => {
  req.session.accessToken = null;
  req.session.accessTokenSecret = null;
  req.session.etradeConnected = false;
  req.session.save((saveErr) => {
    if (saveErr) {
      console.error("Failed to save session during disconnect:", saveErr);
    }
    res.json({ success: true });
  });
});

app.get("/api/etrade/accounts", async (req, res) => {
  try {
    const data = await queryEtrade(req, "/v1/accounts/list.json");
    res.json(data);
  } catch (err) {
    console.error("Error fetching /api/etrade/accounts:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etrade/portfolio/:accountIdKey", async (req, res) => {
  try {
    const data = await queryEtrade(req, `/v1/accounts/${req.params.accountIdKey}/portfolio.json`);
    res.json(data);
  } catch (err) {
    console.error(`Error fetching portfolio for ${req.params.accountIdKey}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etrade/balances/:accountIdKey", async (req, res) => {
  try {
    const data = await queryEtrade(req, `/v1/accounts/${req.params.accountIdKey}/balance.json`, { instType: "BROKERAGE" });
    res.json(data);
  } catch (err) {
    console.error(`Error fetching balances for ${req.params.accountIdKey}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etrade/transactions/:accountIdKey", async (req, res) => {
  try {
    const data = await queryEtrade(req, `/v1/accounts/${req.params.accountIdKey}/transactions.json`);
    res.json(data);
  } catch (err) {
    console.error(`Error fetching transactions for ${req.params.accountIdKey}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.get(appRoutes, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`GEAP E*TRADE POC running at http://localhost:${port}`);
});
