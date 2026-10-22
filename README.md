# HomeRelay AI

**Household, in sync.** HomeRelay AI is a household-coordination prototype that turns everyday requests into reviewable action plans and tracks follow-through in a shared **Promise Ledger**.

- **Live demo:** https://navatejnayaka.github.io/HomeRelay-AI/
- **Source code:** https://github.com/navatejnayaka/HomeRelay-AI

## What it does

- **Request-to-plan flow:** Enter a household request, review the proposed tasks, and explicitly approve the plan before it is added.
- **Promise Ledger:** Track each commitment's owner, due time, category, and status. Completion requires an explicit confirmation.
- **Shopping list:** Add, check off, and remove items. Approved plans can add relevant shopping items.
- **Routine simulations:** Explore household routines and view a simulation log without controlling physical devices.
- **Preferences:** Configure the household name, default owner, quiet hours, and evening-lighting preference.
- **Local persistence:** The demo stores its workspace in the browser's local storage.

## Important demo limitations

This is a **prototype/simulation**, not a production smart-home assistant. Request interpretation uses local demo logic; no live LLM/API is connected. No Alexa+ service, smart-home devices, calendars, messages, push notifications, or external reminders are connected. Routine steps are simulated, and the app does not purchase items or send notifications.

Workspace data is stored locally in the browser. Data created in one browser profile/device does not automatically synchronize to another device. Clearing site data or using **Reset demo data** can remove saved demo changes.

## Run locally

Requirements: Node.js 18 or newer.

1. Clone or download this repository.
2. Open a terminal in the repository folder.
3. Run:

   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser.

The project uses a small Node.js static server and has no third-party runtime dependencies.

## Project files

- `index.html` — application structure
- `styles.css` — responsive interface styling
- `app.js` — demo interactions and local state
- `server.js` — local static-file server
- `package.json` — project metadata and start command
- `LICENSE` — MIT license

## License

This project is provided under the MIT License. See [LICENSE](LICENSE) for details.
