"use strict";

// Keep backend/admin slide metadata in the exact same order as the dashboard
// presentation registry. The admin API indexes this array by activeSlideIndex.
module.exports = [
  { id: "revenue", label: "Revenue", durationSeconds: 15 },
  { id: "sales", label: "Sales", durationSeconds: 15 },
  { id: "technicians", label: "Technicians", durationSeconds: 15 },
  { id: "operations", label: "Operations", durationSeconds: 15 },
  { id: "recognition", label: "Recognition", durationSeconds: 25 },
  { id: "spreadsheet", label: "Spreadsheet", durationSeconds: 15 },
];
