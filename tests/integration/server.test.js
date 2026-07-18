const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Capture Express's server instance to close it after testing
const express = require('express');
const listenOriginal = express.application.listen;
let serverInstance;
express.application.listen = function(...args) {
  serverInstance = listenOriginal.apply(this, args);
  return serverInstance;
};

// Configure test port before loading server
const TEST_PORT = 3099;
process.env.PORT = TEST_PORT.toString();

// Load the server (which calls app.listen internally and sets serverInstance)
require('../../server.js');

// Register teardown to close the server after all tests are done
test.after(() => {
  if (serverInstance) {
    serverInstance.close();
  }
});

// Helper function to perform HTTP GET requests
function fetch(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${TEST_PORT}${path}`, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    }).on('error', reject);
  });
}

test('Server - Static File Serving', async (t) => {
  // Test chat.js asset serving
  const jsRes = await fetch('/js/chat.js');
  assert.strictEqual(jsRes.statusCode, 200);
  assert.ok(jsRes.headers['content-type'].includes('javascript'));
  assert.ok(jsRes.body.includes('Chat ='), 'chat.js should contain Chat module declaration');

  // Test styles.css asset serving
  const cssRes = await fetch('/css/styles.css');
  assert.strictEqual(cssRes.statusCode, 200);
  assert.ok(cssRes.headers['content-type'].includes('css'));

  // Test styles.min.css asset serving (generated at startup)
  const minCssRes = await fetch('/css/styles.min.css');
  assert.strictEqual(minCssRes.statusCode, 200);
  assert.ok(minCssRes.headers['content-type'].includes('css'));
});

test('Server - Gzip Text Compression', async (t) => {
  const cssRes = await fetch('/css/styles.css', { 'accept-encoding': 'gzip' });
  assert.strictEqual(cssRes.statusCode, 200);
  assert.strictEqual(cssRes.headers['content-encoding'], 'gzip');

  const jsRes = await fetch('/js/chat.js', { 'accept-encoding': 'gzip' });
  assert.strictEqual(jsRes.statusCode, 200);
  assert.strictEqual(jsRes.headers['content-encoding'], 'gzip');
});

test('Server - SPA Routes redirect to index.html', async (t) => {
  // Root path
  const rootRes = await fetch('/');
  assert.strictEqual(rootRes.statusCode, 200);
  assert.ok(rootRes.body.toLowerCase().includes('<!doctype html>'));
  assert.ok(rootRes.body.includes('id="app"'));

  // Sub-route pay-transfer
  const payRes = await fetch('/pay-transfer');
  assert.strictEqual(payRes.statusCode, 200);
  assert.ok(payRes.body.toLowerCase().includes('<!doctype html>'));

  // Sub-route agent-fabric
  const fabricRes = await fetch('/agent-fabric');
  assert.strictEqual(fabricRes.statusCode, 200);
  assert.ok(fabricRes.body.toLowerCase().includes('<!doctype html>'));

  // Sub-route ai-insights
  const insightsRes = await fetch('/ai-insights');
  assert.strictEqual(insightsRes.statusCode, 200);
  assert.ok(insightsRes.body.toLowerCase().includes('<!doctype html>'));
});

test('Server - 404 Fallback serving index.html with 404 status', async (t) => {
  const badRes = await fetch('/invalid-route-name-xyz');
  assert.strictEqual(badRes.statusCode, 404);
  assert.ok(badRes.body.toLowerCase().includes('<!doctype html>'), 'Should serve index.html even on 404 fallback');
});
