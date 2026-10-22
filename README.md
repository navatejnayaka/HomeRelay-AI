# HomeRelay AI

**Household, in sync.** HomeRelay AI turns everyday household requests into reviewable action plans and tracks follow-through in a shared **Promise Ledger**.

- **Live app:** https://navatejnayaka.github.io/HomeRelay-AI/
- **MCP console:** https://navatejnayaka.github.io/HomeRelay-AI/mcp-console.html
- **Source code:** https://github.com/navatejnayaka/HomeRelay-AI

## What it does

- **Request-to-plan flow:** Turn a household request into proposed tasks, inspect the plan, and explicitly approve it before it is committed.
- **Promise Ledger:** Track each commitment's owner, due time, category, and status; completion requires confirmation.
- **Shopping list:** Keep items to pick up and identify which items came from an approved plan.
- **Routine simulations:** Run household routines and inspect their simulated steps without controlling physical devices.
- **Preferences:** Configure a household name, default owner, quiet hours, and a lighting preference.
- **MCP tool server:** A self-hosted Model Context Protocol server over Streamable HTTP (2025-11-25) exposes HomeRelay actions to compatible MCP clients.

## MCP integration

The repository now contains a real MCP server implementation and a browser console that performs MCP initialization, discovers tools, and calls them over Streamable HTTP.

Available tools:
- `get_home_overview`
- `draft_household_plan`
- `approve_household_plan`
- `list_commitments`
- `confirm_commitment`
- `get_shopping_list`
- `simulate_routine`

**Important boundaries:** The MCP server has its own in-memory demo state; it is not synchronized with the GitHub Pages browser's local-storage workspace. Restarting the MCP service can reset that state. The request planner is rule-based demo logic, not a live LLM. This repository does **not** authenticate to an Alexa+ account, call Alexa+ services, send external reminders, buy items, or control physical smart-home devices. The MCP endpoint is suitable for demonstrating a self-hosted tool integration, not for production household data.

### Deploy the MCP server on Render

The included `render.yaml` is a Blueprint for the backend.

1. Sign in to Render and choose **New → Blueprint**.
2. Connect the `navatejnayaka/HomeRelay-AI` GitHub repository and deploy the Blueprint from `render.yaml`.
3. Wait for the service to become healthy. Copy the generated service URL.
4. Open `https://navatejnayaka.github.io/HomeRelay-AI/mcp-console.html`.
5. Paste the service URL followed by `/mcp` into the endpoint field, then choose **Connect & discover tools**.
6. Draft the guest-arrival example, inspect the returned actions, and click **Approve reviewed plan** only after reviewing it. Try the overview, ledger, shopping-list, or routine tools to show actual MCP calls.

Health check: `https://YOUR-RENDER-SERVICE.onrender.com/health`  
MCP endpoint: `https://YOUR-RENDER-SERVICE.onrender.com/mcp`

Replace `YOUR-RENDER-SERVICE` with the actual hostname Render assigns. Free-tier services can sleep when idle, so the first request may take time to wake.

### Run locally

Requirements: Node.js 20 or newer.

For the existing web UI, in one terminal:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For the MCP service, in another terminal:

```bash
npm run start:mcp
```

The MCP server listens on port `10000` by default. Open the MCP console on the deployed GitHub Pages website or serve `mcp-console.html` locally, then connect to `http://localhost:10000/mcp`. The default CORS allow-list includes the published GitHub Pages origin and localhost.

### MCP protocol implementation

The server uses the official `@modelcontextprotocol/sdk` package with Streamable HTTP and protocol version `2025-11-25`. The browser console acts as a basic MCP client: `initialize` → `notifications/initialized` → `tools/list` → `tools/call`. It is included to make the protocol interaction inspectable during a demo. For a public production deployment, add authentication, durable storage, rate limiting, and stronger origin/host protections before exposing real household data or consequential actions.

## Project files

- `index.html`, `styles.css`, `app.js` — existing HomeRelay browser interface
- `mcp-console.html` — browser-based MCP client console
- `mcp-tools.js` — MCP tool definitions and demo state
- `mcp-server.mjs` — Streamable HTTP MCP endpoint
- `render.yaml` — Render deployment blueprint
- `server.js` — local static web server
- `package.json` — scripts and dependencies
- `LICENSE` — MIT license

## License

This project is provided under the MIT License. See [LICENSE](LICENSE) for details.
