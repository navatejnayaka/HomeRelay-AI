# HomeRelay AI — Hackathon Friction Log

Project: HomeRelay AI  
Track: Alexa+  
Date recorded: October 22, 2026

This log records actual development friction experienced while preparing the submission. The project uses a self-hosted MCP server over Streamable HTTP; it does not connect directly to an Alexa+ account or physical smart-home devices.

## Entry 1 — Testing an Alexa+ MCP experience without access to the gated add-on tools

**Task attempted:** Validate a household-coordination MCP integration against the Alexa+ developer experience.

**Steps taken:**
1. Reviewed the hackathon track requirements and Alexa+ developer resources.
2. Tried to determine how a hackathon participant could test a self-hosted MCP server with the Alexa+ add-on toolkit or web simulator.
3. Checked the hackathon FAQ after being unable to find a participant-accessible route.
4. Built a self-hosted MCP server using Streamable HTTP and a small browser console to initialize the protocol, discover tools, draft a plan, and make a separate approval call.

**Expected result:** A self-service path to test the MCP server against an Alexa+-specific development sandbox or simulator as part of the hackathon.

**Actual result:** The hackathon FAQ states that the Alexa+ add-on developer tools are in preview and limited to select partners, with no participant application path. This prevented direct validation against the Alexa+ add-on environment.

**Severity:** High — it limits direct end-to-end validation against the target Alexa+ experience.

**Workaround used:** Implemented and deployed a self-hosted MCP server over Streamable HTTP, then verified initialization, tool discovery, plan drafting, explicit approval, ledger retrieval, shopping-list retrieval, and routine simulation with an independent browser console. Automated smoke tests passed. This validates the MCP endpoint and its tool behavior, but it does not demonstrate an Alexa+ account/device connection.

**Actionable suggestion:** Offer hackathon participants a clearly documented, self-service Alexa+ MCP sandbox or protocol-validation service, with sample requests and a pass/fail compatibility report, even when the partner-only add-on tools are unavailable.

## Entry 2 — Hosting a public MCP endpoint alongside a static GitHub Pages app

**Task attempted:** Publish the HomeRelay MCP endpoint so judges can access it over HTTPS from a public web console.

**Steps taken:**
1. Hosted the main HomeRelay interface on GitHub Pages.
2. Added an MCP server using the official Model Context Protocol SDK and Streamable HTTP.
3. Discovered that a static GitHub Pages site cannot run the Node.js MCP server.
4. Added a separate backend deployment configuration for Render, an HTTP health endpoint, CORS allow-list settings, and a browser console for connection and tool discovery.
5. Tested the deployed endpoint; the console connected and discovered seven tools. The plan approval call returned success, added four commitments, and returned Snacks and Drinks as added shopping items.

**Expected result:** A straightforward deployment path for a static app and MCP server with minimal configuration.

**Actual result:** The UI and MCP server had to be hosted separately, with extra setup for deployment, the endpoint URL, health checks, and cross-origin browser requests. The MCP server's in-memory demo state is also separate from the browser app's local-storage state.

**Severity:** Medium — additional hosting and configuration steps increased setup time and introduced another deployment surface to test.

**Workaround used:** Added a Render Blueprint, /health endpoint, allowed-origin configuration, deployment documentation, a browser MCP console, and automated smoke tests. The backend's demo state is explicitly disclosed as separate and in-memory.

**Actionable suggestion:** Provide a maintained starter template or deployment guide that pairs a static client with a Streamable HTTP MCP server, includes secure origin defaults and a health check, and offers an automated endpoint conformance test.

## Scope and limitations

The successful tests demonstrate the self-hosted MCP server's protocol and demo tools. They do not imply a direct Alexa+ integration, live LLM-based planning, external notifications, or physical device control.
