"use strict";

const fs = require("node:fs");
const path = require("node:path");

const KEY_PATTERN = /^notice-[a-f0-9]{8}$/;
function clean(value, maximum = 240) { return String(value ?? "").trim().slice(0, maximum); }

class ManagementDismissalStore {
  constructor({ filePath = path.resolve(process.cwd(), "data/management-dismissals.json"), fsImpl = fs, clock = () => new Date() } = {}) {
    this.filePath = filePath;
    this.fs = fsImpl;
    this.clock = clock;
    this.dismissed = new Map();
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(this.fs.readFileSync(this.filePath, "utf8"));
      for (const item of Array.isArray(parsed?.dismissed) ? parsed.dismissed : []) {
        if (KEY_PATTERN.test(item?.key)) this.dismissed.set(item.key, Object.freeze({
          key: item.key, id: clean(item.id, 100), priority: clean(item.priority, 30), eyebrow: clean(item.eyebrow, 100),
          title: clean(item.title), detail: clean(item.detail, 500), dismissedAt: clean(item.dismissedAt, 50)
        }));
      }
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }

  getPublicState() { return { dismissed: [...this.dismissed.values()].sort((left, right) => right.dismissedAt.localeCompare(left.dismissedAt)) }; }

  persist() {
    this.fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    this.fs.writeFileSync(temporary, `${JSON.stringify({ version: 1, dismissed: this.getPublicState().dismissed }, null, 2)}\n`, { mode: 0o600 });
    this.fs.renameSync(temporary, this.filePath);
  }

  dismiss(key, input = {}) {
    if (!KEY_PATTERN.test(String(key || ""))) throw new TypeError("Invalid management notification key.");
    const item = Object.freeze({ key, id: clean(input.id, 100), priority: clean(input.priority, 30), eyebrow: clean(input.eyebrow, 100),
      title: clean(input.title), detail: clean(input.detail, 500), dismissedAt: this.clock().toISOString() });
    if (!item.title) throw new TypeError("Dismissed management notification requires a title.");
    this.dismissed.set(key, item); this.persist(); return this.getPublicState();
  }

  restore(key) { this.dismissed.delete(String(key)); this.persist(); return this.getPublicState(); }
  clear() { this.dismissed.clear(); this.persist(); return this.getPublicState(); }
}

module.exports = { KEY_PATTERN, ManagementDismissalStore };
