import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 18763;
const base = 'http://127.0.0.1:' + port;
const endpoint = base + '/mcp';
const child = spawn(process.execPath, ['mcp-server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), ALLOWED_ORIGINS: 'http://localhost:3000' },
  stdio: 'ignore'
});

let requestId = 0;
let initialized = false;

async function waitForHealth() {
  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('MCP server exited before becoming healthy.');
    try {
      const response = await fetch(base + '/health');
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('MCP server did not become healthy: ' + (lastError?.message || 'timeout'));
}

async function rpc(method, params, notification = false) {
  const body = { jsonrpc: '2.0', method };
  if (!notification) body.id = ++requestId;
  if (params !== undefined) body.params = params;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (initialized && method !== 'initialize') headers['MCP-Protocol-Version'] = '2025-11-25';
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.ok(response.ok, method + ' returned HTTP ' + response.status);
  if (notification || response.status === 202) return null;
  const data = await response.json();
  if (data.error) throw new Error(method + ': ' + data.error.message);
  return data.result;
}

function unpackTool(result) {
  if (result?.structuredContent) return result.structuredContent;
  const textItem = result?.content?.find((item) => item.type === 'text');
  if (!textItem) throw new Error('MCP tool did not return text or structured content.');
  return JSON.parse(textItem.text);
}

try {
  const health = await waitForHealth();
  assert.equal(health.ok, true);
  assert.equal(health.protocolVersion, '2025-11-25');

  const init = await rpc('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'HomeRelay MCP smoke test', version: '1.0.0' }
  });
  assert.equal(init.protocolVersion, '2025-11-25');
  initialized = true;
  await rpc('notifications/initialized', {}, true);

  const discovery = await rpc('tools/list', {});
  const toolNames = new Set(discovery.tools.map((tool) => tool.name));
  for (const expected of [
    'get_home_overview', 'draft_household_plan', 'approve_household_plan',
    'list_commitments', 'confirm_commitment', 'get_shopping_list', 'simulate_routine'
  ]) assert.ok(toolNames.has(expected), 'Missing tool: ' + expected);

  const proposalResult = await rpc('tools/call', {
    name: 'draft_household_plan',
    arguments: { request: 'Guests arrive at 7 PM. Ask Ravi to get snacks, prepare the guest room, and reset the living room.' }
  });
  const proposal = unpackTool(proposalResult);
  assert.equal(proposal.status, 'awaiting_user_approval');
  assert.ok(proposal.planId);
  assert.equal(proposal.actions.length, 4);

  const approvedResult = await rpc('tools/call', {
    name: 'approve_household_plan',
    arguments: { planId: proposal.planId }
  });
  const approved = unpackTool(approvedResult);
  assert.equal(approved.success, true);
  assert.equal(approved.commitmentsAdded, 4);

  const ledger = unpackTool(await rpc('tools/call', { name: 'list_commitments', arguments: { status: 'all' } }));
  assert.ok(ledger.count >= 6);

  const shopping = unpackTool(await rpc('tools/call', { name: 'get_shopping_list', arguments: {} }));
  const itemNames = new Set(shopping.items.map((item) => item.name.toLowerCase()));
  assert.ok(itemNames.has('snacks'));
  assert.ok(itemNames.has('drinks'));

  const routine = unpackTool(await rpc('tools/call', {
    name: 'simulate_routine', arguments: { routine: 'guest' }
  }));
  assert.equal(routine.success, true);
  assert.equal(routine.routine.devicesControlled, false);

  console.log('HomeRelay MCP smoke test passed: initialize, discovery, draft, approval, ledger, shopping, routine simulation.');
} finally {
  child.kill('SIGTERM');
}
