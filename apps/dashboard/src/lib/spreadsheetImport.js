const MAX_COLUMNS = 20;
const MAX_ROWS = 5000;

export function parseDelimited(text, delimiter) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}

function idFor(label, index) { return `${String(label || `column-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `column-${index + 1}`}-${index}`; }
function numeric(value) { const cleaned = String(value ?? "").replace(/[()$,%\s,]/g, ""); const sign = /^\(.*\)$/.test(String(value).trim()) ? -1 : 1; return cleaned !== "" && Number.isFinite(Number(cleaned)) ? Number(cleaned) * sign : null; }
function populated(values) { return values.filter((value) => value !== null && value !== undefined && String(value).trim() !== ""); }
function ratio(values, predicate) { const items = populated(values); return items.length ? items.filter(predicate).length / items.length : 0; }

const METRICS = [
  ["revenue", /revenue|sales|income|billed|booked revenue|total sales/i, "currency"],
  ["averageTicket", /average ticket|avg ticket|ticket average|avg sale/i, "currency"],
  ["closingRate", /closing|close rate|conversion rate|conversion %|close %/i, "percent"],
  ["leadConversionRate", /lead conversion|lead close|lead conversion rate/i, "percent"],
  ["membershipsSold", /membership|club agreement|maintenance agreement/i, "number"],
  ["opportunities", /opportunit/i, "number"],
  ["techLeads", /tech leads?|technician leads?/i, "number"],
  ["marketedLeads", /marketed leads?|marketing leads?/i, "number"],
  ["serviceCalls", /service calls?|billable calls?|calls run|completed calls?/i, "number"],
  ["installs", /installs?|install jobs?|installations?/i, "number"],
  ["hours", /hours?|labor hours?|worked hours?/i, "number"],
  ["date", /date|day|week|month|period/i, "date"],
  ["technician", /technician|tech name|employee|team member|installer|comfort advisor/i, "text"],
];

export function inferColumn(label, values) {
  const name = String(label || "").trim();
  const metric = METRICS.find(([, pattern]) => pattern.test(name));
  let type = metric?.[2];
  if (!type) {
    if (ratio(values, (value) => /%\s*$/.test(String(value))) >= .5) type = "percent";
    else if (ratio(values, (value) => /\$|usd|dollars?/i.test(String(value))) >= .4) type = "currency";
    else if (ratio(values, (value) => numeric(value) !== null) >= .8) type = "number";
    else if (ratio(values, (value) => !Number.isNaN(Date.parse(String(value)))) >= .8) type = "date";
    else type = "text";
  }
  return { type, metric: metric?.[0] || null };
}

export function interpretRows(rows, fileName, sheetName = null) {
  if (rows.length < 2) throw new Error("The spreadsheet needs a header row and at least one data row.");
  const width = Math.min(Math.max(...rows.map((row) => row.length)), MAX_COLUMNS);
  const headers = Array.from({ length: width }, (_, index) => rows[0][index] || `Column ${index + 1}`);
  const body = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== "")).slice(0, MAX_ROWS);
  const columns = headers.map((label, index) => ({ id: idFor(label, index), label, ...inferColumn(label, body.map((row) => row[index])) }));
  const dataRows = body.map((source) => Object.fromEntries(columns.map((column, index) => { const raw = source[index] ?? ""; const number = numeric(raw); return [column.id, ["number", "currency", "percent"].includes(column.type) ? number ?? raw : raw]; })));
  const metrics = columns.filter((column) => column.metric).map(({ id, label, metric, type }) => ({ id, label, metric, type }));
  return { enabled: true, title: fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), subtitle: sheetName ? `Excel · ${sheetName}` : "Uploaded spreadsheet", columns, rows: dataRows, metrics, sourceRowCount: rows.length - 1 };
}

export async function readSpreadsheetFile(file) {
  if (/\.xlsx$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("The Excel workbook does not contain a worksheet.");
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "", blankrows: false });
    return interpretRows(rows, file.name, sheetName);
  }
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error("Upload an Excel .xlsx, CSV, or TSV spreadsheet.");
  const text = await file.text(); const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = /\.tsv$/i.test(file.name) ? "\t" : (firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",");
  return interpretRows(parseDelimited(text, delimiter), file.name);
}
