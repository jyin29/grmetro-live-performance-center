"use strict";

const televisions = require("../../../../shared/televisions");
const kpis = require("../../../../shared/kpis");
const { TV_MODES } = require("../../../../shared/constants");
const { isValidTvId, isValidTechnicianId, isValidKpiId } = require("../../../../shared/validation");

const TECHNICIAN_DETAIL_SLIDE_ID = "technician-detail";
const TECHNICIAN_KPI_DETAIL_SLIDE_ID = "technician-kpi-detail";
const REMOTE_VIEW_TYPES = Object.freeze({
  TECHNICIAN_SCORECARD: "technician-scorecard",
  KPI: "kpi",
  TECHNICIAN_KPI: "technician-kpi"
});
const KPI_PARENT_SLIDES = Object.freeze({
  revenue: "revenue",
  serviceRevenue: "revenue",
  installRevenue: "revenue",
  billableServiceCalls: "activity",
  opportunities: "activity",
  techLeads: "activity",
  marketedLeads: "activity",
  installs: "activity",
  leadConversionRate: "performance",
  closingRate: "performance",
  installAverageTicket: "average-ticket"
});

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
}

function assertExactFields(value, allowed, label) {
  assertPlainObject(value, label);
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unsupported.length) throw new TypeError(`${label} contains unsupported field(s): ${unsupported.join(", ")}.`);
}

function snapshot(state) {
  return Object.freeze({ ...state });
}

