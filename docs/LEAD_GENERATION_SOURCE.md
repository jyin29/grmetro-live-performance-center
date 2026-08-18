# ServiceTitan Lead Generation KPI source

Lead Conversion is not sourced from the individual technician detail page.

Confirmed ServiceTitan request:

- `POST /app/api/reporting/modulardashboard/GetAllScorecard`
- payload: `{ from, to, businessUnitIds, reloadKey, timeZone }`

The response contains technician/employee scorecard rows in `items` / `originalItems`. The Lead Generation section on each row contains:

- `leadGeneration.all.opps`
- `leadGeneration.all.leadsSet`
- `leadGeneration.all.convRate`
- `leadGeneration.all.sold`
- `leadGeneration.all.leadOppJobs`
- `leadGeneration.all.avgSale`

There is also `leadGeneration.replacements` for replacement-only metrics.

For dashboard **Lead Conversion %**, use the direct ServiceTitan value `item.leadGeneration.all.convRate`. Do not derive it from the separate Technicians custom-report datasource. Match each scorecard item to the configured technician by its numeric item `id`.
