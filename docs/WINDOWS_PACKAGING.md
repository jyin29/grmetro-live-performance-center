# Windows packaging / local application workflow

The first packaging stage turns the repository into a single-machine Windows application experience without changing the ServiceTitan browser integration.

## What it does

- Uses the dedicated Microsoft Edge profile at `C:\edge-dashboard-profile`.
- Starts Edge with CDP remote debugging on port `9223`.
- Builds the Vite dashboard and lets the backend serve the compiled dashboard at `http://127.0.0.1:3000`.
- Starts the Node backend in production mode.
- Waits for the backend health endpoint before opening the dashboard.
- Keeps private company configuration in the ignored root `.env` file.

## First setup

1. Run `scripts\windows\Setup Live Performance Center.cmd`.
2. Open `.env` and fill in at least:
   - `SERVICETITAN_BUSINESS_UNIT_IDS`
   - `SERVICETITAN_TECHNICIANS_JSON`
3. Keep `EDGE_DEBUG_URL=http://127.0.0.1:9223`.
4. Sign into ServiceTitan in the dedicated Edge window and navigate to the Modular Dashboard / technician scorecard page used by the integration.

## Normal startup

Double-click `scripts\windows\Start Live Performance Center.cmd`.

The launcher starts/reuses the dedicated Edge session, starts the application, waits until it is healthy, then opens the dashboard.

## Current packaging boundary

This stage still requires Node.js 22+ to be installed. The next packaging stage can wrap the launcher/runtime into an installer or self-contained executable after this workflow is verified on the real dashboard machine.

Keeping this intermediate stage is intentional: it lets us verify Edge/CDP startup and production static serving before adding an installer layer, reducing the chance of breaking the working ServiceTitan session.