class TvManager {
  constructor({
    televisionConfiguration = televisions,
    overrideMilliseconds = 120000,
    returnTransitionMilliseconds = 1000,
    clock = () => new Date(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    onStateChange
  } = {}) {
    if (!Number.isSafeInteger(overrideMilliseconds) || overrideMilliseconds <= 0) throw new TypeError("overrideMilliseconds must be a positive integer.");
    if (!Number.isSafeInteger(returnTransitionMilliseconds) || returnTransitionMilliseconds < 0) throw new TypeError("returnTransitionMilliseconds must be a non-negative integer.");
    if (!Array.isArray(televisionConfiguration)) throw new TypeError("televisionConfiguration must be an array.");
    this.overrideMilliseconds = overrideMilliseconds;
    this.returnTransitionMilliseconds = returnTransitionMilliseconds;
    this.clock = clock;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.listeners = new Set();
    this.returnTimers = new Map();
    this.states = new Map(televisionConfiguration.map(({ id, name }) => {
      if (!isValidTvId(id)) throw new Error(`Invalid television ID: ${id}.`);
      const now = this.#now();
      return [id, {
        id, name, mode: TV_MODES.LIVE, viewType: null,
        selectedTechnicianId: null, selectedKpiId: null, selectedSlideId: null,
        overrideStartedAt: null, expiresAt: null, updatedAt: now, revision: 1
      }];
    }));
    if (onStateChange !== undefined) this.subscribe(onStateChange);
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("State-change listener must be a function.");
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getTelevisions() {
    return Array.from(this.states.values(), snapshot);
  }

  getTelevision(id) {
    return snapshot(this.#requireState(id));
  }

  overrideTechnician(id, command) {
    assertExactFields(command, ["technicianId"], "Technician override");
    if (!isValidTechnicianId(command.technicianId)) throw new Error(`Invalid technician ID: ${command.technicianId}.`);
    return this.#applyOverride(id, {
      mode: TV_MODES.REMOTE,
      viewType: REMOTE_VIEW_TYPES.TECHNICIAN_SCORECARD,
      selectedTechnicianId: Number(command.technicianId),
      selectedKpiId: null,
      selectedSlideId: TECHNICIAN_DETAIL_SLIDE_ID
    });
  }

  overrideKpi(id, command) {
    assertExactFields(command, ["kpiId"], "KPI override");
    if (!isValidKpiId(command.kpiId)) throw new Error(`Invalid KPI ID: ${command.kpiId}.`);
    return this.#applyOverride(id, {
      mode: TV_MODES.REMOTE,
      viewType: REMOTE_VIEW_TYPES.KPI,
      selectedTechnicianId: null,
      selectedKpiId: command.kpiId,
      selectedSlideId: this.resolveParentSlide(command.kpiId)
    });
  }

  overrideTechnicianKpi(id, command) {
    assertExactFields(command, ["technicianId", "kpiId"], "Technician KPI override");
    if (!isValidTechnicianId(command.technicianId)) throw new Error(`Invalid technician ID: ${command.technicianId}.`);
    if (!isValidKpiId(command.kpiId)) throw new Error(`Invalid KPI ID: ${command.kpiId}.`);
    return this.#applyOverride(id, {
      mode: TV_MODES.REMOTE,
      viewType: REMOTE_VIEW_TYPES.TECHNICIAN_KPI,
      selectedTechnicianId: Number(command.technicianId),
      selectedKpiId: command.kpiId,
      selectedSlideId: TECHNICIAN_KPI_DETAIL_SLIDE_ID
    });
  }

  resetOverrideTimer(id, command = {}) {
    assertExactFields(command, [], "Timer reset");
    const state = this.#requireState(id);
    if (state.mode !== TV_MODES.REMOTE) {
      throw new Error(`Television ${id} has no active override.`);
    }
    const now = this.#now();
    return this.#mutate(state, { overrideStartedAt: now, expiresAt: this.#future(now, this.overrideMilliseconds) });
  }

  resumeLive(id, command = {}) {
    assertExactFields(command, [], "Resume command");
    const state = this.#requireState(id);
    this.#cancelReturn(id);
    if (state.mode === TV_MODES.LIVE) return snapshot(state);
    const returning = this.#mutate(state, { mode: TV_MODES.RETURNING, expiresAt: null });
    const revision = returning.revision;
    const timer = this.setTimeoutFn(() => {
      this.returnTimers.delete(id);
      const current = this.states.get(id);
      if (!current || current.mode !== TV_MODES.RETURNING || current.revision !== revision) return;
      this.#mutate(current, {
        mode: TV_MODES.LIVE, viewType: null, selectedTechnicianId: null, selectedKpiId: null,
        selectedSlideId: null, overrideStartedAt: null, expiresAt: null
      });
    }, this.returnTransitionMilliseconds);
    timer?.unref?.();
    this.returnTimers.set(id, timer);
    return returning;
  }

  clearSelections(id, command = {}) {
    assertExactFields(command, [], "Clear selections command");
    const state = this.#requireState(id);
    return this.#mutate(state, {
      viewType: null, selectedTechnicianId: null, selectedKpiId: null, selectedSlideId: null,
      overrideStartedAt: null, expiresAt: null
    });
  }

  expireOverrides() {
    const now = this.clock().getTime();
    const expired = [];
    for (const state of this.states.values()) {
      if (state.expiresAt && new Date(state.expiresAt).getTime() <= now && state.mode === TV_MODES.REMOTE) {
        expired.push(this.resumeLive(state.id));
      }
    }
    return expired;
  }

  resolveParentSlide(kpiId) {
    if (!isValidKpiId(kpiId) || !Object.hasOwn(KPI_PARENT_SLIDES, kpiId) || !kpis[kpiId]) {
      throw new Error(`Invalid KPI ID: ${kpiId}.`);
    }
    return KPI_PARENT_SLIDES[kpiId];
  }

  stop() {
    for (const timer of this.returnTimers.values()) this.clearTimeoutFn(timer);
    this.returnTimers.clear();
  }

  #applyOverride(id, selection) {
    const state = this.#requireState(id);
    this.#cancelReturn(id);
    const now = this.#now();
    return this.#mutate(state, {
      ...selection, overrideStartedAt: now, expiresAt: this.#future(now, this.overrideMilliseconds)
    });
  }

  #requireState(id) {
    if (!isValidTvId(id) || !this.states.has(id)) throw new Error(`Invalid television ID: ${id}.`);
    return this.states.get(id);
  }

  #mutate(state, changes) {
    Object.assign(state, changes, { updatedAt: this.#now(), revision: state.revision + 1 });
    const current = snapshot(state);
    for (const listener of this.listeners) listener(current);
    return current;
  }

  #cancelReturn(id) {
    if (!this.returnTimers.has(id)) return;
    this.clearTimeoutFn(this.returnTimers.get(id));
    this.returnTimers.delete(id);
  }

  #now() {
    const value = this.clock();
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError("clock must return a valid Date.");
    return value.toISOString();
  }

  #future(isoDate, milliseconds) {
    return new Date(new Date(isoDate).getTime() + milliseconds).toISOString();
  }
}

module.exports = {
  TvManager, KPI_PARENT_SLIDES, REMOTE_VIEW_TYPES,
  TECHNICIAN_DETAIL_SLIDE_ID, TECHNICIAN_KPI_DETAIL_SLIDE_ID
};
