import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createHomeRelayMcpServer } from './mcp-tools.js';

const PORT = Number(process.env.PORT || process.env.MCP_PORT || 10000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://navatejnayaka.github.io,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function addCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Protocol-Version, MCP-Session-Id');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString('utf8');
    if (raw.length > 1_000_000) throw Object.assign(new Error('Request body too large.'), { statusCode: 413 });
  }
  if (!raw) throw Object.assign(new Error('Expected a JSON-RPC request body.'), { statusCode: 400 });
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON request body.'), { statusCode: 400 });
  }
}

const httpServer = http.createServer(async (req, res) => {
  addCors(req, res);
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
      return;
    }
    const payload = JSON.stringify({
      ok: true,
      name: 'HomeRelay AI MCP Server',
      protocol: 'MCP Streamable HTTP',
      protocolVersion: '2025-11-25',
      endpoint: '/mcp',
      note: 'Demo state only. No Alexa+ account, external reminders, or physical devices are connected.'
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : payload);
    return;
  }

  if (url.pathname !== '/mcp') {
    sendJson(res, 404, { ok: false, error: 'Not found. Use /health or /mcp.' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'This stateless Streamable HTTP demo accepts POST requests only.' },
      id: null
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      jsonrpc: '2.0',
      error: { code: -32700, message: error.message || 'Invalid request.' },
      id: null
    });
    return;
  }

  let server;
  let transport;
  try {
    // Stateless Streamable HTTP: one MCP server and transport per request.
    server = createHomeRelayMcpServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    console.error('MCP request failed:', error);
    sendJson(res, 500, {
      jsonrpc: '2.0',
      error: { code: -32603, message: 'HomeRelay MCP request failed.' },
      id: body?.id ?? null
    });
  } finally {
    try { await transport?.close(); } catch {}
    try { await server?.close(); } catch {}
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('HomeRelay AI MCP server listening on port ' + PORT);
  console.log('Health: http://localhost:' + PORT + '/health');
  console.log('MCP endpoint: http://localhost:' + PORT + '/mcp');
});
