"use strict";

module.exports = {
  TV_MODES: Object.freeze({ LIVE: "live", REMOTE: "remote", RETURNING: "returning" }),
  WS_EVENTS: Object.freeze({
    DASHBOARD_UPDATE: "dashboard:update",
    TV_UPDATE: "tv:update",
    CONNECTION_STATUS: "connection:status"
  }),
  DEFAULT_SLIDE_ID: "revenue",
  CLIENT_TYPES: Object.freeze({ DASHBOARD: "dashboard", REMOTE: "remote" })
};
