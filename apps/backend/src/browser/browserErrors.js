"use strict";

const BROWSER_ERROR_MESSAGES = Object.freeze({
  BROWSER_NOT_CONNECTED: "Microsoft Edge is not connected. Start the dedicated Edge session and try again.",
  BROWSER_CONNECTION_TIMEOUT: "The Microsoft Edge connection timed out. Confirm remote debugging is enabled and try again.",
  BROWSER_CONNECTION_FAILED: "Microsoft Edge could not be connected. Confirm the dedicated Edge session is running.",
  SERVICE_TITAN_PAGE_NOT_FOUND: "No open ServiceTitan page was found. Open ServiceTitan in the dedicated Edge session.",
  SERVICE_TITAN_AUTH_REQUIRED: "ServiceTitan login is required. Sign in manually in the dedicated Edge session.",
  BROWSER_MANAGER_STOPPED: "The browser manager has stopped. Restart the backend before connecting again."
});

class BrowserManagerError extends Error {
  constructor(code, message = BROWSER_ERROR_MESSAGES[code]) {
    super(message || "The browser manager encountered an error.");
    this.name = "BrowserManagerError";
    this.code = code;
  }
}

module.exports = { BROWSER_ERROR_MESSAGES, BrowserManagerError };
