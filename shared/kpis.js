"use strict";

module.exports = {
  revenue: {
    id: "revenue", label: "Revenue", shortLabel: "Revenue", dataType: "currency",
    format: "currency", unit: "dollars", higherIsBetter: true, supportsGoal: true,
    color: "#D4AF37", sourceNote: "ServiceTitan revenue scorecard field; mapping must be validated before production."
  },
  billableServiceCalls: {
    id: "billableServiceCalls", label: "Billable Service Calls", shortLabel: "Billable Calls", dataType: "count",
    format: "integer", unit: "calls", higherIsBetter: true, supportsGoal: true,
    color: "#2563EB", sourceNote: "Derived from validated job-level service classification; currently unresolved."
  },
  serviceRevenue: {
    id: "serviceRevenue", label: "Service Revenue", shortLabel: "Service Revenue", dataType: "currency",
    format: "currency", unit: "dollars", higherIsBetter: true, supportsGoal: true,
    color: "#0F766E", sourceNote: "Derived from validated job-level service classification; currently unresolved."
  },
  opportunities: {
    id: "opportunities", label: "10+ Opportunities", shortLabel: "Opportunities", dataType: "count",
    format: "integer", unit: "opportunities", higherIsBetter: true, supportsGoal: true,
    color: "#60A5FA", sourceNote: "ServiceTitan opportunity count; exact source mapping must be validated."
  },
  leadConversionRate: {
    id: "leadConversionRate", label: "Lead Conversion %", shortLabel: "Lead Conversion", dataType: "percentage",
    format: "percentage", unit: "percent", higherIsBetter: true, supportsGoal: true,
    color: "#7C3AED", sourceNote: "Business definition and ServiceTitan source mapping are unresolved."
  },
  techLeads: {
    id: "techLeads", label: "Tech Leads", shortLabel: "Tech Leads", dataType: "count",
    format: "integer", unit: "leads", higherIsBetter: true, supportsGoal: true,
    color: "#7C3AED", sourceNote: "ServiceTitan scorecard field; exact source mapping must be validated."
  },
  marketedLeads: {
    id: "marketedLeads", label: "Marketed Leads", shortLabel: "Marketed Leads", dataType: "count",
    format: "integer", unit: "leads", higherIsBetter: true, supportsGoal: true,
    color: "#A78BFA", sourceNote: "ServiceTitan scorecard field; exact source mapping must be validated."
  },
  closingRate: {
    id: "closingRate", label: "Closing %", shortLabel: "Closing", dataType: "percentage",
    format: "percentage", unit: "percent", higherIsBetter: true, supportsGoal: true,
    color: "#16A34A", sourceNote: "ServiceTitan closing-rate field; exact source mapping must be validated."
  },
  installs: {
    id: "installs", label: "Number of Installs", shortLabel: "Installs", dataType: "count",
    format: "integer", unit: "installs", higherIsBetter: true, supportsGoal: true,
    color: "#F59E0B", sourceNote: "Derived from validated completed-install classification; currently unresolved."
  },
  installAverageTicket: {
    id: "installAverageTicket", label: "Install Average Ticket", shortLabel: "Install Avg Ticket", dataType: "currency",
    format: "currency", unit: "dollars", higherIsBetter: true, supportsGoal: true,
    color: "#F59E0B", sourceNote: "Derived from validated install revenue and completed installs; classifications are unresolved."
  },
  installRevenue: {
    id: "installRevenue", label: "Install Revenue", shortLabel: "Install Revenue", dataType: "currency",
    format: "currency", unit: "dollars", higherIsBetter: true, supportsGoal: true,
    color: "#B45309", sourceNote: "Derived from validated completed-install classification; currently unresolved."
  }
};
