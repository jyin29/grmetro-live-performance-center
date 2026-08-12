"use strict";

const { createDashboardSnapshot } = require("./dashboardSnapshot");

class InMemorySnapshotStore {
  constructor({ retentionLimit = 1440 } = {}) {
    if (!Number.isSafeInteger(retentionLimit) || retentionLimit < 1) {
      throw new TypeError("Snapshot retention limit must be a positive integer.");
    }
    this.retentionLimit = retentionLimit;
    this.snapshots = [];
    this.sequence = 0;
  }

  append(payload, capturedAt) {
    this.sequence += 1;
    const snapshot = createDashboardSnapshot(payload, {
      id: `snapshot-${String(this.sequence).padStart(8, "0")}`,
      capturedAt
    });
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.retentionLimit) {
      this.snapshots.splice(0, this.snapshots.length - this.retentionLimit);
    }
    return snapshot;
  }

  latest() { return this.snapshots.at(-1) || null; }
  previous() { return this.snapshots.at(-2) || null; }
  size() { return this.snapshots.length; }
  list() { return Object.freeze([...this.snapshots]); }
}

module.exports = { InMemorySnapshotStore };
