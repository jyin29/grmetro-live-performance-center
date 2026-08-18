# ServiceTitan Lead Generation KPI source

Confirmed request: `POST /app/api/reporting/modulardashboard/GetAllScorecard` with `{ from, to, businessUnitIds, reloadKey, timeZone }`.

Technician scorecard rows are read from `items` / `originalItems` and matched by numeric `id`.

Customizable Slide 3 fields sourced from `item.leadGeneration.all`:

- `leadsSet` → Leads Set
- `convRate` → Lead Conversion %
- `avgSale` → Lead Average Sale
- `sold` → Lead Sales

These are company/home overview scorecard values broken out by employee. They are not sourced from the individual technician detail page and should not be derived from the separate Technicians custom-report datasource.
