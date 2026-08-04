"use strict";

const TECHNICIAN_DATASOURCE_FIELDS = Object.freeze([
  "CompletedRevenue", "CompletedJobs", "Opportunity", "OpportunityConversionRate", "RecallsCaused", "Nps", "CustomerSatisfaction", "WipJobs", "JobsOnHold", "CanceledJobs", "TotalJobAverage", "AdjustmentRevenue", "CompletedRevenueWithAdjustments", "ConvertedJobs", "UnconvertedJobs", "OpportunityJobAverage", "Upsold", "ReplacementLeadJobs", "ReplacementOpportunity", "ReplacementLeadConversionRate", "ReplacementLeadsSet", "ReplacementLeadsSold", "TechLeadJobs", "TotalLeadSales", "CloseRateFromTgl", "MarketingLeadJobs", "TotalMarketingLeadSales", "CloseRateFromMarketingLeads", "MembershipsSold", "MembershipOpportunities", "MembershipConversionRate", "RevenuePerHour", "JobBillableHours", "BillableEfficiency", "TasksPerOpportunity", "OptionsPerOpportunity", "SalesOpportunity", "ClosedOpportunities", "TotalSales", "CloseRate", "TotalSalesFromTgl", "TotalSalesFromMarketingLeads", "LeadsSet"
]);
const TECHNICIAN_DATASOURCE_FIELD_STRING = TECHNICIAN_DATASOURCE_FIELDS.join(",");
module.exports = { TECHNICIAN_DATASOURCE_FIELDS, TECHNICIAN_DATASOURCE_FIELD_STRING };
