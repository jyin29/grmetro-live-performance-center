# Business Rules Engine

## Purpose and boundary

Phase 18 centralizes customer-adjustable thresholds, triggers, priorities, and presentation actions without changing how any KPI is calculated. The engine consumes the normalized, goal-enriched, ranked technician records that already exist inside the dashboard builder. It does not call ServiceTitan and does not read or write snapshots, comparisons, trends, or WebSocket state.

The four parts of every configured rule are:

1. **Business Rule** — a stable `id`, customer-facing `category`, and evaluation `scope`.
2. **Condition** — declarative comparisons against existing prepared fields. `all` and `any` compose comparisons; `source: "previous"` addresses the prior dashboard payload.
3. **Priority** — the existing `critical`, `warning`, `celebration`, or `information` presentation ordering.
4. **Action** — an `event`, `attention`, or declarative dashboard `behavior` outcome.

The initial configuration is `shared/businessRules.js`. It covers existing new-leader, Top 3 entry, and goal-reached triggers; unavailable/fallback KPI alerts; and the existing event-overlay rotation behavior. Durations, cooldown, queue size, and attention-item limit live beside the rules. This CommonJS configuration is deliberately dependency-free and may later be selected per customer without an editor or code changes to the evaluator.

## Evaluation lifecycle

`buildDashboardPayload` evaluates the configured technician and KPI rules after the existing goal, ranking, and overall-score engines finish. It passes current prepared records and the preceding payload's prepared records to the rules engine. The engine returns presentation-neutral action results:

- `event` actions become the existing dashboard `events` entries and retain expiration metadata;
- `attention` actions become the existing `managementInsights` response field;
- `behavior` actions describe presentation policy for existing consumers and do not introduce a new dashboard mode.

The existing bounded event queue remains responsible for overlay ordering, cooldown, and expiration. Presentation synchronization continues to own rotation state. The rule engine does not mutate its input and does not retain state.

## Conditions and safety

Supported operators are `equals`, `notEquals`, `lessThanOrEqual`, `greaterThan`, and `in`. Paths are resolved only against prepared current or previous records. An unknown operator fails fast during evaluation instead of silently changing business behavior. Missing paths simply do not satisfy ordinary comparisons.

KPI-scoped rules evaluate each existing `record.kpis` entry. Technician-scoped rules evaluate the existing prepared technician record. No rule may derive totals, averages, percentages, classifications, ranks, scores, trends, or other business meaning.

## Customization procedure

1. Copy or update a rule in `shared/businessRules.js` with a unique stable ID.
2. Select an existing field path documented by the dashboard payload; do not use a ServiceTitan source-field name.
3. Select a supported operator and explicit comparison value.
4. Select a priority and an existing action type.
5. Add a rules-engine test demonstrating the matching and nonmatching transitions.
6. Run the complete test and build checks before deployment.

Adding arbitrary JavaScript callbacks to configuration is intentionally unsupported. A future file loader must validate configuration before activation and preserve the last valid configuration on failure. A UI editor, database persistence, runtime hot reload, new KPI calculations, and customer tenancy are outside this phase.
